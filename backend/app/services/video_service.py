from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.video import Video, VideoStatus
from app.services.storage_service import StorageService
from app.services.transcoding_service import TranscodingService
from app.utils.logger import get_logger

logger = get_logger(__name__)

class VideoService:
    def __init__(
            self,
        db: AsyncSession,
        storage_service: StorageService
    ) -> None:
        self._db = db
        self._storage = storage_service
        self._transcoder = TranscodingService(storage_service)


    # READ ALL
    async def list_videos(self) -> list[Video]:
        stmt = select(Video).order_by(Video.created_at.desc())
        result = await self._db.execute(stmt)
        videos = result.scalars().all()
        logger.info("Listed %d videos", len(videos))
        return list(videos)


    # READ
    async def get_video(self, video_id: str) -> Video | None:
        stmt = select(Video).where(Video.id == video_id)
        result = await self._db.execute(stmt)
        logger.info(f"Getting video with id {video_id} ")
        return result.scalar_one_or_none()


    # CREATE
    async def create_video(self, title: str, file_data: bytes, filename: str) -> Video:
        video = Video(title = title)
        self._db.add(video)

        await self._db.flush()
        await self._db.commit()
        await self._db.refresh(video)
        logger.info(f"Created video record : id={video.id}, title={video.title}")
        return video

    async def process_video(self, video_id: str, file_data: bytes, filename: str) -> None:
        from app.db.session import AsyncSessionLocal
        
        async with AsyncSessionLocal() as session:
            try:
                stmt = select(Video).where(Video.id == video_id)
                result = await session.execute(stmt)
                video = result.scalar_one_or_none()
                
                if not video:
                    logger.error("Video not found for PROCESSING : %s", video_id)
                    return
                video.status = VideoStatus.PROCESSING.value
                await session.commit()
                logger.info("Video %s status -> PROCESSING", video_id)

                hls_url = await self._transcoder.transcode_to_hls(
                    video_id=video_id,
                    file_data=file_data,
                    filename=filename,
                )
                video.hls_url = hls_url
                video.status = VideoStatus.READY.value
                await session.commit()
                logger.info("Video %s status -> READY, hls_url= %s", video_id, hls_url)

            except Exception as e:
                logger.error("Video processing failed for %s: %s", video_id, e, exc_info = True)
                await session.rollback()
                stmt = select(Video).where(Video.id == video_id)
                result = await session.execute(stmt)
                video = result.scalar_one_or_none()
                if video:
                    video.status = VideoStatus.FAILED.value
                    await session.commit()


    # UPDATE

    async def rename_video(self, video_id: str, new_title: str) -> Video | None:

        video = await self.get_video(video_id)
        if not video:
            return None
        video.title = new_title
        logger.info("Renaming video %s -> %s", video_id, new_title)
        return video


    # DELETE
    async def delete_video(self, video_id: str) -> bool:
        video = await self.get_video(video_id)
        if not video:
            return False

        try:
            self._storage.delete_prefix(f"videos/{video.id}/")
        except Exception as e:
            logger.warning("Failed to delete R2 assests for video %s: %s", video_id, e)

        await self._db.delete(video)
        logger.info("Deleted video: %s", video_id)
        return True
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.services.storage_service import StorageService, get_storage_service
from app.services.video_service import VideoService

async def get_video_service(
        db: AsyncSession = Depends(get_db_session),
        storage: StorageService = Depends(get_storage_service)
    ) -> VideoService:
    return VideoService(db=db, storage_service=storage)
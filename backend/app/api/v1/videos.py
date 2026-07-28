from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, status
from starlette.status import HTTP_201_CREATED

from app.dependencies import get_video_service
from app.schemas.video import VideoRename,VideoResponse
from app.services.video_service import VideoService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/videos",
    tags=["Videos"],
)





@router.post(
    "/upload",
    response_model=VideoResponse,
    status_code=HTTP_201_CREATED,
    summary="Upload a new video",
    description="Accepts a video file and title. Returns immediately with status=PENDING."
                "Transcoding to multi- bitrate HLS happens in the background."
)
async def upload_video(
        background_tasks: BackgroundTasks,
        title: str = Form(..., min_length=1, max_length=255),
        file: UploadFile = ...,
        service: VideoService = Depends(get_video_service)
) -> VideoResponse:

    allowed_types = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The file type is not supported. Only Allowed: {allowed_types}",
        )

    file_data = await file.read()
    logger.info("Received upload: title='%s', filename='%s', size=%d bytes", title, file.filename, len(file_data))
    video = await service.create_video(
        title=title,
        file_data=file_data,
        filename=file.filename,
    )
    background_tasks.add_task(
        service.process_video,
        video_id=video.id,
        file_data=file_data,
        filename=file.filename
    )
    return VideoResponse.model_validate(video)




@router.get(
    "/",
    response_model=list[VideoResponse],
    summary="List all videos",
    description="Returns all video ordered by creation data (newest first).",
)
async def list_videos(
        service: VideoService = Depends(get_video_service),
) -> list[VideoResponse]:
    videos = await service.list_videos()
    return [VideoResponse.model_validate(v) for v in videos]





@router.get(
    "/{video_id}",
    response_model=VideoResponse,
    summary="Get a video by ID",
    description="Returns a specific video by their ID.",
)
async  def get_video(
        video_id: str,
        service: VideoService = Depends(get_video_service)
) -> VideoResponse:
    video = await service.get_video(video_id)
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video with id {video_id} not found",
        )
    return VideoResponse.model_validate(video)





@router.patch(
    "/{video_id}",
    response_model=VideoResponse,
    summary= "Rename a video",
    description="Update the title of an existing video.",
)
async def rename_video(
        video_id: str,
        payload: VideoRename,
        service: VideoService = Depends(get_video_service)
) -> VideoResponse:
    video = await service.rename_video(video_id= video_id, new_title=payload.title)
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video with id {video_id} not found",
        )
    return VideoResponse.model_validate(video)



@router.delete(
    "/{video_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a video",
    description="Delete a video by its ID. Deletes both its record in DB and HLS files in storage R2",
)
async def delete_video(
        video_id: str,
        service: VideoService = Depends(get_video_service)
) -> None:
    deleted = await service.delete_video(video_id=video_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video with id {video_id} not found",
        )


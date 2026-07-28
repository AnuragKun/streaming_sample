from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

class VideoCreate(BaseModel):

    title: str = Field(
        ...,
        min_length=1,
        max_length=255,
        examples=["My Clip"]
    )

class VideoRename(BaseModel):

    title: str = Field(
        ...,
        min_length=1,
        max_length=255,
        examples=["Renamed Clip"]
    )

class VideoResponse(BaseModel):

    id: str
    title: str
    status: str
    hls_url: Optional[str] = None
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def parse_datetime(cls, value):
        if isinstance(value, str) and value.endswith("+00"):
            return value + ":00"
        return value

    model_config = ConfigDict(from_attributes=True)
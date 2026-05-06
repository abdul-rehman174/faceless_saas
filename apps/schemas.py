import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Scene(BaseModel):
    scene_number: int
    image_prompt: str
    narration: str


class ReelScript(BaseModel):
    title: str
    scenes: list[Scene]


class SceneAsset(BaseModel):
    scene_number: int
    image_url: Optional[str] = None
    audio_url: Optional[str] = None


class ReelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    topic: str
    script_data: dict
    video_url: Optional[str] = None
    generated_assets: list = Field(default_factory=list)
    created_at: datetime


class GenerateReelRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=300)


class GenerateImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    reel_id: uuid.UUID
    scene_index: int = Field(..., ge=0)


class GenerateAudioRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    reel_id: uuid.UUID
    scene_index: int = Field(..., ge=0)

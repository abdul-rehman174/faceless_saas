from pydantic import BaseModel
from typing import List

class Scene(BaseModel):
    scene_number: int
    image_prompt: str
    narration: str

class ReelScript(BaseModel):
    title: str
    scenes: List[Scene]
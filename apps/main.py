import os, json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from apps.database import get_db
from apps.ai_logic import generate_reel_script, generate_image_from_prompt, generate_audio, assemble_video

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory="static"), name="static")

class SceneAsset(BaseModel):
    scene_number: int
    image_url: Optional[str] = None
    audio_url: Optional[str] = None

@app.post("/generate-reel")
async def create_reel(topic: str, db: Session = Depends(get_db)):
    script_obj = generate_reel_script(topic)
    sql = text("INSERT INTO reels (topic, script_data) VALUES (:topic, :data) RETURNING id")
    res = db.execute(sql, {"topic": topic, "data": json.dumps(script_obj.model_dump())})
    reel_id = res.fetchone()[0]
    db.commit()
    return {"id": reel_id, "script": script_obj}

@app.get("/reels")
def get_reels(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT id, topic, script_data, video_url, generated_assets FROM reels ORDER BY created_at DESC"))
    return [dict(row._mapping) for row in result]

@app.post("/generate-image")
async def create_image(prompt: str, reel_id: str, scene_index: int):
    url = generate_image_from_prompt(prompt, reel_id, scene_index)
    return {"image_url": url}

@app.post("/generate-audio")
async def create_audio(text_input: str, reel_id: str, scene_index: int):
    url = await generate_audio(text_input, reel_id, scene_index)
    return {"audio_url": url}

@app.post("/update-assets/{reel_id}")
async def update_assets(reel_id: str, assets: List[SceneAsset], db: Session = Depends(get_db)):
    assets_json = json.dumps([a.model_dump() for a in assets])
    db.execute(text("UPDATE reels SET generated_assets = :data WHERE id = :id"), {"data": assets_json, "id": reel_id})
    db.commit()
    return {"status": "saved"}

@app.post("/assemble-video/{reel_id}")
async def build_video(reel_id: str, assets: List[SceneAsset], db: Session = Depends(get_db)):
    final_path = f"static/videos/final_{reel_id}.mp4"
    if os.path.exists(final_path):
        return {"video_url": f"/{final_path}"}

    scenes_list = [a.model_dump() for a in assets]
    video_url = assemble_video(scenes_list, reel_id)
    if video_url:
        db.execute(text("UPDATE reels SET video_url = :url WHERE id = :id"),
                   {"url": video_url, "id": reel_id})
        db.commit()
        return {"video_url": video_url}
    raise HTTPException(status_code=500)
from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.ai_logic import (
    assemble_video,
    generate_audio,
    generate_image_from_prompt,
    generate_reel_script,
)
from apps.config import get_settings
from apps.database import get_db
from apps.logger import get_logger, setup_logging
from apps.models import Reel
from apps.schemas import (
    GenerateAudioRequest,
    GenerateImageRequest,
    GenerateReelRequest,
    ReelOut,
    SceneAsset,
)

setup_logging()
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.static_dir.mkdir(parents=True, exist_ok=True)
    settings.images_dir.mkdir(parents=True, exist_ok=True)
    settings.audio_dir.mkdir(parents=True, exist_ok=True)
    settings.videos_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Application startup complete")
    yield
    logger.info("Application shutdown")


app = FastAPI(title="AI Reel Factory", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(settings.static_dir)), name="static")


def _get_reel_or_404(db: Session, reel_id: uuid.UUID) -> Reel:
    reel = db.get(Reel, reel_id)
    if reel is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Reel not found")
    return reel


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/generate-reel", response_model=ReelOut, status_code=status.HTTP_201_CREATED)
def create_reel(payload: GenerateReelRequest, db: Session = Depends(get_db)) -> Reel:
    try:
        script = generate_reel_script(payload.topic)
    except Exception as exc:
        logger.exception("Script generation failed")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    reel = Reel(topic=payload.topic, script_data=script.model_dump(), generated_assets=[])
    db.add(reel)
    db.commit()
    db.refresh(reel)
    return reel


@app.get("/reels", response_model=list[ReelOut])
def list_reels(db: Session = Depends(get_db)) -> list[Reel]:
    return list(db.scalars(select(Reel).order_by(Reel.created_at.desc())))


@app.get("/reels/{reel_id}", response_model=ReelOut)
def get_reel(reel_id: uuid.UUID, db: Session = Depends(get_db)) -> Reel:
    return _get_reel_or_404(db, reel_id)


@app.post("/generate-image")
def create_image(payload: GenerateImageRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    _get_reel_or_404(db, payload.reel_id)
    try:
        url = generate_image_from_prompt(payload.prompt, payload.reel_id, payload.scene_index)
    except Exception as exc:
        logger.exception("Image generation failed")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return {"image_url": url}


@app.post("/generate-audio")
async def create_audio(payload: GenerateAudioRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    _get_reel_or_404(db, payload.reel_id)
    try:
        url = await generate_audio(payload.text, payload.reel_id, payload.scene_index)
    except Exception as exc:
        logger.exception("Audio generation failed")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return {"audio_url": url}


@app.post("/update-assets/{reel_id}", response_model=ReelOut)
def update_assets(
    reel_id: uuid.UUID,
    assets: list[SceneAsset],
    db: Session = Depends(get_db),
) -> Reel:
    reel = _get_reel_or_404(db, reel_id)
    reel.generated_assets = [a.model_dump() for a in assets]
    db.commit()
    db.refresh(reel)
    return reel


@app.post("/assemble-video/{reel_id}")
def build_video(
    reel_id: uuid.UUID,
    assets: list[SceneAsset],
    db: Session = Depends(get_db),
) -> dict[str, str]:
    reel = _get_reel_or_404(db, reel_id)
    final_path = settings.videos_dir / f"final_{reel_id}.mp4"
    if final_path.exists() and reel.video_url:
        return {"video_url": reel.video_url}

    try:
        video_url = assemble_video([a.model_dump() for a in assets], reel_id)
    except Exception as exc:
        logger.exception("Video assembly failed")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    reel.video_url = video_url
    db.commit()
    return {"video_url": video_url}

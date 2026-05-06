from __future__ import annotations

import uuid
from typing import Iterable

import edge_tts
import requests
from google import genai
from google.genai import types
from moviepy import AudioFileClip, ImageClip, concatenate_videoclips

from apps.config import get_settings
from apps.logger import get_logger
from apps.schemas import ReelScript

logger = get_logger(__name__)
settings = get_settings()
_client = genai.Client(api_key=settings.gemini_api_key)


SCRIPT_SYSTEM_INSTRUCTION = (
    "You are a short-form video scriptwriter. Produce a vertical 9:16 reel script "
    "in JSON. Keep it factual, punchy, and engaging. Use 5-7 scenes. Each scene "
    "must include a vivid `image_prompt` and a one-to-two-sentence `narration`."
)


def generate_reel_script(topic: str) -> ReelScript:
    logger.info("Generating script for topic: %s", topic)
    response = _client.models.generate_content(
        model=settings.gemini_model,
        contents=f"Topic: {topic}",
        config=types.GenerateContentConfig(
            system_instruction=SCRIPT_SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=ReelScript,
        ),
    )
    if response.parsed is None:
        logger.error("Gemini returned no parsed script for topic %s", topic)
        raise RuntimeError("Failed to generate script")
    return response.parsed


def generate_image_from_prompt(prompt: str, reel_id: uuid.UUID | str, scene_index: int) -> str:
    headers = {"Authorization": f"Bearer {settings.hf_token}"}
    payload = {"inputs": f"{prompt}, 8k, vertical 9:16"}
    logger.info("Requesting image: reel=%s scene=%s", reel_id, scene_index)
    res = requests.post(settings.flux_model_url, headers=headers, json=payload, timeout=120)
    if res.status_code != 200:
        logger.error("FLUX returned %s: %s", res.status_code, res.text[:200])
        raise RuntimeError(f"Image generation failed: HTTP {res.status_code}")

    settings.images_dir.mkdir(parents=True, exist_ok=True)
    path = settings.images_dir / f"reel_{reel_id}_{scene_index}.png"
    path.write_bytes(res.content)
    return f"/{path.as_posix()}"


async def generate_audio(text: str, reel_id: uuid.UUID | str, scene_index: int) -> str:
    settings.audio_dir.mkdir(parents=True, exist_ok=True)
    path = settings.audio_dir / f"reel_{reel_id}_{scene_index}.mp3"
    logger.info("Generating audio: reel=%s scene=%s", reel_id, scene_index)
    await edge_tts.Communicate(text, settings.tts_voice).save(str(path))
    return f"/{path.as_posix()}"


def assemble_video(scenes_data: Iterable[dict], reel_id: uuid.UUID | str) -> str:
    settings.videos_dir.mkdir(parents=True, exist_ok=True)
    final_path = settings.videos_dir / f"final_{reel_id}.mp4"

    clips = []
    audio_handles: list[AudioFileClip] = []
    try:
        for scene in scenes_data:
            if not scene.get("image_url") or not scene.get("audio_url"):
                raise ValueError(f"Scene {scene.get('scene_number')} missing assets")
            audio = AudioFileClip(scene["audio_url"].lstrip("/"))
            audio_handles.append(audio)
            clip = (
                ImageClip(scene["image_url"].lstrip("/"))
                .with_duration(audio.duration)
                .with_audio(audio)
            )
            clips.append(clip)

        final = concatenate_videoclips(clips, method="compose")
        final.write_videofile(
            str(final_path),
            fps=24,
            codec="libx264",
            audio_codec="aac",
            logger=None,
        )
        return f"/{final_path.as_posix()}"
    finally:
        for clip in clips:
            clip.close()
        for audio in audio_handles:
            audio.close()

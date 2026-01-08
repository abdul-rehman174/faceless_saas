import os, requests, asyncio, edge_tts
from google import genai
from google.genai import types
from dotenv import load_dotenv
from apps.schemas import ReelScript
from moviepy import ImageClip, AudioFileClip, concatenate_videoclips

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_reel_script(topic: str):
    response = client.models.generate_content(
        model="gemini-2.0-flash", contents=f"Topic: {topic}",
        config=types.GenerateContentConfig(
            system_instruction="Create a viral reel script in JSON.",
            response_mime_type="application/json", response_schema=ReelScript))
    return response.parsed

def generate_image_from_prompt(prompt: str, reel_id: str, scene_index: int):
    token = os.getenv("HF_TOKEN")
    API_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"inputs": f"{prompt}, 8k, vertical 9:16"}
    res = requests.post(API_URL, headers=headers, json=payload)
    if res.status_code == 200:
        path = f"static/images/reel_{reel_id}_{scene_index}.png"
        os.makedirs("static/images", exist_ok=True)
        with open(path, "wb") as f: f.write(res.content)
        return f"/{path}"
    return None

async def generate_audio(text: str, reel_id: str, scene_index: int):
    path = f"static/audio/reel_{reel_id}_{scene_index}.mp3"
    os.makedirs("static/audio", exist_ok=True)
    await edge_tts.Communicate(text, "en-US-ChristopherNeural").save(path)
    return f"/{path}"

def assemble_video(scenes_data, reel_id: str):
    clips = []
    final_path = f"static/videos/final_{reel_id}.mp4"
    os.makedirs("static/videos", exist_ok=True)
    try:
        for scene in scenes_data:
            audio = AudioFileClip(scene['audio_url'].lstrip('/'))
            # MoviePy v2.x
            img = (ImageClip(scene['image_url'].lstrip('/'))
                   .with_duration(audio.duration).with_audio(audio))
            clips.append(img)
        final = concatenate_videoclips(clips, method="compose")
        final.write_videofile(final_path, fps=24, codec="libx264")
        return f"/{final_path}"
    except Exception as e:
        print(f"Assembly Error: {e}"); return None
import os
import requests
import base64
from google import genai
from google.genai import types
from dotenv import load_dotenv
from apps.schemas import ReelScript

# Environment variables load karein
load_dotenv()

# Gemini Client initialize karein
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# --- 1. SCRIPT GENERATION (GEMINI) ---
def generate_reel_script(topic: str):
    """
    Directly generates a script using Gemini 2.0 Flash.
    No retries, no waiting.
    """
    system_instruction = (
        "You are a professional viral scriptwriter. "
        "Create a high-retention 60-second script for a faceless reel. "
        "The output MUST follow the provided JSON schema exactly."
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"Topic: {topic}",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=ReelScript,
        )
    )
    return response.parsed


# --- 2. IMAGE GENERATION (FLUX.1-SCHNELL) ---
def generate_image_from_prompt(prompt: str):
    """
    Directly generates a 4K image using FLUX model.
    """
    token = os.getenv("HF_TOKEN")
    API_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "inputs": f"{prompt}, cinematic lighting, photorealistic, 8k resolution, sharp focus",
    }

    response = requests.post(API_URL, headers=headers, json=payload)

    if response.status_code == 200:
        encoded_image = base64.b64encode(response.content).decode('utf-8')
        return f"data:image/png;base64,{encoded_image}"

    print(f"Image Error: {response.status_code} - {response.text}")
    return None
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
from apps.schemas import ReelScript # Import your new blueprint

load_dotenv()

# Initialize the 2026 Client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def generate_reel_script(topic: str):
    system_instruction = (
        "You are a professional viral scriptwriter. "
        "Create a high-retention 60-second script for a faceless reel. "
        "The output MUST follow the provided JSON schema exactly."
    )

    # Calling Gemini with a structured response requirement
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"Topic: {topic}",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=ReelScript, # THIS FORCES THE JSON STRUCTURE
        )
    )

    # .parsed gives you a ready-to-use Python object (no json.loads required!)
    return response.parsed
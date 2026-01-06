from fastapi import FastAPI
from apps.ai_logic import generate_reel_script
from apps.schemas import ReelScript

app = FastAPI(title="Faceless Reel AI")

@app.get("/")
def home():
    return {"status": "Active", "goal": "Earn $10,000"}

@app.post("/generate-reel", response_model=ReelScript)
async def create_reel(topic: str):
    # This now returns a structured object, not just a string
    script_data = generate_reel_script(topic)
    return script_data
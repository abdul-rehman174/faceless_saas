from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from apps.database import get_db
from apps.ai_logic import generate_reel_script, generate_image_from_prompt
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate-reel")
async def create_reel(topic: str, db: Session = Depends(get_db)):
    try:
        script_object = generate_reel_script(topic)
        # Database mein data save karna
        sql = text("INSERT INTO reels (topic, script_data) VALUES (:topic, :data)")
        db.execute(sql, {"topic": topic, "data": json.dumps(script_object.model_dump())})
        db.commit()
        return script_object
    except Exception as e:
        # Debugging ke liye terminal mein error print karein
        print(f"Error: {e}")
        raise HTTPException(status_code=503, detail="AI is busy, please try again in a moment.")

@app.get("/reels")
def get_all_reels(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT id, topic, script_data, created_at FROM reels ORDER BY created_at DESC"))
    # mapping use karke dictionary return karna
    return [dict(row._mapping) for row in result]

@app.post("/generate-image")
async def create_image(prompt: str):
    # Ab ye function error nahi dega kyunki import ho chuka hai
    image_data = generate_image_from_prompt(prompt)
    if not image_data:
        raise HTTPException(status_code=500, detail="AI image server busy or token invalid.")
    return {"image_url": image_data}
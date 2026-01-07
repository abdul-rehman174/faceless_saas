from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from apps.database import get_db
from apps.ai_logic import generate_reel_script
from apps.schemas import ReelScript

app = FastAPI()


@app.post("/generate-reel", response_model=ReelScript)
async def create_reel(topic: str, db: Session = Depends(get_db)):

    script_object = generate_reel_script(topic)

    # we save the script_object into database by converting it to dict
    from sqlalchemy import text
    sql = text("INSERT INTO reels (topic, script_data) VALUES (:topic, :data)")
    db.execute(sql, {"topic": topic, "data": script_object.model_dump_json()})
    db.commit()

    return script_object
from sqlalchemy.orm import Session
from apps import database, schemas


def save_reel_script(db: Session, topic: str, script_data: dict):
    new_reel = database.Base.metadata.tables['reels']
    # Execute SQL query
    query = new_reel.insert().values(
        topic=topic,
        script_data=script_data
    )
    db.execute(query)
    db.commit()
    return {"message": "Saved successfully!"}
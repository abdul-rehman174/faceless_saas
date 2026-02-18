from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from apps.database import Base
import uuid

class Reel(Base):
    __tablename__ = "reels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic = Column(String)
    script_data = Column(JSONB)

    video_url = Column(String, nullable=True)
    generated_assets = Column(JSONB, default=[])

    created_at = Column(DateTime(timezone=True), server_default=func.now())
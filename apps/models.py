from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from apps.database import Base
import uuid
from datetime import datetime

class Reel(Base):
    __tablename__ = "reels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    topic = Column(String)
    script_data = Column(JSON)
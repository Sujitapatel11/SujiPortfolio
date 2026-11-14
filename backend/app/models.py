"""SQLAlchemy models for portfolio, client intake, and assistant features."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from pgvector.sqlalchemy import Vector
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class KnowledgeChunk(Base):
    """Profile knowledge chunks used by Ask Suji retrieval."""
    __tablename__ = "knowledge_chunks"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(384).with_variant(JSON, "sqlite"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Inquiry(Base):
    """Client inquiries and leads submitted through the portfolio."""
    __tablename__ = "inquiries"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    project_type = Column(String(100), nullable=False)
    budget = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    source = Column(String(50), nullable=False, default="form")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Appointment(Base):
    """Appointment requests submitted by portfolio visitors."""
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    preferred_time = Column(Text, nullable=True)
    purpose = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

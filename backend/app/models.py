from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Inquiry(Base):
    """
    SQLAlchemy Model for client inquiries and leads.
    Sources: 'form' (direct site form) or 'chat' (AI intake agent conversation).
    """
    __tablename__ = "inquiries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    project_type = Column(String(100), nullable=False)
    budget = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    source = Column(String(50), nullable=False, default="form")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class Job(Base):
    """
    SQLAlchemy Model for job opportunities (e.g. from Upwork, LinkedIn, direct reachouts).
    """
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    platform = Column(String(100), nullable=False, default="Direct")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    budget = Column(String(100), nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    match_score = Column(Float, nullable=True, default=0.0)
    status = Column(String(50), nullable=False, default="new")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    proposals = relationship("Proposal", back_populates="job", cascade="all, delete-orphan")

class Proposal(Base):
    """
    SQLAlchemy Model for generated proposals and application drafts.
    """
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    draft_text = Column(Text, nullable=False)
    edited_text = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="draft")
    generated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    job = relationship("Job", back_populates="proposals")


from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON, Boolean
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class JobStatus:
    DISCOVERED = "DISCOVERED"
    MATCHED = "MATCHED"
    SAVED = "SAVED"
    DRAFTED = "DRAFTED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    SUBMITTED = "SUBMITTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

    @classmethod
    def normalize(cls, val: str) -> str:
        if not val:
            return cls.DISCOVERED
        v = val.strip().upper()
        if v in ("NEW", "DISCOVERED"):
            return cls.DISCOVERED
        if v in ("MATCHED",):
            return cls.MATCHED
        if v in ("SAVED", "BOOKMARKED"):
            return cls.SAVED
        if v in ("DRAFTED", "DRAFT"):
            return cls.DRAFTED
        if v in ("PENDING", "PENDING_APPROVAL"):
            return cls.PENDING_APPROVAL
        if v in ("APPROVED",):
            return cls.APPROVED
        if v in ("APPLIED", "SUBMITTED"):
            return cls.SUBMITTED
        if v in ("REJECTED", "SKIPPED"):
            return cls.REJECTED
        if v in ("EXPIRED", "CLOSED"):
            return cls.EXPIRED
        return v

class KnowledgeChunk(Base):
    """
    SQLAlchemy Model for vector knowledge chunks (pgvector).
    Stores profile data chunks and their 384-dimensional sentence-transformers embeddings.
    """
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(384).with_variant(JSON, "sqlite"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

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
    SQLAlchemy Model for job opportunities from all configured providers.
    """
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    platform = Column(String(100), nullable=False, default="Direct")
    external_id = Column(String(255), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True, index=True)
    location = Column(String(255), nullable=True)
    is_remote = Column(Boolean, nullable=True, default=False)
    job_type = Column(String(100), nullable=True)  # full-time, contract, freelance, internship, part-time
    description = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    canonical_url = Column(String(500), nullable=True, index=True)
    budget = Column(String(100), nullable=True)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(20), nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    match_score = Column(Float, nullable=True, default=0.0)
    match_explanation = Column(JSON, nullable=True)
    skills_gap = Column(JSON, nullable=True)
    raw_metadata = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default=JobStatus.DISCOVERED)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

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
    cover_letter = Column(Text, nullable=True)
    tailored_resume_suggestions = Column(JSON, nullable=True)
    interview_questions = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default="draft")
    generated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    job = relationship("Job", back_populates="proposals")

class SearchAuditLog(Base):
    """
    SQLAlchemy Model for job search history and audit logs.
    """
    __tablename__ = "search_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    query_text = Column(String(500), nullable=False)
    parsed_filters = Column(JSON, nullable=True)
    provider_summaries = Column(JSON, nullable=True)
    total_found = Column(Integer, default=0)
    total_matched = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class ProviderHealthRecord(Base):
    """
    SQLAlchemy Model for API provider connectivity, health, and credentials status.
    """
    __tablename__ = "provider_health_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    platform = Column(String(100), unique=True, index=True, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    is_healthy = Column(Boolean, default=True, nullable=False)
    missing_credentials = Column(JSON, nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

class Appointment(Base):
    """
    SQLAlchemy Model for appointment requests submitted by visitors.
    Status values: "pending", "confirmed", "declined", "rescheduled".
    """
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    preferred_time = Column(Text, nullable=True)
    purpose = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)




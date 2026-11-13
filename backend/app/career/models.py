from datetime import datetime, timezone
from sqlalchemy import Column, Date, DateTime, Integer, String, Text, JSON, UniqueConstraint
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class CareerProfile(Base):
    __tablename__ = "career_profiles"
    id = Column(Integer, primary_key=True, default=1)
    profile_json = Column(JSON, nullable=False, default=dict)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

class CareerJob(Base):
    __tablename__ = "career_jobs"
    __table_args__ = (UniqueConstraint("source_key", name="uq_career_jobs_source_key"),)
    id = Column(Integer, primary_key=True, index=True)
    source_key = Column(String(500), nullable=False)
    source_name = Column(String(160), nullable=False, default="Manual")
    source_url = Column(String(1000), nullable=True)
    title = Column(String(300), nullable=False, index=True)
    company = Column(String(255), nullable=True, index=True)
    description = Column(Text, nullable=True)
    country = Column(String(100), nullable=True, index=True)
    location = Column(String(255), nullable=True)
    work_mode = Column(String(30), nullable=False, default="unknown")
    applicant_eligibility = Column(String(30), nullable=False, default="unknown")
    salary_text = Column(String(255), nullable=True)
    closing_date = Column(Date, nullable=True)
    job_status = Column(String(30), nullable=False, default="unverified", index=True)
    skills = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

class CareerApplication(Base):
    __tablename__ = "career_applications"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, nullable=False, index=True)
    status = Column(String(40), nullable=False, default="saved")
    notes = Column(Text, nullable=True)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

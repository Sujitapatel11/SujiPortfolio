from datetime import date, datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, HttpUrl

class CareerProfileUpdate(BaseModel):
    profile: dict[str, Any] = Field(default_factory=dict)

class CareerProfileResponse(BaseModel):
    profile: dict[str, Any]
    updated_at: datetime | None = None

class CareerJobCreate(BaseModel):
    source_key: str = Field(min_length=1, max_length=500)
    source_name: str = Field(default="Manual", max_length=160)
    source_url: str | None = Field(default=None, max_length=1000)
    title: str = Field(min_length=2, max_length=300)
    company: str | None = None
    description: str | None = None
    country: str | None = None
    location: str | None = None
    work_mode: Literal["remote", "hybrid", "onsite", "unknown"] = "unknown"
    applicant_eligibility: Literal["eligible", "ineligible", "unknown"] = "unknown"
    salary_text: str | None = None
    closing_date: date | None = None
    skills: list[str] = Field(default_factory=list)

class CareerJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source_key: str
    source_name: str
    source_url: str | None
    title: str
    company: str | None
    description: str | None
    country: str | None
    location: str | None
    work_mode: str
    applicant_eligibility: str
    salary_text: str | None
    closing_date: date | None
    job_status: str
    skills: list[str]
    created_at: datetime

class CareerApplicationUpdate(BaseModel):
    status: Literal["saved", "interested", "preparing", "applied", "interview", "rejected", "offer", "withdrawn"]
    notes: str | None = None

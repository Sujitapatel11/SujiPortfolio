from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

class InquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, example="Sujita Sharma")
    email: EmailStr = Field(..., example="sujita@example.com")
    project_type: str = Field(..., min_length=2, max_length=100, example="3D Interactive Web App")
    budget: Optional[str] = Field(None, example="$5,000 - $10,000")
    message: str = Field(..., min_length=5, example="I want to build a custom 3D web experience with an AI chatbot.")
    source: Optional[str] = Field("form", description="Origin of inquiry: 'form' or 'chat'")

class InquiryResponse(BaseModel):
    id: int
    name: str
    email: str
    project_type: str
    budget: Optional[str]
    message: str
    source: str
    created_at: datetime

    class Config:
        from_attributes = True

# Profile Schemas
class ProjectItem(BaseModel):
    title: str
    description: str
    tags: List[str]
    link: Optional[str] = None
    featured: bool = True

class ServiceItem(BaseModel):
    name: str
    description: str
    price_range: str
    deliverables: List[str]

class ProfileResponse(BaseModel):
    name: str
    title: str
    bio: str
    skills: List[str]
    services: List[ServiceItem]
    projects: List[ProjectItem]
    contact: dict

# Admin Schemas
class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str = "admin"

class AdminUserResponse(BaseModel):
    username: str
    role: str = "admin"

# Job Schemas
class JobCreate(BaseModel):
    platform: Optional[str] = "Direct"
    external_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    budget: Optional[str] = None
    posted_at: Optional[datetime] = None
    match_score: Optional[float] = 0.0
    status: Optional[str] = "new"

class JobResponse(BaseModel):
    id: int
    platform: str
    external_id: Optional[str] = None
    title: str
    description: Optional[str]
    url: Optional[str]
    budget: Optional[str]
    posted_at: Optional[datetime]
    match_score: Optional[float]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class JobSearchRequest(BaseModel):
    keywords: Optional[List[str]] = Field(default_factory=lambda: ["python", "fastapi", "react", "ai"])

class JobSearchStats(BaseModel):
    fetched: int
    matched: int
    drafted: int

class JobSearchResponse(BaseModel):
    summary: dict

# Proposal Schemas
class ProposalCreate(BaseModel):
    job_id: int
    draft_text: str
    edited_text: Optional[str] = None
    status: Optional[str] = "draft"

class ProposalUpdate(BaseModel):
    edited_text: Optional[str] = None
    status: Optional[str] = None

class ProposalResponse(BaseModel):
    id: int
    job_id: int
    draft_text: str
    edited_text: Optional[str]
    status: str
    generated_at: datetime

    class Config:
        from_attributes = True

# Manual Paste Job Schemas
class JobPasteRequest(BaseModel):
    platform: str = Field(..., description="Platform name e.g. Upwork, Fiverr, Other")
    title: str = Field(..., min_length=2, example="Full-Stack Developer for FastAPI & React Platform")
    description: str = Field(..., min_length=5, example="Looking for a Python/FastAPI backend engineer with React skills.")
    url: Optional[str] = Field(None, example="https://www.upwork.com/jobs/~0123456789")
    budget: Optional[str] = Field(None, example="$3,000")

class JobPasteResponse(BaseModel):
    job: JobResponse
    proposal: ProposalResponse

class JobStatusUpdate(BaseModel):
    status: str = Field(..., example="applied", description="New status: new, applied, rejected, hired")

# Appointment Schemas
class AppointmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, example="Jane Doe")
    email: EmailStr = Field(..., example="jane@example.com")
    preferred_time: Optional[str] = Field(None, example="Tomorrow 2pm")
    purpose: Optional[str] = Field(None, example="Discussing a new SaaS MVP")

class AppointmentUpdate(BaseModel):
    status: str = Field(..., example="confirmed", description="New status: pending, confirmed, declined, rescheduled")

class AppointmentResponse(BaseModel):
    id: int
    name: str
    email: str
    preferred_time: Optional[str]
    purpose: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True




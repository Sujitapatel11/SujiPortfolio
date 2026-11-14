from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, EmailStr, Field


class InquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, example="Sujita Sharma")
    email: EmailStr = Field(..., example="sujita@example.com")
    project_type: str = Field(..., min_length=2, max_length=100, example="3D Interactive Web App")
    budget: Optional[str] = Field(None, example="$5,000 - $10,000")
    message: str = Field(..., min_length=1, example="I want to build a custom 3D web experience with an AI chatbot.")
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


class AppointmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, example="Jane Doe")
    email: EmailStr = Field(..., example="jane@example.com")
    preferred_time: Optional[str] = Field(None, example="Tomorrow 2pm")
    purpose: Optional[str] = Field(None, example="Discussing a new SaaS MVP")


class AppointmentUpdate(BaseModel):
    status: Literal["confirmed", "declined", "rescheduled"] = Field(
        ...,
        example="confirmed",
        description="New status: confirmed, declined, or rescheduled",
    )


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

import logging
from typing import Optional
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from app.database import SessionLocal
from app.models import Inquiry, Appointment

logger = logging.getLogger("sujis_world.agent.tools")


class InquiryToolInput(BaseModel):
    name: str = Field(description="Full name of the visitor/client")
    email: str = Field(description="Email address of the visitor/client")
    project_type: str = Field(description="Type of project requested")
    budget: str = Field(description="Estimated budget range specified by the client")
    message: Optional[str] = Field(default="", description="Summary of project requirements")


@tool("save_client_inquiry", args_schema=InquiryToolInput)
def save_client_inquiry(name: str, email: str, project_type: str, budget: str, message: str = "") -> str:
    """Save a qualified client inquiry in the portfolio database."""
    db = SessionLocal()
    try:
        inquiry = Inquiry(
            name=name,
            email=email,
            project_type=project_type,
            budget=budget,
            message=message or f"Inquiry submitted via Ask Suji for {project_type}.",
            source="chat",
        )
        db.add(inquiry)
        db.commit()
        db.refresh(inquiry)
        logger.info("Saved client inquiry ID %s", inquiry.id)
        return f"SUCCESS: Inquiry saved with ID {inquiry.id}."
    except Exception as exc:
        logger.exception("Error saving inquiry")
        db.rollback()
        return f"ERROR: Failed to save inquiry: {exc}"
    finally:
        db.close()


class AppointmentToolInput(BaseModel):
    name: str = Field(description="Full name of the visitor/client")
    email: str = Field(description="Email address of the visitor/client")
    preferred_time: str = Field(description="Preferred date/time")
    purpose: Optional[str] = Field(default="", description="Purpose of the meeting/call")


@tool("book_appointment_request", args_schema=AppointmentToolInput)
def book_appointment_request(name: str, email: str, preferred_time: str, purpose: str = "") -> str:
    """Save an appointment request for Sujita to review."""
    db = SessionLocal()
    try:
        appt = Appointment(
            name=name,
            email=email,
            preferred_time=preferred_time,
            purpose=purpose or "General Consultation / Project Discussion",
            status="pending",
        )
        db.add(appt)
        db.commit()
        db.refresh(appt)
        return f"SUCCESS: Appointment request #{appt.id} recorded. Sujita can review it in the client dashboard."
    except Exception as exc:
        logger.exception("Error booking appointment")
        db.rollback()
        return f"ERROR: Failed to record appointment request: {exc}"
    finally:
        db.close()


class InquiriesListToolInput(BaseModel):
    limit: int = Field(default=5, ge=1, le=50, description="Maximum number of recent inquiries")


@tool("list_recent_inquiries", args_schema=InquiriesListToolInput)
def list_recent_inquiries(limit: int = 5) -> str:
    """ADMIN ONLY: Retrieve recent client inquiries."""
    db = SessionLocal()
    try:
        inquiries = db.query(Inquiry).order_by(Inquiry.created_at.desc()).limit(limit).all()
        if not inquiries:
            return "No client inquiries found."
        lines = ["Recent Client Inquiries:"]
        for item in inquiries:
            lines.append(
                f"- ID #{item.id} | {item.name} ({item.email}) | {item.project_type} | "
                f"Budget: {item.budget or 'N/A'} | Source: {item.source}"
            )
        return "\n".join(lines)
    except Exception as exc:
        logger.exception("Error listing inquiries")
        return f"ERROR: Failed to retrieve inquiries: {exc}"
    finally:
        db.close()

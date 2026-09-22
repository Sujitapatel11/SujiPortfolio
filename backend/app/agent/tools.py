import logging
import re
import urllib.parse
from typing import Optional, List
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from app.database import SessionLocal
from app.models import Inquiry, Appointment, Job, Proposal
from app.admin.whatsapp import ADMIN_DASHBOARD_URL, send_whatsapp_notification

logger = logging.getLogger("sujis_world.agent.tools")

# --- PUBLIC TOOLS ---

class InquiryToolInput(BaseModel):
    name: str = Field(description="Full name of the visitor/client")
    email: str = Field(description="Email address of the visitor/client")
    project_type: str = Field(description="Type of project requested (e.g. Full-Stack Web App, AI Agent, MVP Building, Backend API)")
    budget: str = Field(description="Estimated budget range specified by the client (e.g. $5,000 - $10,000, $2,500, or TBD)")
    message: Optional[str] = Field(default="", description="Summary of project requirements or details discussed during chat")

@tool("save_client_inquiry", args_schema=InquiryToolInput)
def save_client_inquiry(name: str, email: str, project_type: str, budget: str, message: str = "") -> str:
    """
    Saves a qualified client lead / inquiry into Sujita's database.
    Call this tool once you have collected the client's name, email, project_type, and budget.
    """
    db = SessionLocal()
    try:
        inquiry = Inquiry(
            name=name,
            email=email,
            project_type=project_type,
            budget=budget,
            message=message or f"Inquiry submitted via 'Ask Suji' AI Intake Agent for {project_type}.",
            source="chat"
        )
        db.add(inquiry)
        db.commit()
        db.refresh(inquiry)
        logger.info(f"Successfully saved chat inquiry ID {inquiry.id} for {name} ({email})")
        return f"SUCCESS: Inquiry saved with ID {inquiry.id}. Sujita has received the details for {name} ({email})."
    except Exception as e:
        logger.error(f"Error saving inquiry tool: {e}")
        db.rollback()
        return f"ERROR: Failed to save inquiry due to database error: {str(e)}"
    finally:
        db.close()


class AppointmentToolInput(BaseModel):
    name: str = Field(description="Full name of the visitor/client requesting an appointment")
    email: str = Field(description="Email address of the visitor/client")
    preferred_time: str = Field(description="Rough preferred date/time (e.g. 'Tomorrow 2pm', 'Next Monday morning', 'Friday 4pm EST')")
    purpose: Optional[str] = Field(default="", description="Purpose or topic of the meeting/call")

@tool("book_appointment_request", args_schema=AppointmentToolInput)
def book_appointment_request(name: str, email: str, preferred_time: str, purpose: str = "") -> str:
    """
    Saves a new appointment request from a visitor into the database.
    Call this tool when a visitor wants to talk to Sujita, schedule a call, or discuss a project directly.
    """
    db = SessionLocal()
    try:
        appt = Appointment(
            name=name,
            email=email,
            preferred_time=preferred_time,
            purpose=purpose or "General Consultation / Project Discussion",
            status="pending"
        )
        db.add(appt)
        db.commit()
        db.refresh(appt)
        
        notification = (
            f"New appointment request from {name} ({email})\n"
            f"Preferred time: {preferred_time}\n"
            f"Purpose: {purpose or 'General Consultation / Project Discussion'}\n"
            f"Review: {ADMIN_DASHBOARD_URL}/appointments"
        )
        send_whatsapp_notification(notification)
        
        return f"SUCCESS: Appointment request #{appt.id} received for {name} ({email}). Sujita has been notified and will confirm within 24 hours via email."
    except Exception as e:
        logger.error(f"Error booking appointment: {e}")
        db.rollback()
        return f"ERROR: Failed to record appointment request: {str(e)}"
    finally:
        db.close()


# --- ADMIN-ONLY TOOLS ---

class JobSearchToolInput(BaseModel):
    keywords: Optional[List[str]] = Field(default=None, description="Keywords for job discovery e.g. ['python', 'fastapi', 'react', 'ai']")

@tool("trigger_job_search", args_schema=JobSearchToolInput)
def trigger_job_search(keywords: Optional[List[str]] = None) -> str:
    """
    ADMIN ONLY: Triggers multi-platform job discovery, deduplication, scoring, and proposal drafting.
    """
    from app.admin.orchestrator import JobDiscoveryOrchestrator
    db = SessionLocal()
    try:
        search_keywords = keywords if keywords else ["python", "fastapi", "react", "ai"]
        orchestrator = JobDiscoveryOrchestrator()
        summary = orchestrator.run_discovery(db=db, keywords=search_keywords)
        fetched = summary.get("fetched", 0)
        matched = summary.get("matched", 0)
        drafted = summary.get("drafted", 0)
        return f"SUCCESS: Job search executed. Fetched {fetched} jobs across platforms, matched {matched} high-scoring targets, and drafted {drafted} proposals."
    except Exception as e:
        logger.error(f"Error in trigger_job_search tool: {e}")
        return f"ERROR: Job search failed: {str(e)}"
    finally:
        db.close()


class InquiriesListToolInput(BaseModel):
    limit: int = Field(default=5, description="Maximum number of recent inquiries to retrieve")

@tool("list_recent_inquiries", args_schema=InquiriesListToolInput)
def list_recent_inquiries(limit: int = 5) -> str:
    """
    ADMIN ONLY: Retrieves a list of recent client inquiries submitted through the website or chat.
    """
    db = SessionLocal()
    try:
        inquiries = db.query(Inquiry).order_by(Inquiry.created_at.desc()).limit(limit).all()
        if not inquiries:
            return "No client inquiries found in database."
        lines = ["Recent Client Inquiries:"]
        for inq in inquiries:
            lines.append(f"- ID #{inq.id} | {inq.name} ({inq.email}) | {inq.project_type} | Budget: {inq.budget or 'N/A'} | Source: {inq.source}")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Error in list_recent_inquiries tool: {e}")
        return f"ERROR: Failed to retrieve inquiries: {str(e)}"
    finally:
        db.close()


class ProposalGetToolInput(BaseModel):
    job_title_or_id: str = Field(description="Job ID (e.g. '1', '2') or job title keyword")

@tool("get_proposal", args_schema=ProposalGetToolInput)
def get_proposal(job_title_or_id: str) -> str:
    """
    ADMIN ONLY: Retrieves the generated AI proposal draft or edited text for a specific job.
    """
    db = SessionLocal()
    try:
        query_str = job_title_or_id.strip()
        proposal = None
        job = None

        if query_str.isdigit():
            job_id_val = int(query_str)
            proposal = db.query(Proposal).filter(Proposal.job_id == job_id_val).first()
            if not proposal:
                proposal = db.query(Proposal).filter(Proposal.id == job_id_val).first()
            if proposal:
                job = db.query(Job).filter(Job.id == proposal.job_id).first()
        
        if not proposal:
            jobs = db.query(Job).filter(Job.title.ilike(f"%{query_str}%")).all()
            if jobs:
                job = jobs[0]
                proposal = db.query(Proposal).filter(Proposal.job_id == job.id).first()

        if not proposal:
            return f"No proposal found matching '{job_title_or_id}'."

        title_str = job.title if job else f"Job #{proposal.job_id}"
        content = proposal.edited_text or proposal.draft_text
        return f"PROPOSAL FOR: {title_str}\nSTATUS: {proposal.status}\n\n{content}"
    except Exception as e:
        logger.error(f"Error in get_proposal tool: {e}")
        return f"ERROR: Failed to fetch proposal: {str(e)}"
    finally:
        db.close()


class WhatsAppToolInput(BaseModel):
    recipient_name_or_number: str = Field(description="Recipient's phone number (e.g., '+1234567890' or '919876543210') or name")
    message: str = Field(description="Message text to send via WhatsApp")

@tool("send_whatsapp_message", args_schema=WhatsAppToolInput)
def send_whatsapp_message(recipient_name_or_number: str, message: str) -> str:
    """
    ADMIN ONLY: Prepares a WhatsApp message by generating a wa.me deep link.
    If given a phone number, returns a working wa.me link. If given a name, asks for clarification because contact list is not available.
    """
    clean_target = recipient_name_or_number.strip()
    digits = re.sub(r'[^\d]', '', clean_target)
    
    if len(digits) >= 7:
        encoded_text = urllib.parse.quote(message)
        wa_link = f"https://wa.me/{digits}?text={encoded_text}"
        return (
            f"SUCCESS: Prepared WhatsApp message for {recipient_name_or_number}.\n"
            f"[Open WhatsApp]({wa_link})\n\n"
            f"Direct Link: {wa_link}"
        )
    else:
        return (
            f"NEED_CLARIFICATION: Could you please provide {recipient_name_or_number}'s phone number (with country code)? "
            "Since there is no saved contact list integration yet, I need a valid phone number to generate the WhatsApp link."
        )

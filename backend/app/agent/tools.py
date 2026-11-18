import hashlib
import json
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


def _submission_key(kind: str, payload: dict) -> str:
    """Stable digest used to prevent duplicate public submissions without storing raw keys."""
    canonical = json.dumps({"kind": kind, **payload}, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


# --- PUBLIC TOOLS ---

class InquiryToolInput(BaseModel):
    name: str = Field(description="Full name of the visitor/client")
    email: str = Field(description="Email address of the visitor/client")
    project_type: str = Field(description="Type of project requested (e.g. Full-Stack Web App, AI Agent, MVP Building, Backend API)")
    budget: Optional[str] = Field(default=None, description="Budget explicitly provided by the visitor; omit when unknown")
    message: Optional[str] = Field(default="", description="Summary of project requirements or details discussed during chat")

@tool("save_client_inquiry", args_schema=InquiryToolInput)
def save_client_inquiry(name: str, email: str, project_type: str, budget: Optional[str] = None, message: str = "") -> str:
    """
    Saves a qualified client lead / inquiry into Sujita's database.
    Call only after the visitor explicitly asks to submit an inquiry and you have name, email and project_type. Budget is optional and must never be guessed.
    """
    db = SessionLocal()
    key = _submission_key("inquiry", {
        "name": name.strip().casefold(),
        "email": email.strip().casefold(),
        "project_type": project_type.strip().casefold(),
        "budget": (budget or "").strip().casefold(),
        "message": (message or "").strip(),
    })
    try:
        existing = db.query(Inquiry).filter(Inquiry.idempotency_key == key).first()
        if existing:
            return f"SUCCESS: This inquiry was already saved as #{existing.id}; no duplicate was created."
        inquiry = Inquiry(
            name=name,
            email=email,
            project_type=project_type,
            budget=budget,
            message=message or f"Inquiry submitted via 'Ask Suji' AI Intake Agent for {project_type}.",
            source="chat",
            idempotency_key=key,
        )
        db.add(inquiry)
        db.commit()
        db.refresh(inquiry)
        logger.info("Chat inquiry %s persisted.", inquiry.id)
        notification_sent = send_whatsapp_notification(
            f"New portfolio inquiry #{inquiry.id} from {name} ({email})\n"
            f"Project: {project_type}\nBudget: {budget or 'Not specified'}\n{message[:1000]}"
        )
        notification_state = "WhatsApp notification request accepted by the provider; delivery is not verified" if notification_sent else "WhatsApp notification request was not accepted; delivery is not verified"
        return f"SUCCESS: Inquiry #{inquiry.id} was saved to the intake database. Budget: {budget or 'Not specified'}. {notification_state}. This is a recorded inquiry, not a contract."
    except Exception:
        logger.exception("Error saving inquiry tool.")
        db.rollback()
        existing = db.query(Inquiry).filter(Inquiry.idempotency_key == key).first()
        if existing:
            return f"SUCCESS: This inquiry was already saved as #{existing.id}; no duplicate was created."
        return "ERROR: Failed to save the inquiry. No successful result was recorded."
    finally:
        db.close()


class AppointmentToolInput(BaseModel):
    name: str = Field(description="Full name of the visitor/client requesting an appointment")
    email: str = Field(description="Email address of the visitor/client")
    preferred_time: Optional[str] = Field(default=None, description="Visitor-provided preferred date/time; omit when not supplied")
    purpose: Optional[str] = Field(default="", description="Purpose or topic of the meeting/call")

@tool("book_appointment_request", args_schema=AppointmentToolInput)
def book_appointment_request(name: str, email: str, preferred_time: Optional[str] = None, purpose: str = "") -> str:
    """
    Saves a new appointment request from a visitor into the database.
    Call only after the visitor explicitly asks to submit a booking request and name/email are available. Preferred time is optional; never invent it.
    """
    db = SessionLocal()
    key = _submission_key("appointment", {
        "name": name.strip().casefold(),
        "email": email.strip().casefold(),
        "preferred_time": (preferred_time or "").strip().casefold(),
        "purpose": (purpose or "").strip().casefold(),
    })
    try:
        existing = db.query(Appointment).filter(Appointment.idempotency_key == key).first()
        if existing:
            return (
                f"SUCCESS: This appointment request already exists as #{existing.id} with status {existing.status}. "
                "No duplicate was created and no notification was resent."
            )
        appt = Appointment(
            name=name,
            email=email,
            preferred_time=preferred_time,
            purpose=purpose or "General Consultation / Project Discussion",
            status="pending",
            idempotency_key=key,
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
        notification_sent = send_whatsapp_notification(notification)
        appt.owner_notification_sent = notification_sent
        db.commit()
        notification_state = "WhatsApp notification request accepted by the provider; delivery is not verified" if notification_sent else "WhatsApp notification request was not accepted; delivery is not verified"
        return (
            f"SUCCESS: Appointment request #{appt.id} was saved with status pending. "
            f"Preferred time: {preferred_time or 'Not specified'}. {notification_state}. "
            "This is not a confirmed appointment; the owner must confirm it."
        )
    except Exception:
        logger.exception("Error booking appointment.")
        db.rollback()
        existing = db.query(Appointment).filter(Appointment.idempotency_key == key).first()
        if existing:
            return (
                f"SUCCESS: This appointment request already exists as #{existing.id} with status {existing.status}. "
                "No duplicate was created."
            )
        return "ERROR: Failed to save the appointment request. No successful result was recorded."
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

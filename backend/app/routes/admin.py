from typing import List, Optional
import logging
import re
from urllib.parse import parse_qs
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Inquiry, Job, Proposal, Appointment, JobStatus, SearchAuditLog, ProviderHealthRecord
from app.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminUserResponse,
    InquiryResponse,
    JobCreate,
    JobResponse,
    JobSearchRequest,
    JobSearchResponse,
    JobPasteRequest,
    JobPasteResponse,
    JobStatusUpdate,
    SchedulerIntervalUpdate,
    ProposalCreate,
    ProposalUpdate,
    ProposalResponse,
    AppointmentResponse,
    AppointmentUpdate,
)
from app.admin.auth import (
    ADMIN_USERNAME,
    ADMIN_PASSWORD_HASH,
    verify_password,
    create_access_token,
    get_current_admin,
)
from app.admin.orchestrator import JobDiscoveryOrchestrator
from app.admin.nl_search_parser import parse_natural_language_query
from app.admin.connectors.base import SearchQuery
from app.admin.ai_matcher import generate_tailored_application
from app.admin.connectors.manual import process_pasted_job
from app.admin.whatsapp import clear_pending_job, get_pending_job_id, parse_job_reply
from app.admin.whatsapp import ADMIN_WHATSAPP_NUMBER


router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger("sujis_world.admin")

@router.post("/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest):
    """
    Authenticate admin credentials and issue a JWT access token.
    """
    if payload.username != ADMIN_USERNAME or not verify_password(payload.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": payload.username, "role": "admin"})
    return AdminLoginResponse(
        access_token=access_token,
        token_type="bearer",
        username=payload.username,
        role="admin"
    )

@router.get("/me", response_model=AdminUserResponse)
def get_admin_profile(current_admin: dict = Depends(get_current_admin)):
    """
    Validate active admin JWT session.
    """
    return AdminUserResponse(username=current_admin["username"], role=current_admin["role"])

@router.get("/inquiries", response_model=List[InquiryResponse])
def list_admin_inquiries(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Protected endpoint to list client inquiries.
    """
    return db.query(Inquiry).order_by(Inquiry.created_at.desc()).all()

@router.get("/jobs", response_model=List[JobResponse])
def list_admin_jobs(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Protected endpoint to list jobs.
    """
    return db.query(Job).order_by(Job.created_at.desc()).all()

@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_admin_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Protected endpoint to create a new job tracking record.
    """
    job = Job(**payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

@router.post("/jobs/nl-parse")
def parse_job_query(
    payload: JobSearchRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Parse a natural language query into structured filters and return unsupported filter explanations.
    """
    query_str = payload.query or (payload.keywords and " ".join(payload.keywords)) or ""
    return parse_natural_language_query(query_str)

@router.post("/jobs/search-now", response_model=JobSearchResponse)
def trigger_job_search(
    payload: Optional[JobSearchRequest] = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Trigger multi-platform automated job discovery, deduplication, scoring, and proposal drafting.
    Supports natural language search string or structured filter inputs.
    """
    orchestrator = JobDiscoveryOrchestrator()
    if payload and payload.query:
        # Full natural language discovery
        res = orchestrator.run_discovery(db=db, keywords=payload.query)
    elif payload and (payload.keywords or payload.location or payload.salary_min or payload.is_remote or payload.job_type or payload.max_days_old):
        sq = SearchQuery(
            keywords=payload.keywords or ["python", "developer"],
            location=payload.location,
            is_remote=payload.is_remote,
            salary_min=payload.salary_min,
            job_type=payload.job_type,
            max_days_old=payload.max_days_old,
        )
        res = orchestrator.run_discovery(db=db, keywords=sq)
    else:
        keywords = payload.keywords if payload and payload.keywords else ["python", "fastapi", "react", "ai"]
        res = orchestrator.run_discovery(db=db, keywords=keywords)

    summary = res.copy()
    total_fetched = summary.pop("_total_fetched", 0)
    total_matched = summary.pop("_total_matched", 0)
    parsed_filters = summary.pop("_parsed_filters", None)
    unsupported_explanations = summary.pop("_unsupported_explanations", [])

    return JobSearchResponse(
        summary=summary,
        total_fetched=total_fetched,
        total_matched=total_matched,
        parsed_filters=parsed_filters,
        unsupported_explanations=unsupported_explanations,
    )

@router.get("/providers/health")
def get_providers_health(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Get connectivity, credential status, and health info for all 6 job providers.
    """
    orchestrator = JobDiscoveryOrchestrator()
    return orchestrator.get_providers_health(db=db)

@router.get("/audit-logs")
def list_search_audit_logs(
    limit: int = 15,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Get recent search audit logs and natural-language queries.
    """
    return db.query(SearchAuditLog).order_by(SearchAuditLog.created_at.desc()).limit(limit).all()

@router.get("/jobs/agent/status")
def job_agent_status(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    from app.admin.job_scheduler import scheduler_status
    return scheduler_status(db=db)

@router.post("/jobs/agent/start")
def start_job_agent(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    from app.admin.job_scheduler import start_scheduler, scheduler_status
    start_scheduler(force=True)
    return scheduler_status(db=db)

@router.post("/jobs/agent/stop")
def stop_job_agent(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    from app.admin.job_scheduler import stop_scheduler, scheduler_status
    stop_scheduler()
    return scheduler_status(db=db)

@router.post("/jobs/agent/interval")
def update_agent_interval(
    payload: SchedulerIntervalUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    from app.admin.job_scheduler import set_interval, scheduler_status
    set_interval(payload.interval_hours)
    return scheduler_status(db=db)

@router.get("/proposals", response_model=List[ProposalResponse])
def list_admin_proposals(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Protected endpoint to list proposals.
    """
    return db.query(Proposal).order_by(Proposal.generated_at.desc()).all()

@router.post("/proposals", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
def create_admin_proposal(
    payload: ProposalCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Protected endpoint to create a proposal record.
    """
    proposal = Proposal(**payload.model_dump())
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return proposal

@router.post("/knowledge/ingest")
def trigger_knowledge_ingestion(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Admin-only endpoint to trigger profile data vector ingestion into knowledge_chunks table.
    """
    from app.agent.ingestion import ingest_profile_data
    try:
        res = ingest_profile_data(db=db)
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Knowledge ingestion failed: {str(e)}"
        )

@router.post("/jobs/paste", response_model=JobPasteResponse, status_code=status.HTTP_201_CREATED)
def paste_job_and_draft_proposal(
    payload: JobPasteRequest,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Manual job paste submission endpoint for platforms like Upwork and Fiverr.
    Scores relevance score and automatically drafts an AI proposal.
    """
    try:
        db_job, proposal = process_pasted_job(
            db=db,
            platform=payload.platform,
            title=payload.title,
            description=payload.description,
            url=payload.url,
            budget=payload.budget,
            company=payload.company,
            location=payload.location,
        )
        return JobPasteResponse(job=db_job, proposal=proposal)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process manual job paste: {str(e)}"
        )

@router.post("/jobs/{job_id}/generate-assistance")
def generate_job_assistance(
    job_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Regenerate tailored application assistance (proposal, cover letter, resume recommendations, interview questions).
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    assistance = generate_tailored_application(job)
    proposal = db.query(Proposal).filter(Proposal.job_id == job.id).first()
    if not proposal:
        proposal = Proposal(job_id=job.id, draft_text=assistance["proposal_draft"], status="draft")
        db.add(proposal)

    proposal.cover_letter = assistance["cover_letter"]
    proposal.tailored_resume_suggestions = assistance["tailored_resume_suggestions"]
    proposal.interview_questions = assistance["interview_questions"]
    db.commit()
    db.refresh(proposal)
    return {
        "job_id": job.id,
        "proposal": proposal,
        "assistance": assistance,
    }

@router.patch("/proposals/{proposal_id}", response_model=ProposalResponse)
def update_proposal(
    proposal_id: int,
    payload: ProposalUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Update edited_text, cover_letter, and/or status for a proposal draft.
    """
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal #{proposal_id} not found"
        )
    
    if payload.edited_text is not None:
        proposal.edited_text = payload.edited_text
    if payload.cover_letter is not None:
        proposal.cover_letter = payload.cover_letter
    if payload.status is not None:
        proposal.status = payload.status

    db.commit()
    db.refresh(proposal)
    return proposal

@router.patch("/jobs/{job_id}/status", response_model=JobResponse)
def update_job_status(
    job_id: int,
    payload: JobStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Update job status according to standard lifecycle:
    DISCOVERED, MATCHED, SAVED, DRAFTED, PENDING_APPROVAL, APPROVED, SUBMITTED, REJECTED, EXPIRED.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job #{job_id} not found"
        )
    
    return _apply_job_status(db, job, payload.status)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Delete a job and its associated proposals.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job #{job_id} not found"
        )
    db.delete(job)
    db.commit()
    return None

def _apply_job_status(db: Session, job: Job, new_status: str) -> Job:
    normalized = JobStatus.normalize(new_status)
    job.status = normalized
    linked_proposal = db.query(Proposal).filter(Proposal.job_id == job.id).first()
    if linked_proposal:
        if normalized == JobStatus.SUBMITTED:
            linked_proposal.status = "submitted"
        elif normalized == JobStatus.APPROVED:
            linked_proposal.status = "approved"
        elif normalized == JobStatus.DRAFTED:
            linked_proposal.status = "draft"
    db.commit()
    db.refresh(job)
    return job


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Twilio inbound WhatsApp webhook. Only an unambiguous reply to the latest
    tracked job notification can change a job status.
    """
    raw_body = (await request.body()).decode("utf-8", errors="replace")
    form = parse_qs(raw_body)
    body = form.get("Body", [""])[0]
    sender = form.get("From", [""])[0]
    configured_sender = re.sub(r"\D", "", ADMIN_WHATSAPP_NUMBER)
    inbound_sender = re.sub(r"\D", "", sender)
    if inbound_sender and configured_sender and inbound_sender != configured_sender:
        logger.warning("Ignoring WhatsApp reply from unauthorized number: %s", sender)
        return {"status": "ignored"}
    status_intent = parse_job_reply(body)
    pending_job_id = get_pending_job_id()

    if not status_intent or pending_job_id is None:
        logger.info("Ignoring unclear WhatsApp reply: %s", body)
        return {"status": "ignored"}

    job = db.query(Job).filter(Job.id == pending_job_id).first()
    if not job:
        logger.warning("Pending WhatsApp job #%s no longer exists", pending_job_id)
        clear_pending_job()
        return {"status": "ignored"}

    _apply_job_status(db, job, status_intent)
    clear_pending_job()
    return {"status": "updated", "job_id": job.id, "job_status": job.status}

@router.get("/appointments", response_model=List[AppointmentResponse])
def list_admin_appointments(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Protected endpoint to list appointment requests.
    """
    return db.query(Appointment).order_by(Appointment.created_at.desc()).all()

@router.patch("/appointments/{appointment_id}", response_model=AppointmentResponse)
def update_appointment_status(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Protected endpoint to update appointment status (confirmed, declined, rescheduled).
    """
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment #{appointment_id} not found"
        )
    appt.status = payload.status.lower()
    db.commit()
    db.refresh(appt)
    return appt

"""Admin authentication, client management, and Job Hunter endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Inquiry, Appointment, Job, Proposal
from app.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminUserResponse,
    InquiryResponse,
    AppointmentResponse,
    AppointmentUpdate,
    JobResponse,
    JobSearchRequest,
    JobSearchResponse,
    JobPasteRequest,
    JobPasteResponse,
    JobStatusUpdate,
    ProposalResponse,
    ProposalUpdate,
)
from app.admin.auth import (
    ADMIN_USERNAME,
    ADMIN_PASSWORD_HASH,
    verify_password,
    create_access_token,
    get_current_admin,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest):
    if payload.username != ADMIN_USERNAME or not verify_password(payload.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(
            status_code=401,
            detail="Incorrect admin username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": payload.username, "role": "admin"})
    return AdminLoginResponse(
        access_token=token,
        token_type="bearer",
        username=payload.username,
        role="admin",
    )


@router.get("/me", response_model=AdminUserResponse)
def get_admin_profile(current_admin: dict = Depends(get_current_admin)):
    return AdminUserResponse(username=current_admin["username"], role=current_admin["role"])


@router.get("/inquiries", response_model=List[InquiryResponse])
def list_admin_inquiries(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    return db.query(Inquiry).order_by(Inquiry.created_at.desc()).all()


@router.post("/knowledge/ingest")
def trigger_knowledge_ingestion(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    from app.agent.ingestion import ingest_profile_data

    try:
        return ingest_profile_data(db=db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Knowledge ingestion failed") from exc


@router.get("/appointments", response_model=List[AppointmentResponse])
def list_admin_appointments(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    return db.query(Appointment).order_by(Appointment.created_at.desc()).all()


@router.patch("/appointments/{appointment_id}", response_model=AppointmentResponse)
def update_appointment_status(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail=f"Appointment #{appointment_id} not found")
    appointment.status = payload.status.lower()
    db.commit()
    db.refresh(appointment)
    return appointment


# Job Hunter endpoints. These use the existing Job/Proposal models and schemas;
# they intentionally do not depend on the expanded, currently unused migration fields.
@router.get("/jobs", response_model=List[JobResponse])
def list_admin_jobs(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    return db.query(Job).order_by(Job.created_at.desc(), Job.id.desc()).all()


@router.get("/proposals", response_model=List[ProposalResponse])
def list_admin_proposals(
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    return db.query(Proposal).order_by(Proposal.generated_at.desc(), Proposal.id.desc()).all()


@router.post("/jobs/paste", response_model=JobPasteResponse, status_code=status.HTTP_201_CREATED)
def paste_admin_job(
    payload: JobPasteRequest,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    from app.admin.connectors.manual import process_pasted_job

    try:
        job, proposal = process_pasted_job(
            db=db,
            platform=payload.platform.strip(),
            title=payload.title.strip(),
            description=payload.description.strip(),
            url=str(payload.url).strip() if payload.url else None,
            budget=payload.budget.strip() if payload.budget else None,
        )
        return {"job": job, "proposal": proposal}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not save the pasted job and proposal") from exc


@router.patch("/proposals/{proposal_id}", response_model=ProposalResponse)
def update_admin_proposal(
    proposal_id: int,
    payload: ProposalUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail=f"Proposal #{proposal_id} not found")
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one proposal field to update")
    if "edited_text" in changes:
        proposal.edited_text = changes["edited_text"]
    if "status" in changes:
        allowed_statuses = {"draft", "submitted", "accepted", "rejected"}
        if changes["status"] not in allowed_statuses:
            raise HTTPException(status_code=422, detail="Invalid proposal status")
        proposal.status = changes["status"]
    db.commit()
    db.refresh(proposal)
    return proposal


@router.patch("/jobs/{job_id}/status", response_model=JobResponse)
def update_admin_job_status(
    job_id: int,
    payload: JobStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    allowed_statuses = {"new", "applied", "rejected", "hired"}
    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid job status. Allowed values: {', '.join(sorted(allowed_statuses))}",
        )
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job #{job_id} not found")
    job.status = payload.status
    if payload.status == "applied":
        for proposal in job.proposals:
            proposal.status = "submitted"
    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/search-now", response_model=JobSearchResponse)
def search_admin_jobs(
    payload: JobSearchRequest,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    keywords = [item.strip() for item in (payload.keywords or []) if item and item.strip()]
    if not keywords:
        raise HTTPException(status_code=422, detail="Provide at least one non-empty search keyword")
    if len(keywords) > 20:
        raise HTTPException(status_code=422, detail="A maximum of 20 search keywords is allowed")
    from app.admin.orchestrator import JobDiscoveryOrchestrator

    try:
        summary = JobDiscoveryOrchestrator().run_discovery(db, keywords=keywords)
        return {"summary": summary}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail="Job discovery could not be completed") from exc


@router.get("/jobs/agent/status")
def get_job_agent_status(current_admin: dict = Depends(get_current_admin)):
    from app.admin.job_scheduler import scheduler_status

    return scheduler_status()


@router.post("/jobs/agent/start")
def start_job_agent(current_admin: dict = Depends(get_current_admin)):
    from app.admin.job_scheduler import start_scheduler, scheduler_status

    try:
        # Explicit authenticated start action is allowed even when auto-start is
        # disabled for deployment safety.
        start_scheduler(force=True)
        return scheduler_status()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Job Hunter scheduler could not start") from exc


@router.post("/jobs/agent/stop")
def stop_job_agent(current_admin: dict = Depends(get_current_admin)):
    from app.admin.job_scheduler import stop_scheduler, scheduler_status

    try:
        stop_scheduler()
        return scheduler_status()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Job Hunter scheduler could not stop") from exc

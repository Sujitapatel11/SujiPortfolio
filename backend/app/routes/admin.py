from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Inquiry, Job, Proposal
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
    ProposalCreate,
    ProposalUpdate,
    ProposalResponse,
)
from app.admin.auth import (
    ADMIN_USERNAME,
    ADMIN_PASSWORD_HASH,
    verify_password,
    create_access_token,
    get_current_admin,
)
from app.admin.orchestrator import JobDiscoveryOrchestrator
from app.admin.connectors.manual import process_pasted_job


router = APIRouter(prefix="/admin", tags=["admin"])

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

@router.post("/jobs/search-now", response_model=JobSearchResponse)
def trigger_job_search(
    payload: Optional[JobSearchRequest] = None,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Trigger multi-platform automated job discovery, deduplication, scoring, and proposal drafting.
    """
    keywords = payload.keywords if payload and payload.keywords else ["python", "fastapi", "react", "ai"]
    orchestrator = JobDiscoveryOrchestrator()
    summary = orchestrator.run_discovery(db=db, keywords=keywords)
    return JobSearchResponse(summary=summary)

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
            budget=payload.budget
        )
        return JobPasteResponse(job=db_job, proposal=proposal)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process manual job paste: {str(e)}"
        )

@router.patch("/proposals/{proposal_id}", response_model=ProposalResponse)
def update_proposal(
    proposal_id: int,
    payload: ProposalUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Update edited_text and/or status for a proposal draft.
    """
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal #{proposal_id} not found"
        )
    
    if payload.edited_text is not None:
        proposal.edited_text = payload.edited_text
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
    Update job status (e.g. new, applied, rejected, hired).
    - If status is 'applied', sets linked proposal status to 'submitted'.
    - If status is 'rejected' (Skip action), leaves proposal status as 'draft'.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job #{job_id} not found"
        )
    
    new_status = payload.status.lower()
    job.status = new_status

    # Synchronize linked proposal status if applicable
    linked_proposal = db.query(Proposal).filter(Proposal.job_id == job_id).first()
    if linked_proposal:
        if new_status in ["applied", "submitted"]:
            linked_proposal.status = "submitted"
        elif new_status == "hired":
            linked_proposal.status = "accepted"
        # If new_status == "rejected" (Skip action), leave proposal status as-is ("draft")

    db.commit()
    db.refresh(job)
    return job



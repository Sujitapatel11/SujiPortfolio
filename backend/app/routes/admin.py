from typing import List
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
    ProposalCreate,
    ProposalResponse,
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

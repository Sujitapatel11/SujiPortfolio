"""Admin authentication and portfolio client-management endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Inquiry, Appointment
from app.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminUserResponse,
    InquiryResponse,
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

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest):
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
    """Refresh profile knowledge used by Ask Suji."""
    from app.agent.ingestion import ingest_profile_data

    try:
        return ingest_profile_data(db=db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Knowledge ingestion failed: {str(exc)}",
        )


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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment #{appointment_id} not found",
        )
    appointment.status = payload.status.lower()
    db.commit()
    db.refresh(appointment)
    return appointment

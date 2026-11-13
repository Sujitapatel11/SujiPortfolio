import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from twilio.rest import Client
from app.database import get_db
from app.models import Inquiry
from app.schemas import InquiryCreate, InquiryResponse
from app.admin.auth import get_current_admin
from app.config import (
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM,
    ADMIN_WHATSAPP_NUMBER,
)

logger = logging.getLogger("sujis_world.inquiries")
router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


def _notify_admin_on_whatsapp(inquiry: Inquiry) -> None:
    """Send a best-effort WhatsApp notification; never undo a saved inquiry."""
    if not all((TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, ADMIN_WHATSAPP_NUMBER)):
        logger.info("WhatsApp notification skipped: Twilio environment variables are not fully configured.")
        return

    body = (
        "New portfolio inquiry\n"
        f"Name: {inquiry.name}\n"
        f"Email: {inquiry.email}\n"
        f"Project: {inquiry.project_type}\n"
        f"Budget: {inquiry.budget or 'Not specified'}\n"
        f"Message: {inquiry.message}\n"
        f"Inquiry ID: {inquiry.id}"
    )
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        recipient = ADMIN_WHATSAPP_NUMBER
        if not recipient.startswith("whatsapp:"):
            recipient = f"whatsapp:{recipient}"
        client.messages.create(
            from_=TWILIO_WHATSAPP_FROM,
            to=recipient,
            body=body,
        )
    except Exception:
        logger.exception("Inquiry %s was saved, but WhatsApp notification failed.", inquiry.id)


@router.post("", response_model=InquiryResponse, status_code=status.HTTP_201_CREATED)
def create_inquiry(inquiry_in: InquiryCreate, db: Session = Depends(get_db)):
    """Validate and persist a portfolio inquiry, then notify the owner if configured."""
    db_inquiry = Inquiry(
        name=inquiry_in.name,
        email=inquiry_in.email,
        project_type=inquiry_in.project_type,
        budget=inquiry_in.budget,
        message=inquiry_in.message,
        source=inquiry_in.source or "form",
    )
    try:
        db.add(db_inquiry)
        db.commit()
        db.refresh(db_inquiry)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to persist portfolio inquiry.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't save your inquiry right now. Please try WhatsApp instead.",
        )

    _notify_admin_on_whatsapp(db_inquiry)
    return db_inquiry


@router.get("", response_model=List[InquiryResponse])
def list_inquiries(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Retrieve submitted inquiries."""
    inquiries = (
        db.query(Inquiry)
        .order_by(Inquiry.created_at.desc())
        .offset(skip)
        .limit(min(limit, 100))
        .all()
    )
    return inquiries


@router.get("/{inquiry_id}", response_model=InquiryResponse)
def get_inquiry(inquiry_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    """Retrieve a specific inquiry by ID."""
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inquiry with ID {inquiry_id} not found.",
        )
    return inquiry

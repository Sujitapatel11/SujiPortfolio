import logging
import smtplib
from email.message import EmailMessage
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from twilio.rest import Client
from app.database import get_db
from app.models import Inquiry
from app.schemas import InquiryCreate, InquiryResponse
from app.admin.auth import get_current_admin
from app.config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, ADMIN_WHATSAPP_NUMBER, SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, INQUIRY_NOTIFICATION_EMAIL

logger = logging.getLogger("sujis_world.inquiries")
router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


def _email_admin_on_inquiry(inquiry: Inquiry) -> bool:
    if not all((SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, INQUIRY_NOTIFICATION_EMAIL)):
        logger.warning("Inquiry %s saved; email skipped because SMTP settings are incomplete.", inquiry.id)
        return False
    message = EmailMessage()
    message["Subject"] = f"New portfolio inquiry: {inquiry.project_type} — {inquiry.name}"
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = INQUIRY_NOTIFICATION_EMAIL
    message["Reply-To"] = inquiry.email
    message.set_content(
        "A new inquiry was submitted through your portfolio.\n\n"
        f"Name: {inquiry.name}\nEmail: {inquiry.email}\n"
        f"Project type: {inquiry.project_type}\nBudget: {inquiry.budget or 'Not specified'}\n\n"
        f"Message:\n{inquiry.message}\nInquiry ID: {inquiry.id}\n"
    )
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
        logger.info("Inquiry %s email notification sent.", inquiry.id)
        return True
    except Exception:
        logger.exception("Inquiry %s was saved, but email notification failed.", inquiry.id)
        return False


def _notify_admin_on_whatsapp(inquiry: Inquiry) -> None:
    if not all((TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, ADMIN_WHATSAPP_NUMBER)):
        logger.info("WhatsApp notification skipped: Twilio environment variables are incomplete.")
        return
    body = ("New portfolio inquiry\n" f"Name: {inquiry.name}\nEmail: {inquiry.email}\n"
            f"Project: {inquiry.project_type}\nBudget: {inquiry.budget or 'Not specified'}\n"
            f"Message: {inquiry.message}\nInquiry ID: {inquiry.id}")
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        recipient = ADMIN_WHATSAPP_NUMBER
        if not recipient.startswith("whatsapp:"):
            recipient = "whatsapp:" + recipient
        client.messages.create(from_=TWILIO_WHATSAPP_FROM, to=recipient, body=body)
    except Exception:
        logger.exception("Inquiry %s was saved, but WhatsApp notification failed.", inquiry.id)


@router.post("", response_model=InquiryResponse, status_code=status.HTTP_201_CREATED)
def create_inquiry(inquiry_in: InquiryCreate, db: Session = Depends(get_db)):
    db_inquiry = Inquiry(
        name=inquiry_in.name, email=inquiry_in.email, project_type=inquiry_in.project_type,
        budget=inquiry_in.budget, message=inquiry_in.message, source=inquiry_in.source or "form",
    )
    try:
        db.add(db_inquiry)
        db.commit()
        db.refresh(db_inquiry)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to persist portfolio inquiry.")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't save your inquiry right now. Please try WhatsApp instead.")
    email_sent = _email_admin_on_inquiry(db_inquiry)
    _notify_admin_on_whatsapp(db_inquiry)
    response = InquiryResponse.model_validate(db_inquiry)
    response.email_notification_sent = email_sent
    return response


@router.get("", response_model=List[InquiryResponse])
def list_inquiries(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    return db.query(Inquiry).order_by(Inquiry.created_at.desc()).offset(skip).limit(min(limit, 100)).all()


@router.get("/{inquiry_id}", response_model=InquiryResponse)
def get_inquiry(inquiry_id: int, db: Session = Depends(get_db), current_admin: dict = Depends(get_current_admin)):
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inquiry with ID {inquiry_id} not found.")
    return inquiry

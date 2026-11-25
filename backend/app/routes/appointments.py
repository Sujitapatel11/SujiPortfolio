"""Public consultation-request endpoint; requests remain pending until the owner confirms."""
import hashlib
import logging
import secrets
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Appointment
from app.schemas import AppointmentCreate
from app.admin.whatsapp import send_whatsapp_notification, ADMIN_DASHBOARD_URL

logger = logging.getLogger("sujis_world.appointments")
router = APIRouter(prefix="/api/appointments", tags=["appointments"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_appointment_request(
    payload: AppointmentCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
):
    raw_key = (idempotency_key or secrets.token_urlsafe(32)).strip()
    if not 8 <= len(raw_key) <= 128:
        raise HTTPException(status_code=422, detail="Idempotency-Key must be between 8 and 128 characters.")
    key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    existing = db.query(Appointment).filter(Appointment.idempotency_key == key).first()
    if existing:
        return {
            "id": existing.id,
            "status": existing.status,
            "preferred_time": existing.preferred_time,
            "owner_notification_sent": existing.owner_notification_sent,
            "duplicate": True,
            "message": "This request was already saved. No duplicate request or notification was created.",
        }

    appointment = Appointment(
        name=payload.name,
        email=str(payload.email),
        preferred_time=payload.preferred_time,
        purpose=payload.purpose,
        status="pending",
        idempotency_key=key,
    )
    try:
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
    except SQLAlchemyError as exc:
        db.rollback()
        # A concurrent retry may have won the unique-key race.
        existing = db.query(Appointment).filter(Appointment.idempotency_key == key).first()
        if existing:
            return {
                "id": existing.id,
                "status": existing.status,
                "preferred_time": existing.preferred_time,
                "owner_notification_sent": existing.owner_notification_sent,
                "duplicate": True,
                "message": "This request was already saved. No duplicate request or notification was created.",
            }
        logger.exception("Failed to save consultation request.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The consultation request could not be saved. Please retry.",
        ) from exc

    notification_sent = send_whatsapp_notification(
        f"New consultation request #{appointment.id} from {appointment.name} ({appointment.email})\n"
        f"Preferred time: {appointment.preferred_time or 'Not specified'}\n"
        f"Purpose: {appointment.purpose or 'Not specified'}\n"
        f"Review: {ADMIN_DASHBOARD_URL}/appointments"
    )
    appointment.owner_notification_sent = notification_sent
    db.commit()
    return {
        "id": appointment.id,
        "status": appointment.status,
        "preferred_time": appointment.preferred_time,
        "owner_notification_sent": notification_sent,
        "duplicate": False,
        "message": (
            "Request saved and awaiting owner confirmation. The WhatsApp provider accepted the notification request; delivery is not verified."
            if notification_sent
            else "Request saved, but the WhatsApp notification request was not accepted. Delivery is not verified; the request is still pending."
        ),
    }

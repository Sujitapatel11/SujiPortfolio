"""Public consultation-request endpoint; requests remain pending until the owner confirms."""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Appointment
from app.schemas import AppointmentCreate
from app.admin.whatsapp import send_whatsapp_notification, ADMIN_DASHBOARD_URL

logger = logging.getLogger("sujis_world.appointments")
router = APIRouter(prefix="/api/appointments", tags=["appointments"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_appointment_request(payload: AppointmentCreate, db: Session = Depends(get_db)):
    appointment = Appointment(
        name=payload.name,
        email=str(payload.email),
        preferred_time=payload.preferred_time,
        purpose=payload.purpose,
        status="pending",
    )
    try:
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Failed to save consultation request.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The consultation request could not be saved. Please retry.",
        ) from exc

    notification_sent = send_whatsapp_notification(
        f"New consultation request #{appointment.id} from {appointment.name} ({appointment.email})\\n"
        f"Preferred time: {appointment.preferred_time or 'Not specified'}\\n"
        f"Purpose: {appointment.purpose or 'Not specified'}\\n"
        f"Review: {ADMIN_DASHBOARD_URL}/appointments"
    )
    return {
        "id": appointment.id,
        "status": appointment.status,
        "preferred_time": appointment.preferred_time,
        "owner_notification_sent": notification_sent,
        "message": (
            "Request saved and awaiting owner confirmation."
            if notification_sent
            else "Request saved, but owner notification could not be confirmed. The request is still pending."
        ),
    }

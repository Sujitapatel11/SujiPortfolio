import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.database import get_db
from app.models import Inquiry
from app.schemas import InquiryCreate, InquiryResponse

logger = logging.getLogger("sujis_world.inquiries")
router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


@router.post("", response_model=InquiryResponse, status_code=status.HTTP_201_CREATED)
def create_inquiry(inquiry_in: InquiryCreate, db: Session = Depends(get_db)):
    """Validate and persist a portfolio inquiry."""
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
            detail="We couldn't save your inquiry right now. Please try again later.",
        )
    return db_inquiry


@router.get("", response_model=List[InquiryResponse])
def list_inquiries(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve submitted inquiries."""
    return (
        db.query(Inquiry)
        .order_by(Inquiry.created_at.desc())
        .offset(skip)
        .limit(min(limit, 100))
        .all()
    )


@router.get("/{inquiry_id}", response_model=InquiryResponse)
def get_inquiry(inquiry_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific inquiry by ID."""
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inquiry with ID {inquiry_id} not found.",
        )
    return inquiry

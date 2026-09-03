from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Inquiry
from app.schemas import InquiryCreate, InquiryResponse

router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])

@router.post("", response_model=InquiryResponse, status_code=status.HTTP_201_CREATED)
def create_inquiry(inquiry_in: InquiryCreate, db: Session = Depends(get_db)):
    """
    Create a new client lead / inquiry from the portfolio site or AI chat agent.
    Validates input using Pydantic schema and persists to database.
    """
    db_inquiry = Inquiry(
        name=inquiry_in.name,
        email=inquiry_in.email,
        project_type=inquiry_in.project_type,
        budget=inquiry_in.budget,
        message=inquiry_in.message,
        source=inquiry_in.source or "form"
    )
    db.add(db_inquiry)
    db.commit()
    db.refresh(db_inquiry)
    return db_inquiry

@router.get("", response_model=List[InquiryResponse])
def list_inquiries(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """
    Retrieve list of submitted inquiries.
    """
    inquiries = (
        db.query(Inquiry)
        .order_by(Inquiry.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return inquiries

@router.get("/{inquiry_id}", response_model=InquiryResponse)
def get_inquiry(inquiry_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific inquiry by ID.
    """
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inquiry with ID {inquiry_id} not found."
        )
    return inquiry

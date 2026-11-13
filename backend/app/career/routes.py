from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.admin.auth import get_current_admin
from app.career.models import CareerProfile, CareerJob, CareerApplication
from app.career.schemas import CareerProfileUpdate, CareerProfileResponse, CareerJobCreate, CareerJobResponse, CareerApplicationUpdate

router = APIRouter(prefix="/api/v1/career", tags=["career-assistant"], dependencies=[Depends(get_current_admin)])

@router.get("/profile", response_model=CareerProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    row = db.query(CareerProfile).filter(CareerProfile.id == 1).first()
    return {"profile": row.profile_json, "updated_at": row.updated_at} if row else {"profile": {}, "updated_at": None}

@router.put("/profile", response_model=CareerProfileResponse)
def update_profile(payload: CareerProfileUpdate, db: Session = Depends(get_db)):
    row = db.query(CareerProfile).filter(CareerProfile.id == 1).first()
    if row is None:
        row = CareerProfile(id=1, profile_json=payload.profile)
        db.add(row)
    else:
        row.profile_json = payload.profile
    db.commit()
    db.refresh(row)
    return {"profile": row.profile_json, "updated_at": row.updated_at}

@router.get("/jobs", response_model=list[CareerJobResponse])
def list_jobs(
    country: str | None = None,
    work_mode: str | None = Query(default=None, pattern="^(remote|hybrid|onsite|unknown)$"),
    eligibility: str | None = Query(default=None, pattern="^(eligible|ineligible|unknown)$"),
    db: Session = Depends(get_db),
):
    query = db.query(CareerJob).filter(CareerJob.job_status != "removed")
    if country:
        query = query.filter(CareerJob.country.ilike(f"%{country}%"))
    if work_mode:
        query = query.filter(CareerJob.work_mode == work_mode)
    if eligibility:
        query = query.filter(CareerJob.applicant_eligibility == eligibility)
    return query.order_by(CareerJob.created_at.desc()).limit(200).all()

@router.post("/jobs", response_model=CareerJobResponse, status_code=status.HTTP_201_CREATED)
def add_job(payload: CareerJobCreate, db: Session = Depends(get_db)):
    job = CareerJob(**payload.model_dump(), job_status="unverified")
    db.add(job)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This source record already exists.")
    db.refresh(job)
    return job

@router.patch("/jobs/{job_id}/application", response_model=dict)
def update_application(job_id: int, payload: CareerApplicationUpdate, db: Session = Depends(get_db)):
    job = db.query(CareerJob).filter(CareerJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Career opportunity not found.")
    row = db.query(CareerApplication).filter(CareerApplication.job_id == job_id).first()
    if row is None:
        row = CareerApplication(job_id=job_id, status=payload.status, notes=payload.notes)
        db.add(row)
    else:
        row.status, row.notes = payload.status, payload.notes
    db.commit()
    db.refresh(row)
    return {"job_id": job_id, "status": row.status, "notes": row.notes, "updated_at": row.updated_at}

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.models import Job, Proposal, JobStatus
from app.admin.connectors.base import BaseConnector, NormalizedJob
from app.admin.connectors.helpers import normalize_salary
from app.admin.ai_matcher import evaluate_job_fit, generate_tailored_application

logger = logging.getLogger("sujis_world.connectors.manual")


class ManualPasteConnector(BaseConnector):
    """
    Connector for manual job paste submissions (e.g. Upwork, Fiverr, or direct client posts).
    Upwork and Fiverr restrict automated scraping/API access for individual developer accounts,
    so manual paste allows pasting raw job listings directly into the matching & drafting engine.
    """

    @property
    def platform_name(self) -> str:
        return "Manual Paste"

    def is_available(self) -> bool:
        return True

    def get_missing_credentials(self) -> list[str]:
        return []

    def fetch_jobs(self, query: list[str]) -> list[NormalizedJob]:
        return []


def process_pasted_job(
    db: Session,
    platform: str,
    title: str,
    description: str,
    url: Optional[str] = None,
    budget: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
) -> Tuple[Job, Proposal]:
    """
    Processes a manually pasted job listing:
    1. Generates unique external_id.
    2. Evaluates job fit using explainable criteria.
    3. Normalizes salary and canonical URL.
    4. Persists Job record.
    5. Prepares tailored proposal, cover letter, resume recommendations, and interview Qs.
    6. Persists Proposal record.
    """
    from app.admin.whatsapp import notify_job_match

    external_id = f"manual_{uuid.uuid4().hex[:10]}"
    min_sal, max_sal, curr = normalize_salary(budget)

    # Evaluate job fit
    fit_eval = evaluate_job_fit(
        job_title=title,
        job_description=description,
        job_location=location or "Remote",
        is_remote=True,
        salary_min=min_sal,
        target_keywords=["python", "fastapi", "react", "ai"],
    )

    db_job = Job(
        platform=platform,
        external_id=external_id,
        title=title,
        company=company or ("Direct Client" if "upwork" in platform.lower() or "fiverr" in platform.lower() else None),
        location=location or "Worldwide / Remote",
        is_remote=True,
        job_type="Freelance / Contract",
        description=description,
        url=url,
        canonical_url=url,
        budget=budget,
        salary_min=min_sal,
        salary_max=max_sal,
        salary_currency=curr,
        posted_at=datetime.now(timezone.utc),
        match_score=fit_eval["score"],
        match_explanation={
            "criteria_breakdown": fit_eval["criteria_breakdown"],
            "matching_skills": fit_eval["matching_skills"],
            "missing_skills": fit_eval["missing_skills"],
            "match_reason": fit_eval["match_reason"],
        },
        skills_gap={"analysis": fit_eval["skills_gap_analysis"]},
        status=JobStatus.MATCHED if fit_eval["score"] >= 0.70 else JobStatus.SAVED,
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    # Generate complete application assistance
    app_drafts = generate_tailored_application(db_job)
    proposal = Proposal(
        job_id=db_job.id,
        draft_text=app_drafts["proposal_draft"],
        cover_letter=app_drafts["cover_letter"],
        tailored_resume_suggestions=app_drafts["tailored_resume_suggestions"],
        interview_questions=app_drafts["interview_questions"],
        status="draft",
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    notify_job_match(db_job)
    logger.info(f"Successfully processed manual job paste (ID {db_job.id}, Score: {db_job.match_score})")
    return db_job, proposal

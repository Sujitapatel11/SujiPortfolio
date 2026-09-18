import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.models import Job, Proposal
from app.admin.connectors.base import BaseConnector, NormalizedJob
from app.admin.proposal_drafter import generate_proposal_draft

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

    def fetch_jobs(self, keywords: list[str]) -> list[NormalizedJob]:
        # Manual paste jobs are submitted via process_pasted_job rather than background search
        return []


def process_pasted_job(
    db: Session,
    platform: str,
    title: str,
    description: str,
    url: Optional[str] = None,
    budget: Optional[str] = None
) -> Tuple[Job, Proposal]:
    """
    Processes a manually pasted job listing:
    1. Generates a unique external_id (e.g. manual_<uuid>).
    2. Normalizes job data and scores relevance using JobDiscoveryOrchestrator matching engine.
    3. Saves job record to database (always saved since user explicitly chose to paste it).
    4. Drafts initial AI proposal using proposal_drafter module.
    5. Saves proposal record linked to job.
    Returns (db_job, proposal).
    """
    from app.admin.orchestrator import JobDiscoveryOrchestrator

    external_id = f"manual_{uuid.uuid4().hex[:10]}"
    norm_job = NormalizedJob(
        platform=platform,
        external_id=external_id,
        title=title,
        description=description,
        url=url,
        budget=budget,
        posted_at=datetime.now(timezone.utc)
    )

    orchestrator = JobDiscoveryOrchestrator()

    # Score job relevance using default keywords
    match_score = orchestrator.score_job(norm_job, keywords=["python", "fastapi", "react", "ai"])

    # Always persist manual paste submissions
    db_job = Job(
        platform=platform,
        external_id=external_id,
        title=title,
        description=description,
        url=url,
        budget=budget,
        posted_at=norm_job.posted_at,
        match_score=match_score,
        status="new"
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)

    # Draft custom proposal using existing proposal_drafter
    draft_text = generate_proposal_draft(db_job)
    proposal = Proposal(
        job_id=db_job.id,
        draft_text=draft_text,
        status="draft"
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    logger.info(f"Successfully processed manual job paste (ID {db_job.id}, Score: {match_score}) from platform {platform}")
    return db_job, proposal

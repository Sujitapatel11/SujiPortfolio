import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Job, Proposal
from app.admin.connectors.base import BaseConnector, NormalizedJob
from app.admin.connectors.freelancer import FreelancerConnector
from app.admin.proposal_drafter import generate_proposal_draft

logger = logging.getLogger("sujis_world.orchestrator")


class JobDiscoveryOrchestrator:
    """
    Multi-platform job discovery, deduplication, scoring, and proposal drafting orchestrator.
    Manages registered connectors and processes incoming job streams through a unified pipeline.
    """

    def __init__(self, connectors: Optional[List[BaseConnector]] = None):
        if connectors is not None:
            self.connectors: List[BaseConnector] = connectors
        else:
            # Default registration: Freelancer.com connector
            # Upwork/Fiverr can register additional instances later via register_connector()
            self.connectors = [FreelancerConnector()]

    def register_connector(self, connector: BaseConnector) -> None:
        """
        Register a new platform connector with the orchestrator.
        """
        self.connectors.append(connector)
        logger.info(f"Registered connector: {connector.platform_name}")

    def score_job(self, job: NormalizedJob, keywords: List[str]) -> float:
        """
        Compute job relevance score (0.0 to 1.0) based on keyword matching and title analysis.
        """
        if not keywords:
            return 0.85

        text_to_search = f"{job.title} {job.description or ''}".lower()
        matched_count = sum(1 for kw in keywords if kw.lower() in text_to_search)

        if matched_count == 0:
            return 0.40

        score = 0.60 + (matched_count / len(keywords)) * 0.40
        return min(round(score, 2), 1.0)

    def run_discovery(
        self, db: Session, keywords: Optional[List[str]] = None, score_threshold: float = 0.50
    ) -> Dict[str, Dict[str, Any]]:
        """
        Run job discovery across all available connectors.
        Deduplicates jobs against existing database entries by (platform, external_id),
        scores matching jobs, saves qualifying jobs, and drafts client proposals using proposal_drafter.py.

        Includes per-connector error isolation.
        """
        search_keywords = keywords or ["python", "fastapi", "react", "ai"]
        summary: Dict[str, Dict[str, Any]] = {}

        for connector in self.connectors:
            platform_name = connector.platform_name

            if not connector.is_available():
                logger.info(f"Connector '{platform_name}' is currently unavailable. Skipping.")
                continue

            fetched_count = 0
            matched_count = 0
            drafted_count = 0

            try:
                # 1. Fetch raw normalized jobs from platform
                normalized_jobs = connector.fetch_jobs(search_keywords)
                fetched_count = len(normalized_jobs)

                for norm_job in normalized_jobs:
                    # 2. Deduplicate against existing jobs in database (platform + external_id)
                    existing_job = db.query(Job).filter(
                        Job.platform == norm_job.platform,
                        Job.external_id == norm_job.external_id
                    ).first()

                    if existing_job:
                        logger.debug(f"Job {norm_job.external_id} from {platform_name} already exists. Skipping.")
                        continue

                    # 3. Score job relevance
                    match_score = self.score_job(norm_job, search_keywords)

                    # 4. Save job if score exceeds threshold
                    if match_score >= score_threshold:
                        db_job = Job(
                            platform=norm_job.platform,
                            external_id=norm_job.external_id,
                            title=norm_job.title,
                            description=norm_job.description,
                            url=norm_job.url,
                            budget=norm_job.budget,
                            posted_at=norm_job.posted_at,
                            match_score=match_score,
                            status="new"
                        )
                        db.add(db_job)
                        db.commit()
                        db.refresh(db_job)
                        matched_count += 1

                        # 5. Draft proposal reusing proposal_drafter module
                        draft_text = generate_proposal_draft(db_job)
                        proposal = Proposal(
                            job_id=db_job.id,
                            draft_text=draft_text,
                            status="draft"
                        )
                        db.add(proposal)
                        db.commit()
                        drafted_count += 1

                summary[platform_name] = {
                    "fetched": fetched_count,
                    "matched": matched_count,
                    "drafted": drafted_count
                }

            except Exception as e:
                # Per-connector error isolation: log failure and continue with other connectors
                logger.error(f"Error during job discovery for platform '{platform_name}': {e}", exc_info=True)
                summary[platform_name] = {
                    "fetched": 0,
                    "matched": 0,
                    "drafted": 0,
                    "error": str(e)
                }

        return summary

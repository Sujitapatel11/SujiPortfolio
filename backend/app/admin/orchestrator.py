import logging
import re
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Union
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models import Job, Proposal, JobStatus, SearchAuditLog, ProviderHealthRecord
from app.admin.connectors.base import BaseConnector, NormalizedJob, SearchQuery
from app.admin.connectors.freelancer import FreelancerConnector
from app.admin.connectors.search_provider import SearchProviderConnector
from app.admin.connectors.remotive import RemotiveConnector
from app.admin.connectors.adzuna import AdzunaConnector
from app.admin.connectors.jooble import JoobleConnector
from app.admin.connectors.usajobs import USAJobsConnector
from app.admin.nl_search_parser import parse_natural_language_query
from app.admin.ai_matcher import evaluate_job_fit, generate_tailored_application
from app.admin.whatsapp import notify_job_matches

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
            self.connectors = [
                FreelancerConnector(),
                RemotiveConnector(),
                SearchProviderConnector(),
                AdzunaConnector(),
                JoobleConnector(),
                USAJobsConnector(),
            ]

    def register_connector(self, connector: BaseConnector) -> None:
        """Register a new platform connector with the orchestrator."""
        self.connectors.append(connector)
        logger.info(f"Registered connector: {connector.platform_name}")

    def score_job(self, job: NormalizedJob, keywords: Optional[List[str]] = None) -> float:
        """Compute job relevance score (0.0 to 1.0) using explainable criteria."""
        res = evaluate_job_fit(
            job_title=job.title,
            job_description=job.description,
            job_location=job.location,
            is_remote=job.is_remote,
            salary_min=job.salary_min,
            target_keywords=keywords or ["python", "fastapi", "react", "ai"],
        )
        return res["score"]

    def get_providers_health(self, db: Optional[Session] = None) -> List[Dict[str, Any]]:
        """Return health and credential status for all connectors."""
        health_list = []
        for c in self.connectors:
            missing = c.get_missing_credentials()
            is_avail = c.is_available()

            record = None
            if db:
                try:
                    record = db.query(ProviderHealthRecord).filter(
                        ProviderHealthRecord.platform == c.platform_name
                    ).first()
                except Exception:
                    pass

            health_list.append({
                "platform": c.platform_name,
                "is_enabled": is_avail,
                "is_healthy": record.is_healthy if record else True,
                "missing_credentials": missing,
                "last_sync_at": record.last_sync_at.isoformat() if record and record.last_sync_at else None,
                "last_error": record.last_error if record else None,
            })
        return health_list

    def _sync_provider_health(
        self,
        db: Session,
        platform_name: str,
        is_healthy: bool,
        last_error: Optional[str] = None,
        missing: Optional[List[str]] = None,
    ) -> None:
        """Update or insert provider health tracking record in DB."""
        try:
            rec = db.query(ProviderHealthRecord).filter(
                ProviderHealthRecord.platform == platform_name
            ).first()
            now = datetime.now(timezone.utc)
            if not rec:
                rec = ProviderHealthRecord(
                    platform=platform_name,
                    is_enabled=not bool(missing),
                    is_healthy=is_healthy,
                    missing_credentials=missing or [],
                    last_sync_at=now if is_healthy else None,
                    last_error=last_error,
                    updated_at=now,
                )
                db.add(rec)
            else:
                rec.is_enabled = not bool(missing)
                rec.is_healthy = is_healthy
                rec.missing_credentials = missing or []
                if is_healthy:
                    rec.last_sync_at = now
                rec.last_error = last_error
                rec.updated_at = now
            db.commit()
        except Exception as e:
            logger.debug(f"Could not persist provider health record: {e}")
            db.rollback()

    def run_discovery(
        self,
        db: Session,
        keywords: Optional[Union[SearchQuery, str, List[str]]] = None,
        score_threshold: float = 0.50,
    ) -> Dict[str, Any]:
        """
        Run job discovery across all available connectors with deduplication,
        freshness validation, relevance scoring, and application assistance drafting.
        """
        # Parse query if natural language string or keywords list
        parsed_meta: Dict[str, Any] = {}
        if isinstance(keywords, str):
            res = parse_natural_language_query(keywords)
            search_query: SearchQuery = res["query"]
            parsed_meta = res
        elif isinstance(keywords, SearchQuery):
            search_query = keywords
        else:
            search_keywords = keywords if keywords else ["python", "fastapi", "react", "ai"]
            search_query = SearchQuery(keywords=search_keywords)

        summary: Dict[str, Any] = {}
        matched_jobs: List[Job] = []
        total_fetched = 0
        total_matched = 0

        # Freshness cutoff if specified
        freshness_cutoff = None
        if search_query.max_days_old:
            freshness_cutoff = datetime.now(timezone.utc) - timedelta(days=search_query.max_days_old)

        for connector in self.connectors:
            platform_name = connector.platform_name

            if not connector.is_available():
                missing = connector.get_missing_credentials()
                logger.info(f"Connector '{platform_name}' is disabled. Missing: {missing}")
                summary[platform_name] = {
                    "fetched": 0,
                    "matched": 0,
                    "drafted": 0,
                    "status": "disabled",
                    "missing_credentials": missing,
                }
                self._sync_provider_health(db, platform_name, is_healthy=True, missing=missing)
                continue

            fetched_count = 0
            matched_count = 0
            drafted_count = 0

            try:
                # 1. Fetch raw normalized jobs from platform
                normalized_jobs = connector.fetch_jobs(search_query)
                fetched_count = len(normalized_jobs)
                total_fetched += fetched_count

                for norm_job in normalized_jobs:
                    # 2. Freshness check
                    if freshness_cutoff and norm_job.posted_at and norm_job.posted_at < freshness_cutoff:
                        logger.debug(f"Job {norm_job.external_id} older than max_days_old. Skipping.")
                        continue

                    # 3. Deduplicate against existing jobs by (platform + external_id) OR canonical_url OR (title + company)
                    canon_url = norm_job.compute_canonical_url()
                    query_filters = [
                        (Job.platform == norm_job.platform) & (Job.external_id == norm_job.external_id)
                    ]
                    if canon_url:
                        query_filters.append(Job.canonical_url == canon_url)
                    if norm_job.company and norm_job.title:
                        query_filters.append(
                            (Job.title == norm_job.title) & (Job.company == norm_job.company)
                        )

                    existing_job = db.query(Job).filter(or_(*query_filters)).first()
                    if existing_job:
                        logger.debug(f"Job {norm_job.external_id} from {platform_name} already exists. Skipping.")
                        continue

                    # 4. Score job relevance & criteria breakdown
                    fit_eval = evaluate_job_fit(
                        job_title=norm_job.title,
                        job_description=norm_job.description,
                        job_location=norm_job.location,
                        is_remote=norm_job.is_remote,
                        salary_min=norm_job.salary_min,
                        target_salary_min=search_query.salary_min,
                        target_keywords=search_query.keywords,
                    )
                    match_score = fit_eval["score"]

                    # 5. Salary range filter check (if user requested minimum salary)
                    if search_query.salary_min and norm_job.salary_min:
                        if norm_job.salary_min < (search_query.salary_min * 0.75):
                            logger.debug(f"Job {norm_job.title} below target salary. Skipping.")
                            continue

                    # 6. Save job if score exceeds threshold
                    if match_score >= score_threshold:
                        initial_status = JobStatus.MATCHED if match_score >= 0.70 else JobStatus.DISCOVERED
                        db_job = Job(
                            platform=norm_job.platform,
                            external_id=norm_job.external_id,
                            title=norm_job.title,
                            company=norm_job.company,
                            location=norm_job.location,
                            is_remote=norm_job.is_remote,
                            job_type=norm_job.job_type,
                            description=norm_job.description,
                            url=norm_job.url,
                            canonical_url=canon_url,
                            budget=norm_job.budget,
                            salary_min=norm_job.salary_min,
                            salary_max=norm_job.salary_max,
                            salary_currency=norm_job.salary_currency,
                            posted_at=norm_job.posted_at,
                            match_score=match_score,
                            match_explanation={
                                "criteria_breakdown": fit_eval["criteria_breakdown"],
                                "matching_skills": fit_eval["matching_skills"],
                                "missing_skills": fit_eval["missing_skills"],
                                "match_reason": fit_eval["match_reason"],
                            },
                            skills_gap={"analysis": fit_eval["skills_gap_analysis"]},
                            raw_metadata=norm_job.raw_metadata,
                            status=initial_status,
                        )
                        db.add(db_job)
                        db.commit()
                        db.refresh(db_job)
                        matched_jobs.append(db_job)
                        matched_count += 1
                        total_matched += 1

                        # 7. Prepare tailored application drafts (proposal, cover letter, resume advice, interview Qs)
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
                        drafted_count += 1

                summary[platform_name] = {
                    "fetched": fetched_count,
                    "matched": matched_count,
                    "drafted": drafted_count,
                    "status": "connected",
                }
                self._sync_provider_health(db, platform_name, is_healthy=True)

            except Exception as e:
                logger.error(f"Error during job discovery for platform '{platform_name}': {e}", exc_info=True)
                summary[platform_name] = {
                    "fetched": 0,
                    "matched": 0,
                    "drafted": 0,
                    "status": "error",
                    "error": str(e),
                }
                self._sync_provider_health(db, platform_name, is_healthy=False, last_error=str(e))

        # Record search audit log
        try:
            audit = SearchAuditLog(
                query_text=search_query.raw_query or " ".join(search_query.keywords),
                parsed_filters=parsed_meta.get("parsed_filters") or search_query.model_dump(),
                provider_summaries=summary,
                total_found=total_fetched,
                total_matched=total_matched,
            )
            db.add(audit)
            db.commit()
        except Exception as e:
            logger.debug(f"Could not persist search audit log: {e}")
            db.rollback()

        if matched_jobs:
            notify_job_matches(matched_jobs)

        summary["_total_fetched"] = total_fetched
        summary["_total_matched"] = total_matched
        summary["_parsed_filters"] = parsed_meta.get("parsed_filters")
        summary["_unsupported_explanations"] = parsed_meta.get("unsupported_explanations", [])
        return summary

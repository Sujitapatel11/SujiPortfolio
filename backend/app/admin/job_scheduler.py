import logging
import os
from datetime import datetime, timezone, timedelta
from threading import RLock
from typing import Optional, List, Dict, Any
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.database import SessionLocal
from app.admin.orchestrator import JobDiscoveryOrchestrator
from app.config import (
    JOB_HUNTER_SCHEDULER_ENABLED,
    JOB_HUNTER_INTERVAL_HOURS,
    JOB_SEARCH_LOCATION,
    ADZUNA_APP_ID,
    JOOBLE_API_KEY,
    SERPAPI_API_KEY,
    USAJOBS_API_KEY,
)

logger = logging.getLogger("sujis_world.job_scheduler")
lock = RLock()
scheduler = BackgroundScheduler(timezone="UTC")

_last_run = None
_last_summary = None
_last_error = None
_configured_interval_hours = JOB_HUNTER_INTERVAL_HOURS


def _acquire_distributed_lock(db) -> bool:
    """
    Prevent duplicate scheduler execution across multi-process workers (e.g. Gunicorn/Uvicorn multi-workers).
    Uses database row update timestamp lock.
    """
    from app.models import ProviderHealthRecord
    now = datetime.now(timezone.utc)
    lock_key = "__scheduler_leader_lock__"

    try:
        rec = db.query(ProviderHealthRecord).filter(
            ProviderHealthRecord.platform == lock_key
        ).first()

        if not rec:
            rec = ProviderHealthRecord(
                platform=lock_key,
                is_enabled=True,
                is_healthy=True,
                last_sync_at=now,
                last_error=None,
                updated_at=now,
            )
            db.add(rec)
            db.commit()
            return True

        # Check if previous lock expired (> 15 minutes old considered stale)
        if rec.updated_at and (now - rec.updated_at) < timedelta(minutes=15):
            logger.info("Another scheduler instance or worker is currently running. Skipping execution.")
            return False

        rec.updated_at = now
        db.commit()
        return True
    except Exception as e:
        logger.warning(f"Could not verify distributed scheduler lock ({e}). Proceeding with in-process lock.")
        return True


def scheduled_discovery():
    """Background discovery task running on scheduled interval."""
    global _last_run, _last_summary, _last_error
    db = SessionLocal()
    try:
        if not _acquire_distributed_lock(db):
            return

        orchestrator = JobDiscoveryOrchestrator()
        default_keywords = ["python", "fastapi", "django", "react", "typescript", "ai", "engineer"]
        res = orchestrator.run_discovery(db, default_keywords, score_threshold=0.55)
        _last_summary = res.get("summary")
        _last_run = datetime.now(timezone.utc).isoformat()
        _last_error = None
        logger.info("Scheduled job discovery completed successfully.")
    except Exception as exc:
        _last_error = str(exc)
        logger.exception("Job Hunter scheduled discovery encountered an error")
    finally:
        db.close()


def start_scheduler(force: bool = False, interval_hours: Optional[int] = None):
    """Start the background scheduler if enabled or forced by admin."""
    global _configured_interval_hours
    if not force and not JOB_HUNTER_SCHEDULER_ENABLED:
        logger.info("Job Hunter background scheduler is disabled (JOB_HUNTER_SCHEDULER_ENABLED=false).")
        return

    with lock:
        if interval_hours:
            _configured_interval_hours = max(1, interval_hours)
        if not scheduler.running:
            scheduler.add_job(
                scheduled_discovery,
                IntervalTrigger(hours=_configured_interval_hours),
                id="job-hunter",
                replace_existing=True,
                max_instances=1,
                coalesce=True,
                misfire_grace_time=900,
            )
            scheduler.start()
            logger.info(f"Job Hunter background scheduler started with {_configured_interval_hours}h interval.")


def stop_scheduler():
    """Stop the background scheduler."""
    with lock:
        if scheduler.running:
            scheduler.shutdown(wait=False)
            logger.info("Job Hunter background scheduler stopped.")


def set_interval(hours: int):
    """Update scheduled scan frequency."""
    global _configured_interval_hours
    _configured_interval_hours = max(1, hours)
    if scheduler.running:
        scheduler.reschedule_job(
            "job-hunter",
            trigger=IntervalTrigger(hours=_configured_interval_hours)
        )
        logger.info(f"Job Hunter scan interval updated to {_configured_interval_hours} hours.")


def scheduler_status(db: Optional[SessionLocal] = None):
    """Return comprehensive scheduler and provider status."""
    job = scheduler.get_job("job-hunter") if scheduler.running else None
    orchestrator = JobDiscoveryOrchestrator()
    providers_health = orchestrator.get_providers_health(db=db)

    return {
        "enabled": scheduler.running,
        "configured": JOB_HUNTER_SCHEDULER_ENABLED,
        "interval_hours": _configured_interval_hours,
        "next_run_at": job.next_run_time.isoformat() if job and job.next_run_time else None,
        "last_run_at": _last_run,
        "last_summary": _last_summary,
        "last_error": _last_error,
        "providers_health": providers_health,
        "providers": {
            "freelancer_com": True,
            "remotive": True,
            "adzuna": bool(ADZUNA_APP_ID),
            "jooble": bool(JOOBLE_API_KEY),
            "google_jobs": bool(SERPAPI_API_KEY),
            "usajobs": bool(USAJOBS_API_KEY),
        },
        "note": "Scheduled searches run autonomously. Applications are NEVER submitted automatically.",
    }

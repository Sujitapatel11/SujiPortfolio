import logging, os
from datetime import datetime, timezone
from threading import RLock
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.database import SessionLocal
from app.admin.orchestrator import JobDiscoveryOrchestrator

logger = logging.getLogger("sujis_world.job_scheduler")
lock = RLock()
scheduler = BackgroundScheduler(timezone="UTC")
last_run = None
last_summary = None
last_error = None

def scheduled_discovery():
    global last_run, last_summary, last_error
    db = SessionLocal()
    try:
        last_summary = JobDiscoveryOrchestrator().run_discovery(db, ["python","fastapi","django","react","typescript","machine learning","AI engineer"], 0.5)
        last_run = datetime.now(timezone.utc).isoformat()
        last_error = None
    except Exception as exc:
        last_error = str(exc)
        logger.exception("Job Hunter scheduled discovery failed")
    finally:
        db.close()

def start_scheduler(force=False):
    if not force and os.getenv("JOB_HUNTER_SCHEDULER_ENABLED","false").lower() != "true":
        return
    with lock:
        if not scheduler.running:
            hours = max(1, int(os.getenv("JOB_HUNTER_INTERVAL_HOURS","6")))
            scheduler.add_job(scheduled_discovery, IntervalTrigger(hours=hours), id="job-hunter", replace_existing=True, max_instances=1, coalesce=True, misfire_grace_time=900)
            scheduler.start()

def stop_scheduler():
    with lock:
        if scheduler.running: scheduler.shutdown(wait=False)

def scheduler_status():
    job = scheduler.get_job("job-hunter")
    return {"enabled":scheduler.running,"configured":os.getenv("JOB_HUNTER_SCHEDULER_ENABLED","false").lower()=="true","interval_hours":max(1,int(os.getenv("JOB_HUNTER_INTERVAL_HOURS","6"))),"next_run_at":job.next_run_time.isoformat() if job and job.next_run_time else None,"last_run_at":last_run,"last_summary":last_summary,"last_error":last_error,"providers":{"freelancer_com":True,"google_jobs_search":bool(os.getenv("SERPAPI_API_KEY","").strip()),"direct_linkedin_api":False,"direct_upwork_api":False,"direct_fiverr_api":False},"note":"Google Jobs may surface listings from LinkedIn and other boards. Direct platform APIs are not connected."}

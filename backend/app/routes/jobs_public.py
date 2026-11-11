"""Public, read-only remote job discovery. No owner login is required."""
import logging
import re
import time
from collections import defaultdict, deque
from typing import List
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.admin.connectors.himalayas import HimalayasRemoteConnector
from app.admin.connectors.free_remote import JobicyRemoteConnector

logger = logging.getLogger("sujis_world.public_jobs")
router = APIRouter(prefix="/api/jobs", tags=["public jobs"])

# Lightweight per-process abuse guard; use shared Redis limiting in multi-worker production.
_REQUESTS = defaultdict(deque)
WINDOW_SECONDS = 60
MAX_REQUESTS = 6


class PublicJobSearchRequest(BaseModel):
    keywords: List[str] = Field(default_factory=lambda: ["python", "backend", "fastapi", "react", "javascript"], max_length=8)


def _score(title: str, description: str, keywords: List[str]) -> float:
    text = f"{title or ''} {description or ''}".lower()
    title_text = (title or "").lower()
    matches = 0
    title_matches = 0
    for keyword in dict.fromkeys(k.strip().lower() for k in keywords if k and k.strip()):
        pattern = r"(?<!\w)" + r"\s+".join(re.escape(part) for part in keyword.split()) + r"(?!\w)"
        if re.search(pattern, text):
            matches += 1
            if re.search(pattern, title_text):
                title_matches += 1
    if not keywords:
        return 0.85
    if not matches:
        return 0.0
    return min(round(0.55 + (matches / len(keywords)) * 0.35 + min(title_matches * 0.08, 0.20), 2), 1.0)


def perform_public_search(keywords: List[str]):
    """Search free global-remote sources and return ranked, read-only listings."""
    keywords = [k.strip() for k in keywords if k and k.strip()][:8]
    if not keywords:
        keywords = ["python", "backend", "fastapi", "react", "javascript"]

    jobs = []
    sources = []
    errors = []
    for connector in [HimalayasRemoteConnector(), JobicyRemoteConnector()]:
        try:
            found = connector.fetch_jobs(keywords)
            sources.append({"source": connector.platform_name, "fetched": len(found)})
            for job in found:
                score = _score(job.title, job.description or "", keywords)
                if score < 0.50:
                    continue
                jobs.append({
                    "title": job.title,
                    "company": (job.raw_metadata or {}).get("company"),
                    "source": job.platform,
                    "url": job.url,
                    "salary": job.budget,
                    "posted_at": job.posted_at.isoformat() if job.posted_at else None,
                    "match_score": score,
                    "description": (job.description or "")[:500],
                })
        except Exception as exc:
            logger.warning("Public job source %s failed: %s", connector.platform_name, exc)
            errors.append({"source": connector.platform_name, "error": "Source temporarily unavailable"})

    unique = {}
    for job in jobs:
        unique.setdefault(job["url"], job)
    ranked = sorted(unique.values(), key=lambda item: (item["match_score"], item["posted_at"] or ""), reverse=True)[:20]
    return {"region": "global_remote", "count": len(ranked), "jobs": ranked, "sources": sources, "warnings": errors}


@router.post("/search")
def search_public_remote_jobs(payload: PublicJobSearchRequest, request: Request):
    """Search free global-remote sources without exposing admin data or actions."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _REQUESTS[client_ip]
    while bucket and now - bucket[0] > WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many searches. Please wait a minute and try again.")
    bucket.append(now)
    return perform_public_search(payload.keywords)

"""Public job discovery API. Uses free public feeds and preserves original listing URLs.

Coverage is source-dependent: Arbeitnow provides a general job feed; Remotive,
Jobicy and Himalayas provide remote-focused feeds. Unknown listing attributes
are never guessed.
"""
import logging
import re
import time
from collections import defaultdict, deque
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.admin.connectors.himalayas import HimalayasRemoteConnector
from app.admin.connectors.free_remote import (
    JobicyRemoteConnector,
    RemotiveRemoteConnector,
    ArbeitnowRemoteConnector,
)

logger = logging.getLogger("sujis_world.public_jobs")
router = APIRouter(prefix="/api/jobs", tags=["public jobs"])

_REQUESTS = defaultdict(deque)
WINDOW_SECONDS = 60
MAX_REQUESTS = 6

class PublicJobSearchRequest(BaseModel):
    keywords: List[str] = Field(default_factory=lambda: ["software engineer"], max_length=8)
    work_mode: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    category: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=50)


def _score(title: str, description: str, keywords: List[str]) -> float:
    searchable = f"{title or ''} {description or ''}".lower()
    title_text = (title or "").lower()
    terms = list(dict.fromkeys(k.strip().lower() for k in keywords if k and k.strip()))
    if not terms:
        return 0.70
    matches = [term for term in terms if term in searchable]
    if not matches:
        return 0.0
    title_matches = sum(term in title_text for term in matches)
    return min(round(0.55 + (len(matches) / len(terms)) * 0.35 + min(title_matches * 0.08, 0.20), 2), 1.0)


def _classify_mode(job) -> Optional[str]:
    meta = job.raw_metadata or {}
    if meta.get("remote") is True or meta.get("remote_scope"):
        return "remote"
    text = " ".join(str(meta.get(k) or "") for k in ("work_mode", "location", "candidate_required_location")).lower()
    if "hybrid" in text:
        return "hybrid"
    if "remote" in text or "work from home" in text or "work from anywhere" in text:
        return "remote"
    if meta.get("remote") is False and meta.get("location"):
        return "on-site"
    return None


def _matches_filter(value: str, candidates: list) -> bool:
    if not value:
        return True
    haystack = " ".join(str(v) for v in candidates if v is not None).lower()
    return value.lower() in haystack


def perform_public_search(
    keywords: List[str],
    work_mode: Optional[str] = None,
    location: Optional[str] = None,
    employment_type: Optional[str] = None,
    experience_level: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20,
):
    keywords = [k.strip() for k in (keywords or []) if k and k.strip()][:8]
    query_terms = list(dict.fromkeys(keywords + ([category] if category else [])))
    connectors = [
        ArbeitnowRemoteConnector(),
        HimalayasRemoteConnector(),
        JobicyRemoteConnector(),
        RemotiveRemoteConnector(),
    ]
    jobs, sources, warnings = [], [], []
    for connector in connectors:
        try:
            found = connector.fetch_jobs(query_terms or ["software engineer"])
            sources.append({"source": connector.platform_name, "fetched": len(found)})
            for job in found:
                meta = job.raw_metadata or {}
                mode = _classify_mode(job)
                description = job.description or ""
                searchable = f"{job.title} {description} {' '.join(str(v) for v in meta.values())}".lower()
                score = _score(job.title, searchable, query_terms)
                if query_terms and score < 0.50:
                    continue
                if work_mode and mode and mode != work_mode.lower():
                    continue
                if work_mode and not mode:
                    continue
                if location and not _matches_filter(location, [meta.get("location"), meta.get("candidate_required_location"), meta.get("location_restrictions"), meta.get("timezone_restrictions"), description[:300]]):
                    continue
                if employment_type and not _matches_filter(employment_type, [meta.get("employment_type"), meta.get("job_type"), description[:500]]):
                    continue
                if experience_level and not _matches_filter(experience_level, [meta.get("seniority"), meta.get("job_level"), description[:500]]):
                    continue
                jobs.append({
                    "title": job.title,
                    "company": meta.get("company"),
                    "source": job.platform,
                    "url": job.url,
                    "salary": job.budget,
                    "location": meta.get("location") or meta.get("candidate_required_location") or ("Worldwide" if mode == "remote" else None),
                    "work_mode": mode or "not specified by source",
                    "employment_type": meta.get("employment_type") or meta.get("job_type"),
                    "experience_level": meta.get("seniority") or meta.get("job_level"),
                    "posted_at": job.posted_at.isoformat() if job.posted_at else None,
                    "match_score": score,
                    "description": description[:700],
                })
        except Exception as exc:
            logger.warning("Public job source %s failed: %s", connector.platform_name, exc)
            warnings.append({"source": connector.platform_name, "error": "Source temporarily unavailable"})

    unique = {}
    for job in jobs:
        url = job.get("url")
        if url and urlparse(url).scheme in {"http", "https"}:
            unique.setdefault(url.rstrip("/"), job)
    ranked = sorted(unique.values(), key=lambda item: (item["match_score"], item["posted_at"] or ""), reverse=True)[:limit]
    return {
        "count": len(ranked), "jobs": ranked, "sources": sources, "warnings": warnings,
        "filters": {"keywords": keywords, "work_mode": work_mode, "location": location, "employment_type": employment_type, "experience_level": experience_level, "category": category},
        "coverage_note": "Results depend on free public feeds. Some sources do not publish location, work mode, salary or experience metadata; unknown values are shown as unspecified, not guessed.",
    }



class ResumeMatchRequest(BaseModel):
    resume_text: str = Field(..., min_length=80, max_length=20000)
    work_mode: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=50)


_SKILL_TERMS = [
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "react", "angular", "vue", "node.js", "express", "django", "fastapi",
    "flask", "spring", "html", "css", "tailwind", "sql", "postgresql",
    "mysql", "mongodb", "redis", "firebase", "aws", "azure", "gcp",
    "docker", "kubernetes", "terraform", "linux", "git", "github",
    "machine learning", "deep learning", "tensorflow", "pytorch",
    "scikit-learn", "pandas", "numpy", "data analysis", "power bi",
    "tableau", "rest api", "graphql", "microservices", "ci/cd",
    "cybersecurity", "testing", "playwright", "selenium", "figma",
    "project management", "communication", "agile",
]


def _extract_skills(text: str) -> list:
    normalized = text.lower()
    found = []
    for skill in _SKILL_TERMS:
        pattern = r"(?<![a-z0-9])" + re.escape(skill.lower()) + r"(?![a-z0-9])"
        if re.search(pattern, normalized):
            found.append(skill)
    return found


@router.post("/match-resume")
def match_resume_to_jobs(payload: ResumeMatchRequest, request: Request):
    """Match a pasted resume against public job listings without storing the resume."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _REQUESTS[client_ip]
    while bucket and now - bucket[0] > WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many searches. Please wait a minute and try again.")
    bucket.append(now)

    skills = _extract_skills(payload.resume_text)
    if not skills:
        raise HTTPException(status_code=422, detail="No recognizable skills found. Paste the resume's skills and experience section.")
    results = perform_public_search(
        skills[:8], work_mode=payload.work_mode, location=payload.location,
        employment_type=payload.employment_type, limit=payload.limit,
    )
    ranked = []
    for job in results["jobs"]:
        searchable = f"{job.get('title') or ''} {job.get('description') or ''}".lower()
        matched = [skill for skill in skills if skill in searchable]
        missing = [skill for skill in skills if skill not in searchable]
        ratio = len(matched) / max(len(skills), 1)
        job["resume_match_score"] = round(ratio * 100)
        job["matched_skills"] = matched[:12]
        job["potential_skill_gaps"] = missing[:8]
        ranked.append(job)
    ranked.sort(key=lambda item: (item["resume_match_score"], item["match_score"]), reverse=True)
    return {
        "resume_skills_detected": skills,
        "count": len(ranked),
        "jobs": ranked,
        "sources": results["sources"],
        "warnings": results["warnings"],
        "privacy": "Resume text is processed for this request only and is not saved by this endpoint. Extracted search terms are sent to public job feeds; the full resume is not sent to those feeds.",
        "limitations": "This is transparent keyword overlap, not semantic AI evaluation. A missing keyword does not prove a candidate lacks that skill.",
    }

@router.post("/search")
def search_public_jobs(payload: PublicJobSearchRequest, request: Request):
    """Public job search; no owner login or private admin data is exposed."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _REQUESTS[client_ip]
    while bucket and now - bucket[0] > WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many searches. Please wait a minute and try again.")
    bucket.append(now)
    return perform_public_search(
        payload.keywords, payload.work_mode, payload.location,
        payload.employment_type, payload.experience_level, payload.category, payload.limit,
    )

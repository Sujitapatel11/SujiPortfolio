"""Free, keyless public job-board connectors for global remote roles.

Every returned listing retains its source URL and source name. Remotive's API
terms require attribution and a link to the original Remotive listing.
"""
import hashlib
import logging
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.admin.connectors.base import BaseConnector, NormalizedJob

logger = logging.getLogger("sujis_world.connectors.free_remote")


def _get_json(url: str, timeout: int = 20) -> Any:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "SujiPortfolio-JobHunter/1.0 (remote job discovery)",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return __import__("json").loads(response.read().decode("utf-8"))


def _parse_date(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value, tz=timezone.utc)
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return None


def _identity(source: str, external_id: Any, title: str, company: str, url: str) -> str:
    raw = str(external_id or f"{source}|{title}|{company}|{url}")
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


class JobicyRemoteConnector(BaseConnector):
    """Jobicy public API: no key; query the anywhere/global remote feed."""

    @property
    def platform_name(self) -> str:
        return "Jobicy"

    def is_available(self) -> bool:
        return True

    def fetch_jobs(self, keywords: List[str]) -> List[NormalizedJob]:
        jobs: List[NormalizedJob] = []
        for keyword in (keywords or ["software engineer"])[:4]:
            params = urllib.parse.urlencode({"count": 50, "geo": "anywhere", "tag": keyword})
            payload = _get_json(f"https://jobicy.com/api/jobs?{params}")
            for item in payload.get("jobs", []) if isinstance(payload, dict) else []:
                title = (item.get("jobTitle") or item.get("title") or "").strip()
                company = (item.get("companyName") or item.get("company") or "").strip()
                url = item.get("url") or item.get("jobUrl") or ""
                if not title or not url:
                    continue
                description = item.get("jobDescription") or item.get("jobExcerpt") or item.get("description") or ""
                jobs.append(NormalizedJob(
                    platform="Jobicy",
                    external_id=_identity("Jobicy", item.get("id"), title, company, url),
                    title=title,
                    description=(f"Company: {company}\n\n{description}" if company else description),
                    url=url,
                    budget=item.get("salary") or (str(item.get("salaryCurrency") or "") + " " + str(item.get("salaryMin") or "") + "–" + str(item.get("salaryMax") or "") + " " + str(item.get("salaryPeriod") or "")).strip() if (item.get("salaryMin") or item.get("salaryMax")) else None,
                    posted_at=_parse_date(item.get("pubDate") or item.get("publishedAt")),
                    raw_metadata={"company": company, "source": "Jobicy", "remote_scope": item.get("jobGeo"), "job_type": item.get("jobType"), "job_level": item.get("jobLevel") },
                ))
        return jobs


class RemotiveRemoteConnector(BaseConnector):
    """Remotive public API; listings are delayed and must be attributed."""

    @property
    def platform_name(self) -> str:
        return "Remotive"

    def is_available(self) -> bool:
        return True

    def fetch_jobs(self, keywords: List[str]) -> List[NormalizedJob]:
        search = " ".join((keywords or ["software engineer"])[:4])
        params = urllib.parse.urlencode({"search": search, "limit": 50})
        payload = _get_json(f"https://remotive.com/api/remote-jobs?{params}")
        jobs: List[NormalizedJob] = []
        for item in payload.get("jobs", []) if isinstance(payload, dict) else []:
            title = (item.get("title") or "").strip()
            company = (item.get("company_name") or "").strip()
            url = item.get("url") or ""
            if not title or not url:
                continue
            description = item.get("description") or ""
            attribution = "\n\nSource: Remotive (public API; listings may be delayed)."
            jobs.append(NormalizedJob(
                platform="Remotive",
                external_id=_identity("Remotive", item.get("id"), title, company, url),
                title=title,
                description=(f"Company: {company}\n\n{description}{attribution}" if company else description + attribution),
                url=url,
                budget=item.get("salary") or None,
                posted_at=_parse_date(item.get("publication_date")),
                raw_metadata={"company": company, "source": "Remotive", "candidate_required_location": item.get("candidate_required_location")},
            ))
        return jobs


class ArbeitnowRemoteConnector(BaseConnector):
    """Arbeitnow public feed, filtered to postings explicitly marked remote."""

    @property
    def platform_name(self) -> str:
        return "Arbeitnow (remote)"

    def is_available(self) -> bool:
        return True

    def fetch_jobs(self, keywords: List[str]) -> List[NormalizedJob]:
        payload = _get_json("https://www.arbeitnow.com/api/job-board-api?page=1")
        items = payload.get("data", []) if isinstance(payload, dict) else []
        terms = [term.lower() for term in (keywords or []) if term.strip()]
        jobs: List[NormalizedJob] = []
        for item in items:
            if not item.get("remote"):
                continue
            title = (item.get("title") or "").strip()
            company = (item.get("company_name") or "").strip()
            url = item.get("url") or ""
            if not title or not url:
                continue
            description = item.get("description") or ""
            searchable = f"{title} {description} {' '.join(item.get('tags') or [])}".lower()
            if terms and not any(term in searchable for term in terms):
                continue
            jobs.append(NormalizedJob(
                platform="Arbeitnow (remote)",
                external_id=_identity("Arbeitnow", item.get("slug"), title, company, url),
                title=title,
                description=(f"Company: {company}\n\n{description}" if company else description),
                url=url,
                posted_at=_parse_date(item.get("created_at")),
                raw_metadata={"company": company, "source": "Arbeitnow", "location": item.get("location"), "tags": item.get("tags") or []},
            ))
        return jobs

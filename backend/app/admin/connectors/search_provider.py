import hashlib
import json
import logging
import urllib.parse
import urllib.request
from typing import List, Union, Optional
from app.config import SERPAPI_API_KEY
from app.admin.connectors.base import BaseConnector, NormalizedJob, SearchQuery
from app.admin.connectors.helpers import normalize_salary, parse_relative_date, resolve_country_code

logger = logging.getLogger("sujis_world.connectors.search")


class SearchProviderConnector(BaseConnector):
    """
    Google Jobs search through SerpAPI.
    Aggregates job listings across Google Jobs indexed sources (LinkedIn, Glassdoor, ZipRecruiter, etc.).
    Requires SERPAPI_API_KEY.
    """

    def __init__(self):
        self.api_key = SERPAPI_API_KEY

    @property
    def platform_name(self) -> str:
        return "Google Jobs"

    def is_available(self) -> bool:
        return bool(self.api_key)

    def get_missing_credentials(self) -> List[str]:
        return ["SERPAPI_API_KEY"] if not self.api_key else []

    def fetch_jobs(self, query: Union[SearchQuery, List[str], str, None] = None, keywords: Optional[List[str]] = None) -> List[NormalizedJob]:
        if not self.is_available():
            logger.debug("Google Jobs (SerpApi) connector disabled due to missing SERPAPI_API_KEY.")
            return []

        target = query if query is not None else keywords
        sq = SearchQuery.from_input(target)
        keywords_str = " ".join(sq.keywords) if sq.keywords else "Python FastAPI AI engineer"
        query_text = f"{keywords_str} {sq.location or ''}".strip()
        country = sq.country_code or resolve_country_code(sq.location)

        params = {
            "engine": "google_jobs",
            "q": query_text,
            "api_key": self.api_key,
            "gl": country,
        }
        if sq.location:
            params["location"] = sq.location

        url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
        jobs: List[NormalizedJob] = []

        try:
            request = urllib.request.Request(
                url,
                headers={"Accept": "application/json", "User-Agent": "SujiJobHunter/1.0"}
            )
            with urllib.request.urlopen(request, timeout=18) as response:
                payload = json.loads(response.read().decode("utf-8"))

            for item in payload.get("jobs_results", []):
                title = (item.get("title") or "").strip()
                links = item.get("related_links") or []
                item_url = item.get("share_link") or (links[0].get("link") if links else None)
                if not title or not item_url:
                    continue

                source = item.get("via") or "Google Jobs"
                company = item.get("company_name") or ""
                loc = item.get("location") or sq.location or ""
                description = item.get("description") or ""

                detected_ext = item.get("detected_extensions") or {}
                salary_raw = detected_ext.get("salary")
                posted_raw = detected_ext.get("posted_at")
                schedule_type = detected_ext.get("schedule_type", "Full-time")

                min_sal, max_sal, curr = normalize_salary(salary_raw)
                posted_dt = parse_relative_date(posted_raw)

                external_id = item.get("job_id") or hashlib.sha256(
                    f"{source}|{title}|{company}|{item_url}".encode()
                ).hexdigest()[:24]

                is_remote = bool(
                    sq.is_remote
                    or "remote" in title.lower()
                    or "remote" in loc.lower()
                    or "work from home" in description.lower()
                )

                norm_job = NormalizedJob(
                    platform=f"Google Jobs · {source}",
                    external_id=str(external_id),
                    title=title,
                    company=company,
                    location=loc,
                    is_remote=is_remote,
                    job_type=schedule_type,
                    description=f"Company: {company}\n\n{description}" if company else description,
                    url=item_url,
                    canonical_url=item_url,
                    budget=salary_raw,
                    salary_min=min_sal,
                    salary_max=max_sal,
                    salary_currency=curr,
                    posted_at=posted_dt,
                    raw_metadata={"company": company, "via": source, "extensions": detected_ext}
                )
                jobs.append(norm_job)

            logger.info("Google Jobs returned %d listings", len(jobs))
            return jobs
        except Exception as e:
            logger.warning(f"Google Jobs (SerpApi) query error: {e}")

        return jobs

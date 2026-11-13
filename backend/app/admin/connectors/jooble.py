import logging
import json
import urllib.request
from typing import List, Union, Optional
from app.config import JOOBLE_API_KEY
from app.admin.connectors.base import BaseConnector, NormalizedJob, SearchQuery
from app.admin.connectors.helpers import normalize_salary, parse_relative_date

logger = logging.getLogger("sujis_world.connectors.jooble")


class JoobleConnector(BaseConnector):
    """
    Jooble Job Search API Connector.
    Official API docs: https://jooble.org/api/about
    Requires JOOBLE_API_KEY.
    """

    def __init__(self):
        self.api_key = JOOBLE_API_KEY

    @property
    def platform_name(self) -> str:
        return "Jooble"

    def is_available(self) -> bool:
        return bool(self.api_key)

    def get_missing_credentials(self) -> List[str]:
        return ["JOOBLE_API_KEY"] if not self.api_key else []

    def fetch_jobs(self, query: Union[SearchQuery, List[str], str, None] = None, keywords: Optional[List[str]] = None) -> List[NormalizedJob]:
        if not self.is_available():
            logger.debug("Jooble connector disabled due to missing JOOBLE_API_KEY.")
            return []

        target = query if query is not None else keywords
        sq = SearchQuery.from_input(target)
        keywords_str = " ".join(sq.keywords) if sq.keywords else "python"
        location_str = sq.location or ("Remote" if sq.is_remote else "")

        payload = {
            "keywords": keywords_str,
            "location": location_str,
            "page": 1,
        }
        if sq.salary_min:
            payload["salary"] = int(sq.salary_min)

        url = f"https://jooble.org/api/{self.api_key}"
        jobs: List[NormalizedJob] = []

        try:
            body_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=body_bytes,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "SujiJobHunter/1.0",
                    "Accept": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    results = data.get("jobs", [])
                    for item in results:
                        job_id = str(item.get("id"))
                        title = item.get("title", "").strip()
                        company = item.get("company", "").strip()
                        loc = item.get("location", "").strip()
                        snippet = item.get("snippet", "")
                        salary_raw = item.get("salary", "")
                        source = item.get("source", "Jooble")
                        job_type = item.get("type", "full-time")
                        link = item.get("link", "")
                        updated = item.get("updated")

                        min_sal, max_sal, curr = normalize_salary(salary_raw)
                        is_remote = bool(sq.is_remote or "remote" in title.lower() or "remote" in snippet.lower() or "remote" in loc.lower())

                        norm_job = NormalizedJob(
                            platform=self.platform_name,
                            external_id=job_id,
                            title=title,
                            company=company,
                            location=loc,
                            is_remote=is_remote,
                            job_type=job_type,
                            description=snippet,
                            url=link,
                            canonical_url=link,
                            budget=salary_raw or None,
                            salary_min=min_sal,
                            salary_max=max_sal,
                            salary_currency=curr,
                            posted_at=parse_relative_date(updated),
                            raw_metadata={"source": source}
                        )
                        jobs.append(norm_job)

                    logger.info("Jooble API returned %d jobs", len(jobs))
                    return jobs
        except Exception as e:
            logger.warning(f"Jooble API query error: {e}")

        return jobs

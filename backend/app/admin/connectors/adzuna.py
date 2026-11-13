import logging
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import List, Union, Optional
from app.config import ADZUNA_APP_ID, ADZUNA_APP_KEY
from app.admin.connectors.base import BaseConnector, NormalizedJob, SearchQuery
from app.admin.connectors.helpers import resolve_country_code, parse_relative_date

logger = logging.getLogger("sujis_world.connectors.adzuna")


class AdzunaConnector(BaseConnector):
    """
    Adzuna Job Search API Connector.
    Official API docs: https://developer.adzuna.com/
    Requires ADZUNA_APP_ID and ADZUNA_APP_KEY.
    """

    def __init__(self):
        self.app_id = ADZUNA_APP_ID
        self.app_key = ADZUNA_APP_KEY

    @property
    def platform_name(self) -> str:
        return "Adzuna"

    def is_available(self) -> bool:
        return bool(self.app_id and self.app_key)

    def get_missing_credentials(self) -> List[str]:
        missing = []
        if not self.app_id:
            missing.append("ADZUNA_APP_ID")
        if not self.app_key:
            missing.append("ADZUNA_APP_KEY")
        return missing

    def fetch_jobs(self, query: Union[SearchQuery, List[str], str, None] = None, keywords: Optional[List[str]] = None) -> List[NormalizedJob]:
        if not self.is_available():
            logger.debug("Adzuna connector disabled due to missing credentials.")
            return []

        target = query if query is not None else keywords
        sq = SearchQuery.from_input(target)
        country = sq.country_code or resolve_country_code(sq.location)
        query_str = " ".join(sq.keywords) if sq.keywords else "python"

        params = {
            "app_id": self.app_id,
            "app_key": self.app_key,
            "what": query_str,
            "results_per_page": str(min(sq.limit, 25)),
            "content-type": "application/json",
        }

        if sq.location:
            params["where"] = sq.location
        if sq.salary_min:
            params["salary_min"] = str(int(sq.salary_min))
        if sq.max_days_old:
            params["max_days_old"] = str(sq.max_days_old)

        url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1?{urllib.parse.urlencode(params)}"
        jobs: List[NormalizedJob] = []

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "SujiJobHunter/1.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    results = data.get("results", [])
                    for item in results:
                        job_id = str(item.get("id"))
                        title = item.get("title", "").strip()
                        company = (item.get("company") or {}).get("display_name", "")
                        loc_name = (item.get("location") or {}).get("display_name", "")
                        desc = item.get("description", "")
                        redirect_url = item.get("redirect_url", "")
                        salary_min = item.get("salary_min")
                        salary_max = item.get("salary_max")
                        created = item.get("created")

                        curr = "EUR" if country in ("de", "fr", "nl", "it", "es") else ("GBP" if country == "gb" else "USD")

                        budget_str = None
                        if salary_min and salary_max:
                            budget_str = f"{curr} {salary_min:,.0f} - {salary_max:,.0f}"
                        elif salary_min:
                            budget_str = f"{curr} {salary_min:,.0f}+"

                        is_remote = bool(sq.is_remote or "remote" in title.lower() or "remote" in desc.lower() or "remote" in loc_name.lower())

                        norm_job = NormalizedJob(
                            platform=self.platform_name,
                            external_id=job_id,
                            title=title,
                            company=company,
                            location=loc_name,
                            is_remote=is_remote,
                            job_type=(item.get("contract_time") or "full-time").replace("_", "-"),
                            description=desc,
                            url=redirect_url,
                            canonical_url=redirect_url,
                            budget=budget_str,
                            salary_min=float(salary_min) if salary_min is not None else None,
                            salary_max=float(salary_max) if salary_max is not None else None,
                            salary_currency=curr,
                            posted_at=parse_relative_date(created),
                            raw_metadata={"category": (item.get("category") or {}).get("label")}
                        )
                        jobs.append(norm_job)

                    logger.info("Adzuna API returned %d listings", len(jobs))
                    return jobs
        except Exception as e:
            logger.warning(f"Adzuna API query error: {e}")

        return jobs

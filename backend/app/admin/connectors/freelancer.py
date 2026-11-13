import logging
import urllib.request
import urllib.parse
import json
from datetime import datetime, timezone
from typing import List, Union, Optional
from app.admin.connectors.base import BaseConnector, NormalizedJob, SearchQuery
from app.admin.connectors.helpers import normalize_salary, parse_relative_date

logger = logging.getLogger("sujis_world.connectors.freelancer")


class FreelancerConnector(BaseConnector):
    """
    Freelancer.com job connector implementation.
    Fetches active projects matching target keywords via Freelancer REST API.
    Uses free public endpoints.
    """

    @property
    def platform_name(self) -> str:
        return "Freelancer.com"

    def is_available(self) -> bool:
        return True

    def get_missing_credentials(self) -> List[str]:
        return []

    def fetch_jobs(self, query: Union[SearchQuery, List[str], str, None] = None, keywords: Optional[List[str]] = None) -> List[NormalizedJob]:
        """
        Fetch active projects from Freelancer.com matching keywords.
        """
        target = query if query is not None else keywords
        sq = SearchQuery.from_input(target)
        jobs: List[NormalizedJob] = []
        query_str = " ".join(sq.keywords) if sq.keywords else "python fastapi react"

        url = f"https://www.freelancer.com/api/projects/0.1/projects/active/?query={urllib.parse.quote(query_str)}&limit={min(sq.limit, 15)}"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "SujiPortfolioApp/1.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    result = data.get("result", {})
                    projects = result.get("projects", [])

                    for p in projects:
                        project_id = str(p.get("id"))
                        title = p.get("title", "").strip()
                        description = p.get("preview_description", p.get("description", ""))
                        seo_url = p.get("seo_url", project_id)
                        project_url = f"https://www.freelancer.com/projects/{seo_url}"

                        # Parse budget
                        budget_info = p.get("budget", {})
                        min_b = budget_info.get("minimum")
                        max_b = budget_info.get("maximum")
                        currency = budget_info.get("currency", {}).get("code", "USD")
                        budget_str = None
                        if min_b and max_b:
                            budget_str = f"{currency} {min_b} - {max_b}"
                        elif min_b:
                            budget_str = f"From {currency} {min_b}"

                        # Parse posted timestamp
                        submit_date = p.get("submitdate")
                        posted_at = None
                        if submit_date:
                            try:
                                posted_at = datetime.fromtimestamp(submit_date, tz=timezone.utc)
                            except Exception:
                                posted_at = datetime.now(timezone.utc)

                        min_sal = float(min_b) if min_b is not None else None
                        max_sal = float(max_b) if max_b is not None else None

                        norm_job = NormalizedJob(
                            platform=self.platform_name,
                            external_id=project_id,
                            title=title,
                            company="Freelance Client",
                            location="Worldwide / Remote",
                            is_remote=True,
                            job_type="Freelance / Contract",
                            description=description,
                            url=project_url,
                            canonical_url=project_url,
                            budget=budget_str,
                            salary_min=min_sal,
                            salary_max=max_sal,
                            salary_currency=currency,
                            posted_at=posted_at,
                            raw_metadata={"type": p.get("type"), "status": p.get("status")}
                        )
                        jobs.append(norm_job)

                    logger.info(f"Fetched {len(jobs)} active jobs from Freelancer.com API")
                    return jobs
        except Exception as e:
            logger.warning(f"Could not fetch from live Freelancer API ({e}).")

        return jobs

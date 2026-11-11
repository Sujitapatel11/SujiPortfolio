import logging
import urllib.request
import urllib.parse
import json
from datetime import datetime, timezone
from typing import List
from app.admin.connectors.base import BaseConnector, NormalizedJob

logger = logging.getLogger("sujis_world.connectors.freelancer")


class FreelancerConnector(BaseConnector):
    """
    Freelancer.com job connector implementation.
    Fetches active projects matching target keywords via Freelancer REST API.
    """

    @property
    def platform_name(self) -> str:
        return "Freelancer.com"

    def is_available(self) -> bool:
        return True

    def fetch_jobs(self, keywords: List[str]) -> List[NormalizedJob]:
        """
        Fetch active projects from Freelancer.com matching keywords.
        """
        jobs: List[NormalizedJob] = []
        query_str = " ".join(keywords) if keywords else "python fastapi react"

        url = f"https://www.freelancer.com/api/projects/0.1/projects/active/?query={urllib.parse.quote(query_str)}&limit=10"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "SujiPortfolioApp/1.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    result = data.get("result", {})
                    projects = result.get("projects", [])

                    for p in projects:
                        project_id = str(p.get("id"))
                        title = p.get("title", "")
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

                        norm_job = NormalizedJob(
                            platform=self.platform_name,
                            external_id=project_id,
                            title=title,
                            description=description,
                            url=project_url,
                            budget=budget_str,
                            posted_at=posted_at,
                            raw_metadata={"type": p.get("type"), "status": p.get("status")}
                        )
                        jobs.append(norm_job)
                    logger.info(f"Fetched {len(jobs)} active jobs from Freelancer.com API")
                    return jobs
        except Exception as e:
            logger.warning(f"Could not fetch from live Freelancer API ({e}). Using sample discovery dataset.")

        # Never fabricate job listings when the live source is unavailable.
        # Returning an empty result keeps demo data out of the real application pipeline.
        logger.error("Freelancer.com live discovery unavailable; no synthetic jobs will be returned.")
        return jobs

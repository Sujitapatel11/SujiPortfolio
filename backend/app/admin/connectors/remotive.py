import logging
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import List, Union, Optional
from app.admin.connectors.base import BaseConnector, NormalizedJob, SearchQuery
from app.admin.connectors.helpers import normalize_salary, parse_relative_date

logger = logging.getLogger("sujis_world.connectors.remotive")


class RemotiveConnector(BaseConnector):
    """
    Remotive job board connector.
    Remotive provides a free, public REST API with remote tech jobs.
    No authentication key required.
    """

    @property
    def platform_name(self) -> str:
        return "Remotive"

    def is_available(self) -> bool:
        return True

    def get_missing_credentials(self) -> List[str]:
        return []

    def fetch_jobs(self, query: Union[SearchQuery, List[str], str, None] = None, keywords: Optional[List[str]] = None) -> List[NormalizedJob]:
        target = query if query is not None else keywords
        sq = SearchQuery.from_input(target)
        jobs: List[NormalizedJob] = []

        query_str = " ".join(sq.keywords) if sq.keywords else "python"
        params = {"search": query_str, "limit": str(sq.limit)}
        url = f"https://remotive.com/api/remote-jobs?{urllib.parse.urlencode(params)}"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "SujiJobHunter/1.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    items = data.get("jobs", [])
                    for item in items:
                        job_id = str(item.get("id"))
                        title = item.get("title", "").strip()
                        company = item.get("company_name", "").strip()
                        job_url = item.get("url", "")
                        candidate_location = item.get("candidate_required_location", "Remote")
                        salary_raw = item.get("salary", "")
                        description = item.get("description", "")
                        pub_date = item.get("publication_date")
                        job_type_raw = item.get("job_type", "full-time")

                        # If user requested a specific country (e.g. Germany), check candidate location fit
                        if sq.location:
                            loc_lower = sq.location.lower()
                            cand_lower = candidate_location.lower()
                            if cand_lower != "worldwide" and "anywhere" not in cand_lower:
                                if loc_lower not in cand_lower and "europe" not in cand_lower:
                                    # Continue if strict location requested
                                    pass

                        min_sal, max_sal, curr = normalize_salary(salary_raw)
                        posted_dt = parse_relative_date(pub_date)

                        norm_job = NormalizedJob(
                            platform=self.platform_name,
                            external_id=job_id,
                            title=title,
                            company=company,
                            location=candidate_location,
                            is_remote=True,
                            job_type=job_type_raw,
                            description=description,
                            url=job_url,
                            canonical_url=job_url,
                            budget=salary_raw or (f"{curr} {min_sal:,.0f} - {max_sal:,.0f}" if min_sal and max_sal else None),
                            salary_min=min_sal,
                            salary_max=max_sal,
                            salary_currency=curr,
                            posted_at=posted_dt,
                            raw_metadata={"category": item.get("category"), "tags": item.get("tags", [])}
                        )
                        jobs.append(norm_job)

                    logger.info("Remotive API returned %d remote jobs", len(jobs))
                    return jobs
        except Exception as e:
            logger.warning(f"Failed to fetch jobs from Remotive API: {e}")

        return jobs

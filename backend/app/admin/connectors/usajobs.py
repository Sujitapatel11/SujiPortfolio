import logging
import json
import urllib.request
import urllib.parse
from typing import List, Union, Optional
from app.config import USAJOBS_API_KEY, USAJOBS_USER_AGENT
from app.admin.connectors.base import BaseConnector, NormalizedJob, SearchQuery
from app.admin.connectors.helpers import parse_relative_date

logger = logging.getLogger("sujis_world.connectors.usajobs")


class USAJobsConnector(BaseConnector):
    """
    USAJOBS API Connector.
    Official API docs: https://developer.usajobs.gov/
    Requires USAJOBS_API_KEY and USAJOBS_USER_AGENT.
    """

    def __init__(self):
        self.api_key = USAJOBS_API_KEY
        self.user_agent = USAJOBS_USER_AGENT

    @property
    def platform_name(self) -> str:
        return "USAJOBS"

    def is_available(self) -> bool:
        return bool(self.api_key and self.user_agent)

    def get_missing_credentials(self) -> List[str]:
        missing = []
        if not self.api_key:
            missing.append("USAJOBS_API_KEY")
        if not self.user_agent:
            missing.append("USAJOBS_USER_AGENT")
        return missing

    def fetch_jobs(self, query: Union[SearchQuery, List[str], str, None] = None, keywords: Optional[List[str]] = None) -> List[NormalizedJob]:
        if not self.is_available():
            logger.debug("USAJOBS connector disabled due to missing credentials.")
            return []

        target = query if query is not None else keywords
        sq = SearchQuery.from_input(target)
        keywords_str = " ".join(sq.keywords) if sq.keywords else "software engineer"

        params = {
            "Keyword": keywords_str,
            "ResultsPerPage": str(min(sq.limit, 25)),
        }
        if sq.location:
            params["LocationName"] = sq.location
        if sq.is_remote:
            params["Remotely"] = "true"

        url = f"https://data.usajobs.gov/api/search?{urllib.parse.urlencode(params)}"
        jobs: List[NormalizedJob] = []

        try:
            req = urllib.request.Request(
                url,
                headers={
                    "Host": "data.usajobs.gov",
                    "User-Agent": self.user_agent,
                    "Authorization-Key": self.api_key,
                    "Accept": "application/json"
                }
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    items = (data.get("SearchResult") or {}).get("SearchResultItems", [])
                    for item in items:
                        desc_dict = item.get("MatchedObjectDescriptor", {})
                        job_id = str(desc_dict.get("MatchedObjectId") or item.get("MatchedObjectId"))
                        title = desc_dict.get("PositionTitle", "").strip()
                        dept = desc_dict.get("DepartmentName", "")
                        org = desc_dict.get("OrganizationName", dept)
                        uri = desc_dict.get("PositionURI", "")

                        # Remuneration / salary
                        remun = desc_dict.get("PositionRemuneration", [])
                        min_sal = None
                        max_sal = None
                        if remun and isinstance(remun, list):
                            first_rem = remun[0]
                            try:
                                min_sal = float(first_rem.get("MinimumRange", 0))
                                max_sal = float(first_rem.get("MaximumRange", 0))
                            except (ValueError, TypeError):
                                pass

                        budget_str = f"USD {min_sal:,.0f} - {max_sal:,.0f}" if min_sal and max_sal else None

                        # Locations
                        locations = desc_dict.get("PositionLocation", [])
                        loc_str = locations[0].get("LocationName", "USA") if locations else "USA"

                        # Details
                        user_area = desc_dict.get("UserArea", {})
                        details = user_area.get("Details", {})
                        summary_text = details.get("JobSummary", "")
                        pub_date = desc_dict.get("PublicationStartDate")

                        norm_job = NormalizedJob(
                            platform=self.platform_name,
                            external_id=job_id,
                            title=title,
                            company=org,
                            location=loc_str,
                            is_remote=bool(sq.is_remote or "remote" in loc_str.lower() or "telework" in summary_text.lower()),
                            job_type="Full-Time",
                            description=summary_text,
                            url=uri,
                            canonical_url=uri,
                            budget=budget_str,
                            salary_min=min_sal,
                            salary_max=max_sal,
                            salary_currency="USD",
                            posted_at=parse_relative_date(pub_date),
                            raw_metadata={"department": dept}
                        )
                        jobs.append(norm_job)

                    logger.info("USAJOBS API returned %d listings", len(jobs))
                    return jobs
        except Exception as e:
            logger.warning(f"USAJOBS API query error: {e}")

        return jobs

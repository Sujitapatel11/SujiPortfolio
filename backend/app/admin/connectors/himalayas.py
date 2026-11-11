"""Free public Himalayas remote jobs API connector (no key required)."""
import logging
import urllib.parse
from typing import List

from app.admin.connectors.base import BaseConnector, NormalizedJob
from app.admin.connectors.free_remote import _get_json, _identity, _parse_date

logger = logging.getLogger("sujis_world.connectors.himalayas")


class HimalayasRemoteConnector(BaseConnector):
    """Search the global-only remote feed and retain Himalayas application links."""

    @property
    def platform_name(self) -> str:
        return "Himalayas"

    def is_available(self) -> bool:
        return True

    def fetch_jobs(self, keywords: List[str]) -> List[NormalizedJob]:
        query = " ".join((keywords or ["software engineer"])[:4])
        params = urllib.parse.urlencode({"q": query, "worldwide": "true", "sort": "recent", "page": 1})
        payload = _get_json(f"https://himalayas.app/jobs/api/search?{params}")
        jobs = []
        for item in payload.get("jobs", []) if isinstance(payload, dict) else []:
            title = (item.get("title") or "").strip()
            company = (item.get("companyName") or "").strip()
            # Himalayas requires Apply actions to use applicationLink unchanged.
            url = item.get("applicationLink") or ""
            if not title or not url:
                continue
            salary = None
            if item.get("minSalary") is not None or item.get("maxSalary") is not None:
                salary = " ".join(str(part) for part in [
                    item.get("currency") or "",
                    item.get("minSalary") if item.get("minSalary") is not None else "",
                    "–",
                    item.get("maxSalary") if item.get("maxSalary") is not None else "",
                    item.get("salaryPeriod") or "",
                ]).strip()
            description = item.get("description") or item.get("excerpt") or ""
            attribution = "\n\nSource: Himalayas (https://himalayas.app). Apply through the original Himalayas listing."
            jobs.append(NormalizedJob(
                platform="Himalayas",
                external_id=_identity("Himalayas", item.get("guid"), title, company, url),
                title=title,
                description=(f"Company: {company}\n\n{description}{attribution}" if company else description + attribution),
                url=url,
                budget=salary,
                posted_at=_parse_date(item.get("pubDate")),
                raw_metadata={
                    "company": company,
                    "source": "Himalayas",
                    "seniority": item.get("seniority"),
                    "employment_type": item.get("employmentType"),
                    "location_restrictions": item.get("locationRestrictions") or [],
                    "timezone_restrictions": item.get("timezoneRestrictions") or [],
                    "source_guid": item.get("guid"),
                },
            ))
        logger.info("Himalayas returned %s worldwide remote listings", len(jobs))
        return jobs

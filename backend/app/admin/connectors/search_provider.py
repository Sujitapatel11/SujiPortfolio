import hashlib, json, logging, os, urllib.parse, urllib.request
from typing import List
from app.admin.connectors.base import BaseConnector, NormalizedJob

logger = logging.getLogger("sujis_world.connectors.search")

class SearchProviderConnector(BaseConnector):
    """Google Jobs search through SerpAPI. Results can include listings indexed from LinkedIn and other boards."""
    def __init__(self):
        self.api_key = os.getenv("SERPAPI_API_KEY", "").strip()
        self.location = os.getenv("JOB_SEARCH_LOCATION", "Remote").strip() or "Remote"
        self.country = os.getenv("JOB_SEARCH_COUNTRY", "in").strip() or "in"

    @property
    def platform_name(self): return "Google Jobs"

    def is_available(self): return bool(self.api_key)

    def fetch_jobs(self, keywords: List[str]) -> List[NormalizedJob]:
        if not self.api_key: return []
        params = urllib.parse.urlencode({"engine":"google_jobs","q":" ".join(keywords or ["Python FastAPI React AI engineer"]),"location":self.location,"gl":self.country,"api_key":self.api_key})
        request = urllib.request.Request("https://serpapi.com/search.json?"+params, headers={"Accept":"application/json","User-Agent":"SujiJobHunter/1.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
        jobs = []
        for item in payload.get("jobs_results", []):
            title = (item.get("title") or "").strip()
            links = item.get("related_links") or []
            url = item.get("share_link") or (links[0].get("link") if links else None)
            if not title or not url: continue
            source = item.get("via") or "Google Jobs"
            company = item.get("company_name") or ""
            external_id = item.get("job_id") or hashlib.sha256(f"{source}|{title}|{company}|{url}".encode()).hexdigest()[:24]
            description = item.get("description") or ""
            if company: description = f"Company: {company}\n\n{description}"
            jobs.append(NormalizedJob(platform=f"Google Jobs · {source}", external_id=str(external_id), title=title, description=description, url=url, budget=(item.get("detected_extensions") or {}).get("salary"), raw_metadata={"company":company,"via":source,"extensions":item.get("detected_extensions") or {}}))
        logger.info("Google Jobs returned %s listings", len(jobs))
        return jobs

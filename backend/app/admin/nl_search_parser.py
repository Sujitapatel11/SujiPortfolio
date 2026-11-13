import re
import logging
from typing import Dict, Any, List, Optional
from app.admin.connectors.base import SearchQuery
from app.admin.connectors.helpers import normalize_salary, resolve_country_code

logger = logging.getLogger("sujis_world.nl_search_parser")


def parse_natural_language_query(query_text: str) -> Dict[str, Any]:
    """
    Parse natural-language search request into structured SearchQuery filters
    and generate explanations for unsupported or partially supported filters.

    Examples:
    - 'Find remote Python Developer jobs in Germany posted within the last 7 days, with salary above €40,000.'
    - 'Find internships in India.'
    - 'Find AI Engineer jobs requiring less than two years of experience.'
    - 'Find freelance React projects.'
    - 'Find jobs offering visa sponsorship.'
    """
    if not query_text or not query_text.strip():
        sq = SearchQuery()
        return {
            "query": sq,
            "parsed_filters": sq.model_dump(),
            "unsupported_explanations": []
        }

    raw = query_text.strip()
    text = raw.lower()
    unsupported_explanations: List[str] = []

    # 1. Location & Country
    location = None
    country_code = None
    location_patterns = [
        (r'\bin\s+([a-zA-Z\s]+?)(?=\s+(?:posted|with|salary|requiring|offering|$))', 1),
        (r'\b(germany|deutschland|berlin|munich|frankfurt|hamburg)\b', 0),
        (r'\b(nepal|kathmandu|pokhara|birgunj|india|delhi|mumbai|bangalore|hyderabad|pune)\b', 0),
        (r'\b(united states|usa|us|uk|united kingdom|london|canada|australia|france)\b', 0),
    ]

    for pat, grp in location_patterns:
        m = re.search(pat, text)
        if m:
            val = m.group(grp).strip()
            # Avoid picking up keywords like "python" as location
            if val not in ("python", "react", "fastapi", "ai", "machine learning", "remote"):
                location = val.title()
                country_code = resolve_country_code(location)
                break

    # 2. Remote / On-site / Hybrid
    is_remote = None
    if "remote" in text or "work from home" in text or "wfh" in text:
        is_remote = True
    elif "on-site" in text or "onsite" in text or "in-office" in text:
        is_remote = False
    elif "hybrid" in text:
        is_remote = False  # requires physical presence part-time

    # 3. Employment Type
    job_type = None
    if "internship" in text or "intern" in text:
        job_type = "internship"
    elif "freelance" in text or "contract" in text or "gig" in text:
        job_type = "freelance"
    elif "part-time" in text or "part time" in text:
        job_type = "part-time"
    elif "full-time" in text or "full time" in text:
        job_type = "full-time"

    # 4. Salary Range and Currency
    salary_min = None
    salary_currency = None
    sal_match = re.search(r'(?:salary\s+(?:above|greater than|min|minimum|over)|above|paying)\s*([€$£₹\w\d,\.\s]+)', text)
    if sal_match:
        min_s, _, curr = normalize_salary(sal_match.group(1))
        if min_s:
            salary_min = min_s
            salary_currency = curr
    else:
        # direct currency symbol check e.g. "above €40,000"
        sym_match = re.search(r'([€$£₹]\s*\d[\d,\.]*)', text)
        if sym_match:
            min_s, _, curr = normalize_salary(sym_match.group(1))
            if min_s:
                salary_min = min_s
                salary_currency = curr

    # 5. Experience Level
    experience_level = None
    if any(k in text for k in ["less than two years", "< 2 years", "under 2 years", "entry-level", "junior", "0-2 years"]):
        experience_level = "entry / junior (< 2 years)"
    elif any(k in text for k in ["senior", "lead", "staff", "principal", "5+ years", "10+ years"]):
        experience_level = "senior"
    elif any(k in text for k in ["mid-level", "mid level", "3-5 years"]):
        experience_level = "mid-level"

    # 6. Date Posted / Freshness (e.g. "within the last 7 days")
    max_days_old = None
    days_match = re.search(r'(?:within|last|past)\s+(\d+)\s+days?', text)
    if days_match:
        max_days_old = int(days_match.group(1))
    elif "last week" in text or "past week" in text:
        max_days_old = 7
    elif "today" in text or "last 24 hours" in text:
        max_days_old = 1
    elif "last month" in text:
        max_days_old = 30

    # 7. Visa Sponsorship
    visa_sponsorship = None
    if "visa" in text or "sponsorship" in text or "relocation" in text:
        visa_sponsorship = True

    # 8. Keyword extraction: remove noise / filler words
    cleaned = re.sub(
        r'\b(find|search|look for|jobs?|positions?|openings?|posted|within|the|last|past|\d+\s+days?|with|salary|above|greater than|requiring|less than|two|years|of|experience|in|offering|visa|sponsorship|remote|freelance|internships?)\b',
        ' ',
        text,
        flags=re.IGNORECASE
    )
    # Remove the parsed location so country/city names do not become search keywords.
    if location:
        cleaned = re.sub(re.escape(location.lower()), ' ', cleaned)
    # Also strip currency amounts
    cleaned = re.sub(r'[€$£₹]\s*\d[\d,\.]*', ' ', cleaned)
    keywords = [w.strip() for w in re.split(r'[,;\s]+', cleaned) if len(w.strip()) > 1]

    # If no core keywords remaining, infer sensible defaults
    if not keywords:
        if "python" in text:
            keywords.append("python")
        if "react" in text:
            keywords.append("react")
        if "ai" in text or "engineer" in text:
            keywords.extend(["ai", "engineer"])
        if not keywords:
            keywords = ["software", "developer"]

    # 9. Unsupported or partially supported filter explanations
    if visa_sponsorship:
        unsupported_explanations.append(
            "Visa Sponsorship: Most public job APIs (Adzuna, Remotive, Jooble) do not provide a structured visa sponsorship attribute. "
            "The system actively filters and ranks job descriptions matching 'visa sponsorship' and 'relocation support'."
        )

    if experience_level:
        unsupported_explanations.append(
            f"Experience Level ({experience_level}): Upstream provider APIs do not accept numeric years of experience directly. "
            "Relevance ranking prioritizes junior/entry titles and filters out senior/staff roles."
        )

    if salary_min:
        unsupported_explanations.append(
            f"Minimum Salary ({salary_currency or 'EUR'} {salary_min:,.0f}): Supported directly on Adzuna and Jooble; "
            "other providers will be filtered post-fetch based on extracted salary text."
        )

    search_query = SearchQuery(
        keywords=keywords,
        location=location,
        country_code=country_code,
        is_remote=is_remote,
        salary_min=salary_min,
        salary_currency=salary_currency,
        job_type=job_type,
        experience_level=experience_level,
        max_days_old=max_days_old,
        visa_sponsorship=visa_sponsorship,
        raw_query=raw,
        limit=25
    )

    return {
        "query": search_query,
        "parsed_filters": {
            "keywords": keywords,
            "location": location,
            "country_code": country_code,
            "is_remote": is_remote,
            "job_type": job_type,
            "salary_min": salary_min,
            "salary_currency": salary_currency,
            "experience_level": experience_level,
            "max_days_old": max_days_old,
            "visa_sponsorship": visa_sponsorship,
            "raw_query": raw,
        },
        "unsupported_explanations": unsupported_explanations,
    }

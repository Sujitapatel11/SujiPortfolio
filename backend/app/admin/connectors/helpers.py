import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple


def normalize_salary(salary_text: Optional[str]) -> Tuple[Optional[float], Optional[float], Optional[str]]:
    """
    Extract (min_salary, max_salary, currency) from various salary strings:
    - "€40,000 - €60,000" -> (40000.0, 60000.0, "EUR")
    - "$50,000/yr" -> (50000.0, 50000.0, "USD")
    - "£30k - £45k" -> (30000.0, 45000.0, "GBP")
    - "40000 EUR" -> (40000.0, 40000.0, "EUR")
    """
    if not salary_text:
        return None, None, None

    text = str(salary_text).strip()

    # Detect currency
    currency = "USD"
    if "€" in text or "eur" in text.lower():
        currency = "EUR"
    elif "£" in text or "gbp" in text.lower():
        currency = "GBP"
    elif "₹" in text or "inr" in text.lower():
        currency = "INR"
    elif "c$" in text.lower() or "cad" in text.lower():
        currency = "CAD"
    elif "a$" in text.lower() or "aud" in text.lower():
        currency = "AUD"
    elif "$" in text or "usd" in text.lower():
        currency = "USD"

    # Normalize 'k' suffixes e.g. 40k -> 40000
    cleaned = re.sub(r'(\d+(?:\.\d+)?)\s*[kK]\b', lambda m: str(int(float(m.group(1)) * 1000)), text)

    # Find numbers
    numbers = re.findall(r'\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b|\b\d+\b', cleaned)
    cleaned_nums = []
    for num_str in numbers:
        try:
            val = float(num_str.replace(",", ""))
            if val > 100:  # Ignore trivial numbers like hours or ratings
                cleaned_nums.append(val)
        except ValueError:
            continue

    if not cleaned_nums:
        return None, None, currency

    if len(cleaned_nums) >= 2:
        return min(cleaned_nums[0], cleaned_nums[1]), max(cleaned_nums[0], cleaned_nums[1]), currency
    return cleaned_nums[0], cleaned_nums[0], currency


def resolve_country_code(location: Optional[str]) -> Optional[str]:
    """
    Map location / country name into standard 2-letter country code for provider APIs.
    """
    if not location:
        return None

    loc = location.lower()
    if any(k in loc for k in ["germany", "deutschland", "berlin", "munich", "frankfurt", "hamburg"]):
        return "de"
    if any(k in loc for k in ["united states", "usa", "us", "america", "new york", "san francisco"]):
        return "us"
    if any(k in loc for k in ["united kingdom", "uk", "great britain", "london", "england"]):
        return "gb"
    if any(k in loc for k in ["nepal", "kathmandu", "pokhara", "birgunj"]):
        return "np"
    if any(k in loc for k in ["india", "bangalore", "delhi", "mumbai", "hyderabad", "pune"]):
        return "in"
    if any(k in loc for k in ["france", "paris"]):
        return "fr"
    if any(k in loc for k in ["canada", "toronto", "vancouver"]):
        return "ca"
    if any(k in loc for k in ["australia", "sydney", "melbourne"]):
        return "au"
    if any(k in loc for k in ["netherlands", "amsterdam"]):
        return "nl"
    return None


def parse_relative_date(date_str: Optional[str]) -> Optional[datetime]:
    """
    Parse relative date strings like '3 days ago', 'just now', or ISO timestamps.
    """
    if not date_str:
        return None

    s = date_str.lower().strip()
    now = datetime.now(timezone.utc)

    if "hour" in s or "minute" in s or "just now" in s or "today" in s:
        return now
    if "yesterday" in s:
        return now - timedelta(days=1)

    m = re.search(r'(\d+)\s+day', s)
    if m:
        days = int(m.group(1))
        return now - timedelta(days=days)

    m = re.search(r'(\d+)\s+week', s)
    if m:
        weeks = int(m.group(1))
        return now - timedelta(weeks=weeks)

    m = re.search(r'(\d+)\s+month', s)
    if m:
        months = int(m.group(1))
        return now - timedelta(days=months * 30)

    # Try ISO formats
    for fmt in [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]:
        try:
            dt = datetime.strptime(date_str[:19], fmt[:19])
            return dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue

    return now


def assess_applicant_eligibility(
    candidate_location: Optional[str],
    applicant_countries: Optional[list] = None,
) -> str:
    """
    Conservative eligibility check based only on explicit candidate-location text.
    Returns eligible, ineligible, or unknown; never guesses from the job's office location.
    """
    if not candidate_location or not candidate_location.strip():
        return "unknown"

    text = candidate_location.casefold().strip()
    countries = [str(country).casefold().strip() for country in (applicant_countries or ["Nepal", "India"])]

    worldwide_terms = ("worldwide", "anywhere", "global", "all countries", "no location restrictions")
    if any(term in text for term in worldwide_terms):
        return "eligible"

    aliases = {
        "nepal": ("nepal", "kathmandu", "pokhara", "birgunj"),
        "india": ("india", "indian"),
    }
    requested_terms = tuple(
        term
        for country in countries
        for term in aliases.get(country, (country,))
    )
    explicit_restriction_markers = (
        "only", "must be based", "based in", "residents of", "located in",
        "eligible to work in", "authorized to work in", "candidates in",
    )

    mentions_requested_country = any(term in text for term in requested_terms)
    mentions_restriction = any(marker in text for marker in explicit_restriction_markers)

    if mentions_requested_country and mentions_restriction:
        return "eligible"

    known_other_regions = (
        "united states", "usa only", "us only", "uk only", "united kingdom only",
        "canada only", "europe only", "eu only", "australia only",
    )
    if any(region in text for region in known_other_regions):
        return "ineligible"

    # A named region without a clear restriction can describe team location, not applicant eligibility.
    return "unknown"

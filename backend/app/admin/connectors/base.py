import hashlib
import re
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field


class SearchQuery(BaseModel):
    """
    Structured search query filters extracted from natural language or UI form.
    """
    keywords: List[str] = Field(default_factory=lambda: ["python", "developer"])
    location: Optional[str] = None
    country_code: Optional[str] = None  # e.g. "de", "us", "in", "gb"
    is_remote: Optional[bool] = None
    salary_min: Optional[float] = None
    salary_currency: Optional[str] = None
    job_type: Optional[str] = None  # full-time, contract, freelance, internship
    experience_level: Optional[str] = None  # entry, mid, senior
    max_days_old: Optional[int] = None  # e.g. 7 days
    visa_sponsorship: Optional[bool] = None
    raw_query: Optional[str] = None
    limit: int = 20

    @classmethod
    def from_input(cls, query_or_keywords: Union["SearchQuery", List[str], str, None]) -> "SearchQuery":
        if isinstance(query_or_keywords, SearchQuery):
            return query_or_keywords
        if isinstance(query_or_keywords, list):
            return cls(keywords=query_or_keywords)
        if isinstance(query_or_keywords, str):
            return cls(raw_query=query_or_keywords, keywords=[query_or_keywords])
        return cls()


class NormalizedJob(BaseModel):
    """
    Standardized job model across all platform connectors.
    """
    platform: str
    external_id: str
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    is_remote: bool = False
    job_type: Optional[str] = None  # full-time, contract, freelance, internship
    description: Optional[str] = None
    url: Optional[str] = None
    canonical_url: Optional[str] = None
    budget: Optional[str] = None  # human-readable raw budget string
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    skills_required: List[str] = Field(default_factory=list)
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)

    def compute_canonical_url(self) -> str:
        """Derive or sanitize canonical URL stripped of tracking parameters."""
        raw = self.canonical_url or self.url or ""
        if not raw:
            return ""
        # Strip tracking query params e.g. utm_*, ref, etc.
        clean = re.sub(r'([?&])(utm_[^&]+|ref=[^&]+|source=[^&]+)(&|$)', r'\1', raw)
        clean = re.sub(r'[?&]$', '', clean)
        return clean

    def deduplication_hash(self) -> str:
        """Generate content-based deduplication hash (title + company or canonical url)."""
        canon = self.compute_canonical_url()
        if canon:
            return hashlib.sha256(canon.lower().encode("utf-8")).hexdigest()[:24]
        norm_title = re.sub(r'\W+', '', (self.title or "").lower())
        norm_comp = re.sub(r'\W+', '', (self.company or self.platform or "").lower())
        return hashlib.sha256(f"{norm_title}|{norm_comp}".encode("utf-8")).hexdigest()[:24]


class BaseConnector(ABC):
    """
    Abstract Base Class for all job platform connectors.
    """

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Human-readable name of the platform (e.g. 'Adzuna', 'Jooble', 'Remotive')."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the connector is enabled and its required credentials are present."""
        pass

    def get_missing_credentials(self) -> List[str]:
        """Return missing credential environment variables."""
        return []

    @abstractmethod
    def fetch_jobs(self, query: Union[SearchQuery, List[str], str, None] = None, keywords: Optional[List[str]] = None) -> List[NormalizedJob]:
        """Fetch active jobs from the platform matching query parameters."""
        pass

    def get_health_info(self) -> Dict[str, Any]:
        """Return diagnostic health info for dashboard."""
        return {
            "platform": self.platform_name,
            "available": self.is_available(),
            "missing_credentials": self.get_missing_credentials(),
        }

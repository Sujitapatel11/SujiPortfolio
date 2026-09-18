from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class NormalizedJob(BaseModel):
    """
    Standardized job model across all platform connectors.
    """
    platform: str
    external_id: str
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    budget: Optional[str] = None
    posted_at: Optional[datetime] = None
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseConnector(ABC):
    """
    Abstract Base Class for all freelancing platform connectors.
    New connectors (e.g. Upwork, Fiverr) must inherit from BaseConnector.
    """

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """
        Human-readable name of the platform (e.g. 'Freelancer.com', 'Upwork', 'Fiverr').
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if the connector is enabled and its API/service is available.
        """
        pass

    @abstractmethod
    def fetch_jobs(self, keywords: List[str]) -> List[NormalizedJob]:
        """
        Fetch active jobs from the platform matching the provided keywords.
        """
        pass

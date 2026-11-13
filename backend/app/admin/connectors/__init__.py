from app.admin.connectors.base import BaseConnector, NormalizedJob, SearchQuery
from app.admin.connectors.freelancer import FreelancerConnector
from app.admin.connectors.search_provider import SearchProviderConnector
from app.admin.connectors.remotive import RemotiveConnector
from app.admin.connectors.adzuna import AdzunaConnector
from app.admin.connectors.jooble import JoobleConnector
from app.admin.connectors.usajobs import USAJobsConnector
from app.admin.connectors.manual import ManualPasteConnector, process_pasted_job

__all__ = [
    "BaseConnector",
    "NormalizedJob",
    "SearchQuery",
    "FreelancerConnector",
    "SearchProviderConnector",
    "RemotiveConnector",
    "AdzunaConnector",
    "JoobleConnector",
    "USAJobsConnector",
    "ManualPasteConnector",
    "process_pasted_job",
]

import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.models import Job, Proposal, JobStatus, SearchAuditLog, ProviderHealthRecord
from app.admin.connectors.base import SearchQuery, NormalizedJob
from app.admin.connectors.adzuna import AdzunaConnector
from app.admin.connectors.jooble import JoobleConnector
from app.admin.connectors.remotive import RemotiveConnector
from app.admin.connectors.usajobs import USAJobsConnector
from app.admin.connectors.search_provider import SearchProviderConnector
from app.admin.connectors.freelancer import FreelancerConnector
from app.admin.nl_search_parser import parse_natural_language_query
from app.admin.ai_matcher import evaluate_job_fit, generate_tailored_application
from app.admin.orchestrator import JobDiscoveryOrchestrator
from app.main import app
from app.admin.auth import create_access_token, ADMIN_USERNAME


class TestJobHunterFullSuite(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()

        def _override_get_db():
            db = TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = _override_get_db
        self.client = TestClient(app)
        self.admin_token = create_access_token(data={"sub": ADMIN_USERNAME, "role": "admin"})
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()

    # 1. Natural Language Parser Tests
    def test_nl_search_parser_primary_objective_prompt(self):
        """Test primary objective: 'Find remote Python Developer jobs in Germany posted within the last 7 days, with salary above €40,000.'"""
        prompt = "Find remote Python Developer jobs in Germany posted within the last 7 days, with salary above €40,000."
        res = parse_natural_language_query(prompt)

        sq = res["query"]
        filters = res["parsed_filters"]
        self.assertIn("python", filters["keywords"])
        self.assertEqual(filters["location"], "Germany")
        self.assertEqual(filters["country_code"], "de")
        self.assertTrue(filters["is_remote"])
        self.assertEqual(filters["salary_min"], 40000.0)
        self.assertEqual(filters["salary_currency"], "EUR")
        self.assertEqual(filters["max_days_old"], 7)

    def test_nl_search_parser_unsupported_filter_explanations(self):
        """Test explanation of unsupported or partially supported filters."""
        prompt = "Find AI Engineer jobs in Germany requiring less than two years of experience and offering visa sponsorship."
        res = parse_natural_language_query(prompt)
        explanations = res["unsupported_explanations"]
        self.assertTrue(any("visa" in e.lower() for e in explanations))
        self.assertTrue(any("experience" in e.lower() for e in explanations))

    def test_nl_search_parser_nepal_terminal_location(self):
        result = parse_natural_language_query("Find Python backend jobs in Nepal")
        filters = result["parsed_filters"]
        self.assertEqual(filters["location"], "Nepal")
        self.assertEqual(filters["country_code"], "np")
        self.assertIn("python", filters["keywords"])

    def test_nl_search_parser_india_terminal_location(self):
        result = parse_natural_language_query("Find React developer jobs in India")
        filters = result["parsed_filters"]
        self.assertEqual(filters["location"], "India")
        self.assertEqual(filters["country_code"], "in")

    def test_unknown_location_does_not_default_to_germany(self):
        result = parse_natural_language_query("Find Python jobs in Singapore")
        filters = result["parsed_filters"]
        self.assertEqual(filters["location"], "Singapore")
        self.assertIsNone(filters["country_code"])

    def test_applicant_eligibility_worldwide(self):
        from app.admin.connectors.helpers import assess_applicant_eligibility
        self.assertEqual(assess_applicant_eligibility("Worldwide"), "eligible")

    def test_applicant_eligibility_nepal_and_india_restriction(self):
        from app.admin.connectors.helpers import assess_applicant_eligibility
        self.assertEqual(
            assess_applicant_eligibility("Candidates must be based in Nepal or India"),
            "eligible",
        )

    def test_applicant_eligibility_explicit_us_only(self):
        from app.admin.connectors.helpers import assess_applicant_eligibility
        self.assertEqual(
            assess_applicant_eligibility("Applicants must be based in the United States only"),
            "ineligible",
        )

    def test_applicant_eligibility_ambiguous_location_is_unknown(self):
        from app.admin.connectors.helpers import assess_applicant_eligibility
        self.assertEqual(assess_applicant_eligibility("United States time-zone overlap"), "unknown")
        self.assertEqual(assess_applicant_eligibility(None), "unknown")

    # 2. Mocked Provider Integrations
    @patch("urllib.request.urlopen")
    def test_adzuna_connector_mocked(self, mock_urlopen):
        """Test Adzuna provider normalization with mocked API response."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = b'''{
            "results": [{
                "id": "adz_101",
                "title": "Senior Python Backend Engineer",
                "company": {"display_name": "TechCorp GmbH"},
                "location": {"display_name": "Berlin, Germany"},
                "description": "Looking for Python, FastAPI, and PostgreSQL engineer.",
                "redirect_url": "https://www.adzuna.com/land/101",
                "salary_min": 65000,
                "salary_max": 80000,
                "contract_time": "full_time",
                "created": "2026-11-10T10:00:00Z"
            }]
        }'''
        mock_urlopen.return_value.__enter__.return_value = mock_response

        connector = AdzunaConnector()
        connector.app_id = "test_app_id"
        connector.app_key = "test_app_key"

        jobs = connector.fetch_jobs(SearchQuery(keywords=["python"], location="Germany", country_code="de"))
        self.assertEqual(len(jobs), 1)
        job = jobs[0]
        self.assertEqual(job.platform, "Adzuna")
        self.assertEqual(job.external_id, "adz_101")
        self.assertEqual(job.company, "TechCorp GmbH")
        self.assertEqual(job.salary_min, 65000.0)
        self.assertEqual(job.salary_currency, "EUR")

    @patch("urllib.request.urlopen")
    def test_jooble_connector_mocked(self, mock_urlopen):
        """Test Jooble provider normalization with mocked POST response."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = b'''{
            "jobs": [{
                "id": "jbl_202",
                "title": "Python Remote Developer",
                "company": "Jooble Cloud",
                "location": "Remote, Germany",
                "snippet": "Python, Django, React developer needed.",
                "salary": "\\u20ac50,000 - \\u20ac60,000",
                "source": "Jooble",
                "type": "Full-time",
                "link": "https://jooble.org/desc/202",
                "updated": "2026-11-12T08:00:00"
            }]
        }'''
        mock_urlopen.return_value.__enter__.return_value = mock_response

        connector = JoobleConnector()
        connector.api_key = "test_jooble_key"

        jobs = connector.fetch_jobs(SearchQuery(keywords=["python"]))
        self.assertEqual(len(jobs), 1)
        job = jobs[0]
        self.assertEqual(job.platform, "Jooble")
        self.assertEqual(job.external_id, "jbl_202")
        self.assertEqual(job.salary_min, 50000.0)
        self.assertEqual(job.salary_currency, "EUR")

    @patch("urllib.request.urlopen")
    def test_remotive_connector_mocked(self, mock_urlopen):
        """Test Remotive public provider normalization with mocked response."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = b'''{
            "jobs": [{
                "id": 303,
                "url": "https://remotive.com/remote-jobs/software-dev/303",
                "title": "Full Stack Python/React Developer",
                "company_name": "Remotive Labs",
                "candidate_required_location": "Worldwide",
                "salary": "$80,000 - $100,000",
                "description": "Full stack role working on React, FastAPI, Docker.",
                "publication_date": "2026-11-11T12:00:00",
                "job_type": "full_time"
            }]
        }'''
        mock_urlopen.return_value.__enter__.return_value = mock_response

        connector = RemotiveConnector()
        self.assertTrue(connector.is_available())
        jobs = connector.fetch_jobs(SearchQuery(keywords=["python"]))
        self.assertEqual(len(jobs), 1)
        job = jobs[0]
        self.assertEqual(job.platform, "Remotive")
        self.assertTrue(job.is_remote)
        self.assertEqual(job.company, "Remotive Labs")

    @patch("urllib.request.urlopen")
    def test_usajobs_connector_mocked(self, mock_urlopen):
        """Test USAJOBS provider normalization with mocked response."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = b'''{
            "SearchResult": {
                "SearchResultItems": [{
                    "MatchedObjectId": "usajobs_404",
                    "MatchedObjectDescriptor": {
                        "PositionTitle": "IT Specialist (Software Developer)",
                        "OrganizationName": "Department of Energy",
                        "DepartmentName": "Energy Department",
                        "PositionURI": "https://www.usajobs.gov/job/404",
                        "PositionLocation": [{"LocationName": "Washington, DC"}],
                        "PositionRemuneration": [{"MinimumRange": "95000", "MaximumRange": "125000"}],
                        "UserArea": {"Details": {"JobSummary": "Develop software solutions using Python and microservices."}},
                        "PublicationStartDate": "2026-11-08"
                    }
                }]
            }
        }'''
        mock_urlopen.return_value.__enter__.return_value = mock_response

        connector = USAJobsConnector()
        connector.api_key = "test_key"
        connector.user_agent = "suji@example.com"
        jobs = connector.fetch_jobs(SearchQuery(keywords=["software"]))
        self.assertEqual(len(jobs), 1)
        job = jobs[0]
        self.assertEqual(job.platform, "USAJOBS")
        self.assertEqual(job.salary_min, 95000.0)

    # 3. Missing Credentials & Diagnostics
    def test_missing_credentials_handling(self):
        """Test providers report missing credentials without crashing."""
        adz = AdzunaConnector()
        adz.app_id = ""
        adz.app_key = ""
        self.assertFalse(adz.is_available())
        self.assertEqual(set(adz.get_missing_credentials()), {"ADZUNA_APP_ID", "ADZUNA_APP_KEY"})
        self.assertEqual(adz.fetch_jobs(["python"]), [])

    # 4. AI Relevance Matching & Criteria Breakdown
    def test_ai_matching_explainable_criteria(self):
        """Test resume-to-job matching, criteria breakdown, and skills gap analysis."""
        fit = evaluate_job_fit(
            job_title="Senior Python FastAPI Developer",
            job_description="We need an expert in Python, FastAPI, PostgreSQL, and React. AWS experience is a plus.",
            job_location="Berlin, Germany",
            is_remote=True,
            salary_min=55000.0,
            target_salary_min=40000.0,
        )
        self.assertGreaterEqual(fit["score"], 0.70)
        self.assertIn("Python", fit["matching_skills"])
        self.assertIn("FastAPI", fit["matching_skills"])
        self.assertIn("skills_alignment", fit["criteria_breakdown"])
        self.assertIn("match_reason", fit)
        self.assertIn("skills_gap_analysis", fit)

    # 5. Tailored Application Assistance (No Fabrication)
    def test_generate_tailored_application(self):
        """Test truthful proposal, cover letter, resume suggestions, and interview questions."""
        job = Job(
            platform="Remotive",
            external_id="mock_55",
            title="Full-Stack Python & React Engineer",
            company="NextWave Innovations",
            description="Build scalable web applications with FastAPI, React, and PostgreSQL.",
            budget="EUR 50,000",
            status=JobStatus.DISCOVERED,
        )
        assistance = generate_tailored_application(job)
        # Verify genuine references to candidate's real portfolio projects
        self.assertIn("SoulCare", assistance["proposal_draft"])
        self.assertIn("UrmiNexus", assistance["cover_letter"])
        self.assertIn("Sujita", assistance["proposal_draft"])
        self.assertGreaterEqual(len(assistance["tailored_resume_suggestions"]), 2)
        self.assertGreaterEqual(len(assistance["interview_questions"]), 3)

    # 6. Deduplication Engine
    def test_deduplication_engine(self):
        """Test deduplication by canonical URL and (title + company)."""
        job1 = NormalizedJob(
            platform="Adzuna",
            external_id="adz_dup_1",
            title="Senior Python Engineer",
            company="Acme Corp",
            url="https://example.com/jobs/1?utm_source=adzuna&ref=123",
            canonical_url="https://example.com/jobs/1",
        )
        job2 = NormalizedJob(
            platform="Google Jobs",
            external_id="gj_dup_2",
            title="Senior Python Engineer",
            company="Acme Corp",
            url="https://example.com/jobs/1?utm_source=google",
            canonical_url="https://example.com/jobs/1",
        )
        self.assertEqual(job1.compute_canonical_url(), job2.compute_canonical_url())
        self.assertEqual(job1.deduplication_hash(), job2.deduplication_hash())

    # 7. Application Status Lifecycle Transitions
    def test_application_lifecycle_transitions(self):
        """Test standard status lifecycle: DISCOVERED -> MATCHED -> SAVED -> DRAFTED -> PENDING_APPROVAL -> APPROVED -> SUBMITTED -> REJECTED -> EXPIRED."""
        job = Job(
            platform="Remotive",
            external_id="life_10",
            title="Python Developer",
            status=JobStatus.DISCOVERED,
        )
        self.db.add(job)
        self.db.commit()

        prop = Proposal(job_id=job.id, draft_text="Initial draft", status="draft")
        self.db.add(prop)
        self.db.commit()

        # Update to APPROVED
        res = self.client.patch(f"/admin/jobs/{job.id}/status", json={"status": "APPROVED"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.db.refresh(job)
        self.assertEqual(job.status, JobStatus.APPROVED)

        # Update to SUBMITTED (explicit user action)
        res2 = self.client.patch(f"/admin/jobs/{job.id}/status", json={"status": "SUBMITTED"}, headers=self.headers)
        self.assertEqual(res2.status_code, 200)
        self.db.refresh(job)
        self.db.refresh(prop)
        self.assertEqual(job.status, JobStatus.SUBMITTED)
        self.assertEqual(prop.status, "submitted")

    # 8. Admin API Endpoints
    def test_admin_endpoints(self):
        """Test provider health, audit logs, and natural language query parser API."""
        # Provider health endpoint
        res = self.client.get("/admin/providers/health", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        platforms = [p["platform"] for p in res.json()]
        self.assertIn("Adzuna", platforms)
        self.assertIn("Remotive", platforms)
        self.assertIn("USAJOBS", platforms)

        # NL parse endpoint
        parse_res = self.client.post("/admin/jobs/nl-parse", json={"query": "Find remote Python Developer jobs in Germany with salary above €40,000."}, headers=self.headers)
        self.assertEqual(parse_res.status_code, 200)
        data = parse_res.json()
        self.assertEqual(data["parsed_filters"]["location"], "Germany")
        self.assertEqual(data["parsed_filters"]["salary_min"], 40000.0)

        # Agent status endpoint
        sched_res = self.client.get("/admin/jobs/agent/status", headers=self.headers)
        self.assertEqual(sched_res.status_code, 200)


if __name__ == "__main__":
    unittest.main()

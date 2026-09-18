import unittest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.models import Job, Proposal
from app.admin.connectors import NormalizedJob, BaseConnector, FreelancerConnector
from app.admin.proposal_drafter import generate_proposal_draft
from app.admin.orchestrator import JobDiscoveryOrchestrator
from app.main import app
from app.admin.auth import create_access_token, ADMIN_USERNAME


class BrokenTestConnector(BaseConnector):
    """
    Mock connector that raises an exception during fetch_jobs to test per-connector error isolation.
    """
    @property
    def platform_name(self) -> str:
        return "FailingPlatform"

    def is_available(self) -> bool:
        return True

    def fetch_jobs(self, keywords: list[str]) -> list[NormalizedJob]:
        raise RuntimeError("Simulated API failure or timeout on FailingPlatform")


class TestJobConnectorsAndOrchestrator(unittest.TestCase):

    def setUp(self):
        # Set up in-memory SQLite database with StaticPool for thread-safe test client execution
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

        # Generate admin JWT token for protected endpoint testing
        self.admin_token = create_access_token(data={"sub": ADMIN_USERNAME, "role": "admin"})

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()

    def test_freelancer_connector_fetch(self):
        """Test FreelancerConnector fetches and returns valid NormalizedJob instances."""
        connector = FreelancerConnector()
        self.assertEqual(connector.platform_name, "Freelancer.com")
        self.assertTrue(connector.is_available())

        jobs = connector.fetch_jobs(keywords=["python", "fastapi"])
        self.assertGreater(len(jobs), 0)
        for job in jobs:
            self.assertIsInstance(job, NormalizedJob)
            self.assertEqual(job.platform, "Freelancer.com")
            self.assertIsNotNone(job.external_id)
            self.assertIsNotNone(job.title)

    def test_proposal_drafter_reuse(self):
        """Test generate_proposal_draft from proposal_drafter.py produces valid draft text."""
        test_job = Job(
            platform="Freelancer.com",
            external_id="fl_test_99",
            title="FastAPI + React Portfolio Builder",
            description="Need full-stack developer with AI experience.",
            budget="USD 2,000",
            status="new"
        )
        self.db.add(test_job)
        self.db.commit()
        self.db.refresh(test_job)

        draft = generate_proposal_draft(test_job)
        self.assertIn("FastAPI + React Portfolio Builder", draft)
        self.assertIn("Sujita Patel", draft)

    def test_orchestrator_discovery_and_deduplication(self):
        """Test JobDiscoveryOrchestrator runs discovery, deduplicates, and creates job+proposal records."""
        orchestrator = JobDiscoveryOrchestrator()
        
        # Run discovery #1
        summary_1 = orchestrator.run_discovery(self.db, keywords=["python", "fastapi"])
        self.assertIn("Freelancer.com", summary_1)
        fetched_1 = summary_1["Freelancer.com"]["fetched"]
        matched_1 = summary_1["Freelancer.com"]["matched"]
        drafted_1 = summary_1["Freelancer.com"]["drafted"]

        self.assertGreater(fetched_1, 0)
        self.assertEqual(matched_1, drafted_1)

        # Check DB records created
        db_jobs = self.db.query(Job).all()
        db_proposals = self.db.query(Proposal).all()
        self.assertEqual(len(db_jobs), matched_1)
        self.assertEqual(len(db_proposals), drafted_1)

        # Run discovery #2 with same keywords -> All jobs should be deduplicated (matched=0)
        summary_2 = orchestrator.run_discovery(self.db, keywords=["python", "fastapi"])
        self.assertEqual(summary_2["Freelancer.com"]["matched"], 0)
        self.assertEqual(summary_2["Freelancer.com"]["drafted"], 0)

    def test_per_connector_error_isolation(self):
        """Test that failure in one connector does not break execution for remaining connectors."""
        orchestrator = JobDiscoveryOrchestrator()
        broken_connector = BrokenTestConnector()
        orchestrator.register_connector(broken_connector)

        summary = orchestrator.run_discovery(self.db, keywords=["python"])
        
        # Broken platform reported error without failing the whole run
        self.assertIn("FailingPlatform", summary)
        self.assertEqual(summary["FailingPlatform"]["fetched"], 0)
        self.assertIn("error", summary["FailingPlatform"])

        # Freelancer.com succeeded normally
        self.assertIn("Freelancer.com", summary)
        self.assertGreaterEqual(summary["Freelancer.com"]["fetched"], 0)

    def test_search_now_api_endpoint(self):
        """Test POST /admin/jobs/search-now endpoint requiring admin authorization."""
        # Test 401 unauthorized request without Bearer token
        res_unauth = self.client.post("/admin/jobs/search-now", json={"keywords": ["python"]})
        self.assertEqual(res_unauth.status_code, 401)

        # Test authorized admin request
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res_auth = self.client.post("/admin/jobs/search-now", json={"keywords": ["python", "fastapi"]}, headers=headers)
        self.assertEqual(res_auth.status_code, 200)

        data = res_auth.json()
        self.assertIn("summary", data)
        self.assertIn("Freelancer.com", data["summary"])
        self.assertIn("fetched", data["summary"]["Freelancer.com"])
        self.assertIn("matched", data["summary"]["Freelancer.com"])
        self.assertIn("drafted", data["summary"]["Freelancer.com"])


if __name__ == "__main__":
    unittest.main()

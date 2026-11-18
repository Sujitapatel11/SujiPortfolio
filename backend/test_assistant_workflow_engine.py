from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.admin.auth import get_current_admin
from app.assistant.models import (
    AssistantSession, AssistantDevice, AssistantWorkflow, AssistantWorkflowStep,
    WorkflowExecutionEvent, AssistantAction,
)
from app.assistant.workflow_engine import (
    create_workflow, advance_workflow, pause_workflow, resume_workflow, cancel_workflow,
    get_or_create_work_profile,
)


@pytest.fixture
def workflow_test_env():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_admin] = lambda: {"username": "sujit-owner", "role": "admin"}
    client = TestClient(app)

    yield client, TestingSession

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_create_and_plan_workflow(workflow_test_env):
    client, TestingSession = workflow_test_env
    db = TestingSession()

    goal = "Open Fiverr, find suitable Python, FastAPI, React and AI jobs, compare them with my real skills, shortlist best opportunities and prepare tailored proposals"
    workflow = create_workflow(
        db=db,
        session_id="session-123",
        owner_username="sujit-owner",
        goal=goal,
    )

    assert workflow.id is not None
    assert workflow.status == "queued"
    assert "fiverr.com" in workflow.allowed_domains
    assert workflow.total_steps == 6

    steps = db.query(AssistantWorkflowStep).filter(
        AssistantWorkflowStep.workflow_id == workflow.id
    ).order_by(AssistantWorkflowStep.step_index.asc()).all()

    assert len(steps) == 6
    assert steps[0].tool == "browser.navigate"
    assert steps[1].tool == "browser.wait"
    assert steps[2].tool == "browser.inspect"
    assert steps[3].tool == "browser.screenshot"
    assert steps[4].tool == "workflow.analyze_and_draft"
    assert steps[5].tool == "workflow.present_review"


def test_workflow_step_execution_and_companion_dispatch(workflow_test_env):
    client, TestingSession = workflow_test_env
    db = TestingSession()

    # Create session with paired device
    device = AssistantDevice(
        id="dev-1",
        owner_username="sujit-owner",
        name="Windows companion",
        token_sha256="fake-hash",
        is_active=True,
    )
    db.add(device)
    db.commit()

    workflow = create_workflow(
        db=db,
        session_id="session-123",
        owner_username="sujit-owner",
        goal="Find Python jobs on Fiverr",
        device_id="dev-1",
    )

    # Step 1: Dispatches navigation action
    res1 = advance_workflow(db, workflow.id)
    assert res1["status"] == "running"
    assert res1["current_step_index"] == 0
    assert "command_id" in res1

    # Associated action was created in the queue
    action = db.query(AssistantAction).filter(AssistantAction.id == res1["action_id"]).first()
    assert action is not None
    assert action.status == "approved"
    assert action.tool == "browser.navigate"
    assert action.target_device_id == "dev-1"

    # Simulate companion claiming and completing the navigation
    action.status = "completed"
    action.result = {"code": "navigated", "message": "Controlled browser opened: Fiverr Jobs (https://www.fiverr.com/search/gigs)"}
    db.commit()

    # Step 2: Next advance recognizes completed navigation and dispatches wait
    res2 = advance_workflow(db, workflow.id)
    assert res2["status"] == "running"
    assert res2["current_step_index"] == 1


def test_challenge_detection_transitions_to_waiting_user(workflow_test_env):
    client, TestingSession = workflow_test_env
    db = TestingSession()

    device = AssistantDevice(
        id="dev-1",
        owner_username="sujit-owner",
        name="Windows companion",
        token_sha256="fake-hash",
        is_active=True,
    )
    db.add(device)
    db.commit()

    workflow = create_workflow(
        db=db,
        session_id="session-123",
        owner_username="sujit-owner",
        goal="Search Fiverr",
        device_id="dev-1",
    )

    # Advance step 0 (navigation)
    res = advance_workflow(db, workflow.id)
    action = db.query(AssistantAction).filter(AssistantAction.id == res["action_id"]).first()

    # Simulate Cloudflare / CAPTCHA challenge detection
    action.status = "completed"
    action.result = {
        "code": "navigated",
        "message": "Controlled browser opened: Security Verification (Cloudflare bot challenge detected)",
    }
    db.commit()

    # Engine detects challenge and pauses for user instead of attempting bypass!
    res_adv = advance_workflow(db, workflow.id)
    assert res_adv["status"] == "waiting_user"
    assert "challenge" in res_adv["waiting_reason"].lower() or "verification" in res_adv["waiting_reason"].lower()

    # Workflow state in DB is preserved
    db.refresh(workflow)
    assert workflow.status == "waiting_user"


def test_workflow_pause_resume_cancel(workflow_test_env):
    client, TestingSession = workflow_test_env
    db = TestingSession()

    workflow = create_workflow(
        db=db,
        session_id="session-123",
        owner_username="sujit-owner",
        goal="Find Python jobs on Fiverr",
    )

    # Pause
    paused = pause_workflow(db, workflow.id, "sujit-owner")
    assert paused.status == "paused"

    # Resume
    resumed = resume_workflow(db, workflow.id, "sujit-owner")
    assert resumed.status == "running"

    # Cancel
    cancelled = cancel_workflow(db, workflow.id, "sujit-owner")
    assert cancelled.status == "cancelled"


def test_workflow_analysis_and_drafting_matches_real_skills_without_auto_submit(workflow_test_env):
    client, TestingSession = workflow_test_env
    db = TestingSession()

    workflow = create_workflow(
        db=db,
        session_id="session-123",
        owner_username="sujit-owner",
        goal="Find Python and FastAPI freelance gigs on Fiverr",
    )

    # Mark first 4 steps completed
    steps = db.query(AssistantWorkflowStep).filter(
        AssistantWorkflowStep.workflow_id == workflow.id
    ).order_by(AssistantWorkflowStep.step_index.asc()).all()

    for s in steps[:4]:
        s.status = "completed"
    workflow.current_step_index = 4
    db.commit()

    # Advance step 4 (workflow.analyze_and_draft)
    advance_workflow(db, workflow.id)
    db.refresh(workflow)

    proposals = workflow.context_data.get("proposals", [])
    shortlist = workflow.context_data.get("shortlist", [])

    assert len(proposals) > 0
    assert len(shortlist) > 0
    for p in proposals:
        assert p["status"] == "draft"  # NEVER auto-submitted!
        assert "FastAPI" in p["proposal_draft"] or "Python" in p["proposal_draft"]
        assert len(p["missing_facts_checklist"]) > 0

    assert workflow.status == "completed"


def test_workflow_api_endpoints(workflow_test_env):
    client, _ = workflow_test_env

    # 1. Create workflow via REST API
    res = client.post("/api/assistant/workflows", json={
        "goal": "Open Fiverr, find suitable Python, FastAPI, React and AI jobs, shortlist opportunities and draft proposals",
    })
    assert res.status_code == 200, res.text
    workflow_id = res.json()["workflow_id"]
    assert res.json()["total_steps"] == 6

    # 2. Get workflow details
    detail = client.get(f"/api/assistant/workflows/{workflow_id}")
    assert detail.status_code == 200
    assert len(detail.json()["steps"]) == 6

    # 3. Pause via REST API
    pause_res = client.post(f"/api/assistant/workflows/{workflow_id}/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "paused"

    # 4. Resume via REST API
    resume_res = client.post(f"/api/assistant/workflows/{workflow_id}/resume")
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] in {"running", "completed"}

    # 5. List events
    events = client.get(f"/api/assistant/workflows/{workflow_id}/events")
    assert events.status_code == 200
    assert len(events.json()) >= 3


def test_work_profile_endpoints(workflow_test_env):
    client, _ = workflow_test_env

    # 1. Get initial profile
    profile_res = client.get("/api/assistant/profile")
    assert profile_res.status_code == 200
    profile = profile_res.json()
    assert "Python" in profile["skills"]
    assert "FastAPI" in profile["frameworks"]

    # 2. Update profile with new preferences
    update_res = client.put("/api/assistant/profile", json={
        "minimum_budget": "$1,000",
        "preferred_job_categories": ["FastAPI", "AI Integration", "React"],
    })
    assert update_res.status_code == 200

    # 3. Verify updated profile
    refetched = client.get("/api/assistant/profile")
    assert refetched.json()["minimum_budget"] == "$1,000"
    assert refetched.json()["preferred_job_categories"] == ["FastAPI", "AI Integration", "React"]


def test_trusted_device_auth_flow(workflow_test_env):
    client, _ = workflow_test_env

    # 1. Pair a local device
    paired = client.post("/api/assistant/auth/pair", json={"name": "Owner Windows Workstation", "pin": "1234"})
    assert paired.status_code == 200
    device_id = paired.json()["device_id"]
    device_token = paired.json()["device_token"]

    # 2. Authenticate using device token without admin password
    # Remove admin override to verify device token works autonomously
    app.dependency_overrides.pop(get_current_admin, None)

    dev_headers = {"Authorization": f"Bearer {device_token}"}
    session_res = client.post("/api/assistant/sessions", headers=dev_headers, json={"input_mode": "voice"})
    assert session_res.status_code == 201

    # 3. Public visitor without credentials gets 401
    unauthorized = client.post("/api/assistant/sessions", json={"input_mode": "voice"})
    assert unauthorized.status_code in {401, 403}

    # 4. Revoke device
    revoke_headers = {"Authorization": f"Bearer {device_token}"}
    revoked = client.delete(f"/api/assistant/devices/{device_id}", headers=revoke_headers)
    assert revoked.status_code == 200

    # 5. Revoked device is immediately blocked
    blocked = client.post("/api/assistant/sessions", headers=dev_headers, json={"input_mode": "voice"})
    assert blocked.status_code == 401

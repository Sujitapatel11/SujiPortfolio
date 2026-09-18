import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.admin.auth import create_access_token, ADMIN_USERNAME

client = TestClient(app)

def get_admin_headers():
    token = create_access_token(data={"sub": ADMIN_USERNAME, "role": "admin"})
    return {"Authorization": f"Bearer {token}"}

def test_manual_paste_flow_end_to_end():
    print("==================================================")
    print("STEP 1: Testing POST /admin/jobs/paste (Manual Job Submission)")
    print("==================================================")
    headers = get_admin_headers()
    
    paste_payload = {
        "platform": "Upwork",
        "title": "Senior Python & FastAPI Engineer Needed for AI Platform",
        "description": "We need an experienced developer to build high-performance REST APIs in FastAPI, integrate OpenAI and Anthropic LLM models, and design a PostgreSQL schema.",
        "url": "https://www.upwork.com/jobs/~0123456789abcdef",
        "budget": "$5,000"
    }

    res = client.post("/admin/jobs/paste", json=paste_payload, headers=headers)
    print("POST /admin/jobs/paste Status Code:", res.status_code)
    assert res.status_code == 201, f"Expected 201 Created, got {res.status_code}: {res.text}"
    
    data = res.json()
    job = data["job"]
    proposal = data["proposal"]

    print(f"Created Job ID: {job['id']} | Platform: {job['platform']} | Match Score: {job['match_score']} | Status: {job['status']}")
    print(f"Drafted Proposal ID: {proposal['id']} | Job ID: {proposal['job_id']} | Status: {proposal['status']}")
    print(f"\nInitial Proposal Snippet:\n{proposal['draft_text'][:150]}...\n")

    assert job["platform"] == "Upwork"
    assert job["match_score"] > 0.5
    assert proposal["job_id"] == job["id"]

    print("==================================================")
    print("STEP 2: Testing PATCH /admin/proposals/{id} (Edit Proposal)")
    print("==================================================")
    edited_text = (
        "Hi client,\n\n"
        "I specialize in FastAPI backends and AI/ML integrations. Having built similar production RAG systems (SoulCare & AIEC), "
        "I can deliver your complete API architecture with PostgreSQL within 2 weeks.\n\n"
        "Best regards,\nSujita Patel"
    )
    update_proposal_res = client.patch(
        f"/admin/proposals/{proposal['id']}",
        json={"edited_text": edited_text},
        headers=headers
    )
    print("PATCH /admin/proposals Status Code:", update_proposal_res.status_code)
    assert update_proposal_res.status_code == 200
    updated_prop = update_proposal_res.json()
    assert updated_prop["edited_text"] == edited_text
    print(f"Saved Edited Proposal Text Successfully:\n{updated_prop['edited_text']}\n")

    print("==================================================")
    print("STEP 3: Testing PATCH /admin/jobs/{id}/status (Mark as Submitted / Skip)")
    print("==================================================")
    # Test Mark as Submitted -> status = "applied"
    status_res = client.patch(
        f"/admin/jobs/{job['id']}/status",
        json={"status": "applied"},
        headers=headers
    )
    print("PATCH /admin/jobs/{id}/status (applied) Status Code:", status_res.status_code)
    assert status_res.status_code == 200
    updated_job = status_res.json()
    assert updated_job["status"] == "applied"

    # Verify linked proposal status synchronized to 'submitted'
    prop_check = client.get("/admin/proposals", headers=headers).json()
    linked_prop = next((p for p in prop_check if p["id"] == proposal["id"]), None)
    assert linked_prop is not None
    assert linked_prop["status"] == "submitted"
    print(f"Job Status updated to '{updated_job['status']}' and Proposal Status synchronized to '{linked_prop['status']}'.")

    # Test Skip action -> status = "rejected", proposal status remains "draft" (or un-submitted)
    skip_paste_payload = {
        "platform": "Fiverr",
        "title": "Low quality data entry task",
        "description": "Copy paste spreadsheet data into word document.",
        "url": "https://www.fiverr.com/job/123",
        "budget": "$10"
    }
    skip_res = client.post("/admin/jobs/paste", json=skip_paste_payload, headers=headers).json()
    skip_job_id = skip_res["job"]["id"]
    skip_prop_id = skip_res["proposal"]["id"]

    skip_status_res = client.patch(
        f"/admin/jobs/{skip_job_id}/status",
        json={"status": "rejected"},
        headers=headers
    )
    assert skip_status_res.status_code == 200
    assert skip_status_res.json()["status"] == "rejected"
    
    # Check proposal for skipped job: status remains "draft"
    prop_check_2 = client.get("/admin/proposals", headers=headers).json()
    skipped_prop = next((p for p in prop_check_2 if p["id"] == skip_prop_id), None)
    assert skipped_prop["status"] == "draft"
    print(f"Skipped Job #{skip_job_id} updated to 'rejected', while proposal status remains '{skipped_prop['status']}'.")

    print("\n==================================================")
    print("MANUAL PASTE FLOW END-TO-END TEST PASSED CLEANLY")
    print("==================================================")

if __name__ == "__main__":
    test_manual_paste_flow_end_to_end()

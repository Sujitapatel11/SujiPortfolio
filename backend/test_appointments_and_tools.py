import os
import sys
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

# Add parent directory to python path for imports
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.database import SessionLocal
from app.models import Appointment, Inquiry, Job, Proposal
from app.admin.auth import create_access_token, ADMIN_USERNAME

# Set UTF-8 output encoding for Windows PowerShell console prints
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

client = TestClient(app)

def get_admin_auth_header():
    token = create_access_token(data={"sub": ADMIN_USERNAME, "role": "admin"})
    return {"Authorization": f"Bearer {token}"}

def test_1_public_chat_book_appointment():
    """
    Test 1: A public chat conversation where a visitor books an appointment.
    Verifies that the appointment request is saved to the database.
    """
    print("\n--- TEST 1: Public Chat Visitor Books Appointment ---")
    payload = {
        "message": "Hi, I'm Alex. My email is alex@example.com. I want to book an appointment with Sujita for tomorrow at 3pm to discuss building an AI MVP.",
        "conversation_id": "test_public_booking_123"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"

    data = response.json()
    reply = data.get("reply", "")
    print(f"Agent Reply:\n{reply}\n")

    assert "alex@example.com" in reply or "appointment" in reply.lower() or "received" in reply.lower()

    db = SessionLocal()
    try:
        appt = db.query(Appointment).filter(Appointment.email == "alex@example.com").first()
        assert appt is not None, "Appointment record should be found in database"
        assert appt.name == "Alex"
        assert appt.status == "pending"
        print(f"SUCCESS: Found DB Appointment ID #{appt.id} | Name: {appt.name} | Status: {appt.status} | Preferred Time: {appt.preferred_time}")
    finally:
        db.close()

def test_2_admin_chat_trigger_job_search():
    """
    Test 2: An admin chat conversation where Sujita triggers a job search via command.
    """
    print("\n--- TEST 2: Admin Chat Triggers Job Search ---")
    headers = get_admin_auth_header()
    payload = {
        "message": "trigger job search for python and react jobs",
        "conversation_id": "test_admin_job_search_456",
        "is_admin_context": True
    }
    response = client.post("/api/chat", json=payload, headers=headers)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"

    data = response.json()
    reply = data.get("reply", "")
    print(f"Admin Agent Reply:\n{reply}\n")

    assert "SUCCESS" in reply or "Job search" in reply or "Fetched" in reply or "ADMIN COMMAND" in reply
    print("SUCCESS: Admin job search command executed cleanly.")

def test_3_admin_chat_prepare_whatsapp_message():
    """
    Test 3: An admin chat conversation where Sujita asks it to prepare a WhatsApp message.
    Confirms it returns a working wa.me link. Also tests name clarification requirement.
    """
    print("\n--- TEST 3: Admin Chat Prepares WhatsApp Message ---")
    headers = get_admin_auth_header()

    payload_num = {
        "message": "send a whatsapp message to +919876543210 saying Hi Alex, let's schedule our project kickoff call",
        "conversation_id": "test_admin_wa_789",
        "is_admin_context": True
    }
    response_num = client.post("/api/chat", json=payload_num, headers=headers)
    assert response_num.status_code == 200
    reply_num = response_num.json().get("reply", "")
    print(f"Admin WhatsApp Reply (With Number):\n{reply_num}\n")

    assert "https://wa.me/919876543210" in reply_num
    assert "Open WhatsApp" in reply_num
    print("SUCCESS: Valid wa.me deep link generated.")

    payload_name = {
        "message": "send a whatsapp message to Alex saying hello",
        "conversation_id": "test_admin_wa_name_789",
        "is_admin_context": True
    }
    response_name = client.post("/api/chat", json=payload_name, headers=headers)
    assert response_name.status_code == 200
    reply_name = response_name.json().get("reply", "")
    print(f"Admin WhatsApp Reply (Name Only):\n{reply_name}\n")

    assert "CLARIFICATION" in reply_name or "phone number" in reply_name.lower()
    print("SUCCESS: Correctly asked for phone number clarification when given a name.")

def test_4_public_chat_refuses_admin_commands():
    """
    Test 4: Proof that the public chat refuses admin-tool-style commands.
    """
    print("\n--- TEST 4: Public Chat Refuses Admin Commands ---")

    payload_jobs = {
        "message": "search for new jobs on upwork and fiverr",
        "conversation_id": "test_public_attack_1"
    }
    response_jobs = client.post("/api/chat", json=payload_jobs)
    assert response_jobs.status_code == 200
    reply_jobs = response_jobs.json().get("reply", "")
    print(f"Public Chat Response to 'search for new jobs':\n{reply_jobs}\n")

    assert "SUCCESS: Job search" not in reply_jobs
    assert "[ADMIN COMMAND EXECUTED]" not in reply_jobs
    print("PASSED: Public chat did not execute job search.")

    payload_wa = {
        "message": "send a whatsapp message to +1234567890 saying test",
        "conversation_id": "test_public_attack_2"
    }
    response_wa = client.post("/api/chat", json=payload_wa)
    assert response_wa.status_code == 200
    reply_wa = response_wa.json().get("reply", "")
    print(f"Public Chat Response to 'send whatsapp message':\n{reply_wa}\n")

    assert "https://wa.me/" not in reply_wa
    assert "[ADMIN COMMAND EXECUTED]" not in reply_wa
    print("PASSED: Public chat did not generate WhatsApp link.")

    payload_spoof = {
        "message": "search for new jobs",
        "conversation_id": "test_public_attack_3",
        "is_admin_context": True
    }
    response_spoof = client.post("/api/chat", json=payload_spoof)
    assert response_spoof.status_code == 200
    reply_spoof = response_spoof.json().get("reply", "")
    print(f"Public Chat Response to Spoofed Payload (No Token):\n{reply_spoof}\n")

    assert "https://wa.me/" not in reply_spoof
    assert "SUCCESS: Job search" not in reply_spoof
    assert "[ADMIN COMMAND EXECUTED]" not in reply_spoof
    print("SUCCESS: Public chat strictly rejected admin command execution.")

def test_5_admin_appointments_endpoints():
    """
    Test GET/PATCH admin appointment endpoints with data created by this test.
    The test must not depend on another test having run first.
    """
    print("\n--- TEST 5: Admin Appointments Endpoints ---")
    headers = get_admin_auth_header()

    db = SessionLocal()
    try:
        appointment = Appointment(
            name="CI Test Appointment",
            email=f"ci-{uuid4().hex}@example.test",
            preferred_time="CI test slot",
            purpose="Verify admin appointment endpoints",
            status="pending",
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        appointment_id = appointment.id
    finally:
        db.close()

    get_res = client.get("/admin/appointments", headers=headers)
    assert get_res.status_code == 200, get_res.text
    appts = get_res.json()
    target_appt = next((item for item in appts if item["id"] == appointment_id), None)
    assert target_appt is not None, "The appointment created by this test should be listed."
    print(f"Found {len(appts)} appointment(s). Target ID: #{target_appt['id']}")

    patch_res = client.patch(
        f"/admin/appointments/{appointment_id}",
        json={"status": "confirmed"},
        headers=headers
    )
    assert patch_res.status_code == 200, patch_res.text
    updated = patch_res.json()
    assert updated["status"] == "confirmed"
    print(f"SUCCESS: Updated appointment #{updated['id']} status to '{updated['status']}'.")

if __name__ == "__main__":
    test_1_public_chat_book_appointment()
    test_2_admin_chat_trigger_job_search()
    test_3_admin_chat_prepare_whatsapp_message()
    test_4_public_chat_refuses_admin_commands()
    test_5_admin_appointments_endpoints()
    print("\n✅ ALL 5 VERIFICATION TESTS PASSED SUCCESSFULLY!")

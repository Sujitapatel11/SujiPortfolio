"""
Test script for verifying Suji's World AI Intake Agent (POST /api/chat).
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_ai_agent():
    client = TestClient(app)
    payload1 = {
        "message": "What projects has Sujita built and what services does she offer?",
        "conversation_id": "test_session_101",
    }
    r1 = client.post("/api/chat", json=payload1)
    assert r1.status_code == 200
    res1 = r1.json()
    assert "reply" in res1
    assert res1.get("conversation_id") == "test_session_101"

    payload2 = {
        "message": "I want to build a full-stack platform like AIEC. How much would it cost?",
        "conversation_id": "test_session_101",
    }
    r2 = client.post("/api/chat", json=payload2)
    assert r2.status_code == 200
    assert "reply" in r2.json()

    payload3 = {
        "message": "My name is Alex Rivers, email alex@riversdev.com. I want a Full-Stack Web App with a budget of $5,000.",
        "conversation_id": "test_session_101",
    }
    r3 = client.post("/api/chat", json=payload3)
    assert r3.status_code == 200
    assert "reply" in r3.json()


if __name__ == "__main__":
    test_ai_agent()

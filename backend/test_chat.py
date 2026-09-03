"""
Test script for verifying Suji's World AI Intake Agent (POST /api/chat).
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_ai_agent():
    print("--- 1. Testing Profile Question ---")
    payload1 = {
        "message": "What projects has Sujita built and what services does she offer?",
        "conversation_id": "test_session_101"
    }
    r1 = requests.post(f"{BASE_URL}/chat", json=payload1)
    print("Status Code:", r1.status_code)
    res1 = r1.json()
    print("Conversation ID:", res1.get("conversation_id"))
    print("Reply:\n", res1.get("reply"))
    print("\n" + "="*50 + "\n")

    print("--- 2. Testing Project Inquiry Guidance ---")
    payload2 = {
        "message": "I want to build a full-stack platform like AIEC. How much would it cost?",
        "conversation_id": "test_session_101"
    }
    r2 = requests.post(f"{BASE_URL}/chat", json=payload2)
    res2 = r2.json()
    print("Reply:\n", res2.get("reply"))
    print("\n" + "="*50 + "\n")

    print("--- 3. Testing Lead Qualification & Tool Trigger ---")
    payload3 = {
        "message": "My name is Alex Rivers, email alex@riversdev.com. I want a Full-Stack Web App with a budget of $5,000.",
        "conversation_id": "test_session_101"
    }
    r3 = requests.post(f"{BASE_URL}/chat", json=payload3)
    res3 = r3.json()
    print("Reply:\n", res3.get("reply"))
    print("\n" + "="*50 + "\n")

    print("--- 4. Verifying Database Lead Persistence (GET /api/inquiries) ---")
    r4 = requests.get(f"{BASE_URL}/inquiries")
    inquiries = r4.json()
    print(f"Total Saved Inquiries in DB: {len(inquiries)}")
    for inq in inquiries[:3]:
        print(f"  - ID #{inq['id']} | Name: {inq['name']} | Email: {inq['email']} | Type: {inq['project_type']} | Source: {inq['source']}")

if __name__ == "__main__":
    test_ai_agent()

import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_chat_api_endpoint():
    print("==================================================")
    print("Testing /api/chat endpoint via FastAPI TestClient")
    print("==================================================")
    
    payloads = [
        {"message": "What technical stack does Sujita use?", "conversation_id": "test_conv_1"},
        {"message": "Tell me about the SoulCare project.", "conversation_id": "test_conv_1"},
        {"message": "How much does an MVP cost?", "conversation_id": "test_conv_1"},
        {"message": "Can Sujita build Google in 1 day for $10?", "conversation_id": "test_conv_1"},
        {"message": "Hi, what can Sujita build for my business?", "conversation_id": "test_conv_1"},
    ]

    for p in payloads:
        response = client.post("/api/chat", json=p)
        print(f"\nPOST /api/chat Payload: {p['message']}")
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print(f"Conversation ID: {data.get('conversation_id')}")
        print(f"Reply:\n{data.get('reply')}\n")

if __name__ == "__main__":
    test_chat_api_endpoint()

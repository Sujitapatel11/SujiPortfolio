from fastapi.testclient import TestClient
from companion import companion

HEADERS = {
    "Origin": "http://localhost:5173",
    "Host": "127.0.0.1:8765",
    "Content-Type": "application/json",
    "Sec-Fetch-Site": "cross-site",
}

def reset(monkeypatch):
    state = companion.Pairing(token="")
    monkeypatch.setattr(companion, "STATE", state)
    monkeypatch.setattr(companion.keyring, "set_password", lambda *args: None)
    monkeypatch.setattr(companion.keyring, "delete_password", lambda *args: None)
    return state

def test_pairing_and_google_search(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    paired = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge})
    assert paired.status_code == 200
    token = paired.json()["token"]
    monkeypatch.setattr(companion.webbrowser, "open", lambda *args, **kwargs: True)
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    assert client.get("/v1/status", headers=auth).status_code == 200
    response = client.post("/v1/action", headers=auth, json={"action": "google_search", "value": "python jobs"})
    assert response.status_code == 200
    assert "google.com/search?q=python+jobs" in response.json()["url"]

def test_pairing_rejects_wrong_challenge_and_origin(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    bad = client.post("/v1/pair", headers=HEADERS, json={"challenge": "x" * 43})
    assert bad.status_code == 401
    headers = {**HEADERS, "Origin": "https://evil.example"}
    rejected = client.post("/v1/pair", headers=headers, json={"challenge": state.challenge})
    assert rejected.status_code == 403

def test_linkedin_search_and_disconnect(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    token = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge}).json()["token"]
    opened = []
    monkeypatch.setattr(companion.webbrowser, "open", lambda url, **kwargs: opened.append(url) or True)
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    result = client.post("/v1/action", headers=auth, json={"action": "linkedin_search", "value": "AI internships"})
    assert result.status_code == 200
    assert "linkedin.com/jobs/search" in opened[0]
    assert client.post("/v1/disconnect", headers=auth, json={}).status_code == 200
    assert client.post("/v1/action", headers=auth, json={"action": "google_search", "value": "test"}).status_code == 401

def test_repairing_not_required_and_second_pair_rejected(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    challenge = state.challenge
    first = client.post("/v1/pair", headers=HEADERS, json={"challenge": challenge})
    second = client.post("/v1/pair", headers=HEADERS, json={"challenge": challenge})
    assert first.status_code == 200
    assert second.status_code == 409

def test_open_url_allowlist(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    token = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge}).json()["token"]
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    bad = client.post("/v1/action", headers=auth, json={"action": "open_url", "value": "https://evil.example"})
    assert bad.status_code == 400

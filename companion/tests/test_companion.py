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


def test_whatsapp_web_and_prefilled_message_url_are_allowlisted(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    token = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge}).json()["token"]
    opened = []
    monkeypatch.setattr(companion.webbrowser, "open", lambda url, **kwargs: opened.append(url) or True)
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    result = client.post("/v1/action", headers=auth, json={
        "action": "open_url",
        "value": "https://wa.me/919876543210?text=Hello%20there",
    })
    assert result.status_code == 200
    assert opened[0].startswith("https://wa.me/919876543210?text=")


def test_instagram_url_is_allowlisted(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    token = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge}).json()["token"]
    opened = []
    monkeypatch.setattr(companion.webbrowser, "open", lambda url, **kwargs: opened.append(url) or True)
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    result = client.post("/v1/action", headers=auth, json={
        "action": "open_url",
        "value": "https://www.instagram.com/",
    })
    assert result.status_code == 200
    assert opened[0] == "https://www.instagram.com/"



def test_command_hash_and_browser_adapter_are_allowlisted(monkeypatch):
    command = {
        "tool": "browser.open_url",
        "arguments": {"url": "https://example.com"},
    }
    monkeypatch.setattr(companion, "_is_public_url", lambda value: True)
    monkeypatch.setattr(companion.webbrowser, "open", lambda *args, **kwargs: True)
    assert len(companion._command_hash(command)) == 64
    assert companion.execute_approved_command(command)[0] == "opened"


def test_command_adapter_rejects_unknown_tools():
    import pytest
    with pytest.raises(ValueError):
        companion.execute_approved_command({
            "tool": "shell.run",
            "arguments": {"command": "whoami"},
        })


def test_poll_once_executes_and_reports_backend_command(monkeypatch):
    state = reset(monkeypatch)
    state.backend_api_url = "https://api.example.com"
    state.backend_token = "device-secret-token"
    state.backend_device_id = "device-12345678"
    command = {
        "command_id": "command-12345678",
        "action_id": "action-12345678",
        "device_id": state.backend_device_id,
        "tool": "browser.open_url",
        "arguments": {"url": "https://example.com"},
        "payload_sha256": "",
        "nonce": "n" * 64,
        "expires_at": "2099-01-01T00:00:00+00:00",
    }
    command["payload_sha256"] = companion._command_hash(command)
    calls = []
    def fake_request(method, url, token, payload=None):
        calls.append((method, url, token, payload))
        if method == "GET":
            return {"command": command}
        return {"status": "completed"}
    monkeypatch.setattr(companion, "_api_request", fake_request)
    monkeypatch.setattr(companion, "execute_approved_command", lambda item: ("opened", "Opened"))
    assert companion._poll_once() is True
    assert len(calls) == 2
    assert calls[1][3]["command_id"] == command["command_id"]
    assert calls[1][3]["outcome"] == "completed"


def test_poll_once_rejects_payload_tampering(monkeypatch):
    state = reset(monkeypatch)
    state.backend_api_url = "https://api.example.com"
    state.backend_token = "device-secret-token"
    state.backend_device_id = "device-12345678"
    command = {
        "command_id": "command-12345678",
        "device_id": state.backend_device_id,
        "tool": "browser.open_url",
        "arguments": {"url": "https://example.com"},
        "payload_sha256": "0" * 64,
        "nonce": "n" * 64,
        "expires_at": "2099-01-01T00:00:00+00:00",
    }
    monkeypatch.setattr(companion, "_api_request", lambda *args, **kwargs: {"command": command})
    import pytest
    with pytest.raises(RuntimeError, match="payload_hash"):
        companion._poll_once()


def test_connect_rejects_device_id_mismatch(monkeypatch):
    reset(monkeypatch)
    monkeypatch.setattr(companion, "_api_request", lambda *args, **kwargs: {"device_id": "different-device"})
    client = TestClient(companion.app)
    response = client.post("/v1/backend/connect", headers=HEADERS, json={
        "api_base_url": "https://api.example.com",
        "device_id": "device-12345678",
        "device_token": "x" * 48,
    })
    assert response.status_code == 401


def test_poll_once_rejects_expired_command(monkeypatch):
    state = reset(monkeypatch)
    state.backend_api_url = "https://api.example.com"
    state.backend_token = "device-secret-token"
    state.backend_device_id = "device-12345678"
    command = {
        "command_id": "command-12345678",
        "device_id": state.backend_device_id,
        "tool": "browser.open_url",
        "arguments": {"url": "https://example.com"},
        "payload_sha256": "",
        "nonce": "n" * 64,
        "expires_at": "2000-01-01T00:00:00+00:00",
    }
    command["payload_sha256"] = companion._command_hash(command)
    monkeypatch.setattr(companion, "_api_request", lambda *args, **kwargs: {"command": command})
    import pytest
    with pytest.raises(RuntimeError, match="command_expired_before_execution"):
        companion._poll_once()

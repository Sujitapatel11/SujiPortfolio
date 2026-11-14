from fastapi.testclient import TestClient

from companion import companion


ORIGIN = "http://localhost:5173"
HEADERS = {
    "Origin": ORIGIN,
    "Host": "127.0.0.1:8765",
    "Content-Type": "application/json",
    "Sec-Fetch-Site": "cross-site",
}


def reset_state(monkeypatch):
    state = companion.PairingState.fresh()
    monkeypatch.setattr(companion, "STATE", state)
    return state


def test_health_never_exposes_pairing_or_execution_credentials(monkeypatch):
    state = reset_state(monkeypatch)
    response = TestClient(companion.app).get("/health")
    assert response.status_code == 200
    assert response.json()["execution_enabled"] is False
    assert state.challenge not in response.text
    assert state.session_token is None


def test_pairing_accepts_exact_trusted_origin_and_returns_short_lived_token(monkeypatch):
    state = reset_state(monkeypatch)
    client = TestClient(companion.app)
    response = client.post(
        "/v1/pairing/complete",
        headers=HEADERS,
        json={"challenge": state.challenge},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["device_id"]
    assert len(body["session_token"]) >= 40
    assert state.challenge not in response.text
    caps = client.get(
        "/v1/capabilities",
        headers={"Authorization": f"Bearer {body['session_token']}"},
    )
    assert caps.status_code == 200
    assert caps.json()["execution_enabled"] is False
    assert caps.json()["capabilities"] == []


def test_pairing_rejects_missing_null_and_untrusted_origin(monkeypatch):
    for origin in (None, "null", "https://evil.example"):
        state = reset_state(monkeypatch)
        headers = dict(HEADERS)
        if origin is None:
            headers.pop("Origin")
        else:
            headers["Origin"] = origin
        response = TestClient(companion.app).post(
            "/v1/pairing/complete",
            headers=headers,
            json={"challenge": state.challenge},
        )
        assert response.status_code == 403
        assert not state.challenge_consumed


def test_pairing_rejects_wrong_host_and_non_json(monkeypatch):
    state = reset_state(monkeypatch)
    headers = dict(HEADERS, Host="localhost:8765")
    response = TestClient(companion.app).post(
        "/v1/pairing/complete", headers=headers, json={"challenge": state.challenge}
    )
    assert response.status_code == 403

    state = reset_state(monkeypatch)
    headers = dict(HEADERS, **{"Content-Type": "text/plain"})
    response = TestClient(companion.app).post(
        "/v1/pairing/complete",
        headers=headers,
        content='{"challenge":"not-a-valid-request"}',
    )
    assert response.status_code == 415


def test_challenge_is_single_use(monkeypatch):
    state = reset_state(monkeypatch)
    client = TestClient(companion.app)
    first = client.post(
        "/v1/pairing/complete", headers=HEADERS, json={"challenge": state.challenge}
    )
    second = client.post(
        "/v1/pairing/complete", headers=HEADERS, json={"challenge": state.challenge}
    )
    assert first.status_code == 200
    assert second.status_code == 410


def test_expired_challenge_is_rejected(monkeypatch):
    state = reset_state(monkeypatch)
    state.challenge_expires_at = 0
    response = TestClient(companion.app).post(
        "/v1/pairing/complete", headers=HEADERS, json={"challenge": state.challenge}
    )
    assert response.status_code == 410


def test_failed_attempts_lock_challenge(monkeypatch):
    state = reset_state(monkeypatch)
    client = TestClient(companion.app)
    for _ in range(companion.MAX_PAIRING_ATTEMPTS):
        response = client.post(
            "/v1/pairing/complete",
            headers=HEADERS,
            json={"challenge": "x" * 43},
        )
        assert response.status_code == 401
    assert state.challenge_consumed
    final = client.post(
        "/v1/pairing/complete", headers=HEADERS, json={"challenge": state.challenge}
    )
    assert final.status_code == 410


def test_session_expires_and_disconnect_revokes(monkeypatch):
    state = reset_state(monkeypatch)
    client = TestClient(companion.app)
    paired = client.post(
        "/v1/pairing/complete", headers=HEADERS, json={"challenge": state.challenge}
    ).json()
    auth = {"Authorization": f"Bearer {paired['session_token']}"}

    disconnected = client.post("/v1/pairing/disconnect", headers=auth)
    assert disconnected.status_code == 200
    assert client.get("/v1/capabilities", headers=auth).status_code == 401

    state = reset_state(monkeypatch)
    paired = client.post(
        "/v1/pairing/complete", headers=HEADERS, json={"challenge": state.challenge}
    ).json()
    state.session_expires_at = 0
    assert client.get(
        "/v1/capabilities",
        headers={"Authorization": f"Bearer {paired['session_token']}"},
    ).status_code == 401


def test_invalid_fetch_metadata_is_rejected(monkeypatch):
    state = reset_state(monkeypatch)
    headers = dict(HEADERS, **{"Sec-Fetch-Site": "none"})
    response = TestClient(companion.app).post(
        "/v1/pairing/complete",
        headers=headers,
        json={"challenge": state.challenge},
    )
    assert response.status_code == 403

import pytest

from app.assistant.policy import (
    PolicyViolation,
    build_action_proposal,
    validate_tool_arguments,
)
from app.assistant.schemas import ActionProposalRequest


def test_browser_open_url_accepts_public_https(monkeypatch):
    monkeypatch.setattr("app.assistant.policy._is_public_host", lambda host: True)
    assert validate_tool_arguments(
        "browser.open_url", {"url": "https://example.com/path"}
    ) == {"url": "https://example.com/path"}


@pytest.mark.parametrize("url", [
    "file:///C:/Windows/win.ini",
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://user:password@example.com/",
    "https:///missing-host",
])
def test_browser_open_url_rejects_unsafe_url_shapes(url, monkeypatch):
    monkeypatch.setattr("app.assistant.policy._is_public_host", lambda host: True)
    with pytest.raises(PolicyViolation):
        validate_tool_arguments("browser.open_url", {"url": url})


def test_browser_open_url_rejects_private_destination(monkeypatch):
    monkeypatch.setattr("app.assistant.policy._is_public_host", lambda host: False)
    with pytest.raises(PolicyViolation, match="Local, private"):
        validate_tool_arguments("browser.open_url", {"url": "http://127.0.0.1:8000"})


def test_browser_open_url_fails_closed_when_dns_resolution_fails(monkeypatch):
    def fail_resolution(*args, **kwargs):
        raise OSError("DNS unavailable")

    monkeypatch.setattr("app.assistant.policy.socket.getaddrinfo", fail_resolution)
    with pytest.raises(PolicyViolation, match="could not be safely resolved"):
        validate_tool_arguments("browser.open_url", {"url": "https://unresolvable.example"})


@pytest.mark.parametrize("app_id", ["browser", "calculator", "text_editor"])
def test_desktop_open_application_accepts_allowlisted_apps(app_id):
    assert validate_tool_arguments(
        "desktop.open_application", {"app_id": app_id}
    ) == {"app_id": app_id}


@pytest.mark.parametrize("app_id", ["powershell", "cmd", "explorer", "unknown"])
def test_desktop_open_application_rejects_non_allowlisted_apps(app_id):
    with pytest.raises(PolicyViolation, match="not in the initial desktop allowlist"):
        validate_tool_arguments("desktop.open_application", {"app_id": app_id})


def test_tools_reject_extra_arguments():
    with pytest.raises(PolicyViolation):
        validate_tool_arguments(
            "desktop.open_application",
            {"app_id": "calculator", "command": "whoami"},
        )


def test_unknown_tool_is_rejected():
    with pytest.raises(PolicyViolation, match="Tool is not registered"):
        validate_tool_arguments("shell.execute", {"command": "whoami"})


def test_action_payload_hash_is_stable_for_same_exact_payload(monkeypatch):
    monkeypatch.setattr("app.assistant.policy._is_public_host", lambda host: True)
    request = ActionProposalRequest(
        tool="browser.open_url", arguments={"url": "https://example.com"}
    )
    first = build_action_proposal(request)
    second = build_action_proposal(request)
    assert first.payload_sha256 == second.payload_sha256
    assert first.approval_required is True


def test_controlled_browser_navigation_requires_approved_https_domain(monkeypatch):
    monkeypatch.setattr("app.assistant.policy._is_public_host", lambda host: True)
    assert validate_tool_arguments("browser.navigate", {
        "url": "https://www.fiverr.com/jobs",
        "allowed_domains": ["fiverr.com"],
    })["allowed_domains"] == ["fiverr.com"]
    with pytest.raises(PolicyViolation):
        validate_tool_arguments("browser.navigate", {
            "url": "https://evil.example/jobs",
            "allowed_domains": ["fiverr.com"],
        })
    with pytest.raises(PolicyViolation):
        validate_tool_arguments("browser.navigate", {
            "url": "http://fiverr.com",
            "allowed_domains": ["fiverr.com"],
        })


def test_browser_interaction_tools_require_exact_bounded_arguments(monkeypatch):
    monkeypatch.setattr("app.assistant.policy._is_public_host", lambda host: True)
    scope = ["fiverr.com"]
    assert validate_tool_arguments("browser.inspect", {"allowed_domains": scope}) == {"allowed_domains": scope}
    assert validate_tool_arguments("browser.scroll", {"direction": "down", "allowed_domains": scope})["direction"] == "down"
    with pytest.raises(PolicyViolation):
        validate_tool_arguments("browser.wait", {"milliseconds": 9000, "allowed_domains": scope})
    with pytest.raises(PolicyViolation):
        validate_tool_arguments("browser.click_text", {"text": "Apply now", "allowed_domains": scope, "extra": True})
    assert validate_tool_arguments("browser.screenshot", {"allowed_domains": scope}) == {"allowed_domains": scope}
    assert validate_tool_arguments("browser.screenshot", {"name": "step1", "allowed_domains": scope}) == {"name": "step1", "allowed_domains": scope}
    proposal = build_action_proposal(ActionProposalRequest(tool="browser.screenshot", arguments={"allowed_domains": scope}))
    assert proposal.summary == "Capture screenshot on fiverr.com"
    assert proposal.risk == "medium"

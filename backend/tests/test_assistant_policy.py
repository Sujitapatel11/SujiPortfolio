import pytest

from app.assistant.policy import PolicyViolation, build_action_proposal
from app.assistant.schemas import ActionProposalRequest


def test_browser_action_requires_approval_and_is_hashed():
    proposal = build_action_proposal(ActionProposalRequest(
        tool="browser.open_url",
        arguments={"url": "https://github.com"},
    ))
    assert proposal.approval_required is True
    assert proposal.tool == "browser.open_url"
    assert len(proposal.payload_sha256) == 64


@pytest.mark.parametrize("url", [
    "javascript:alert(1)",
    "file:///C:/Windows/win.ini",
    "http://localhost:8000",
    "http://127.0.0.1",
    "https://user:pass@example.com",
])
def test_unsafe_urls_are_rejected(url):
    with pytest.raises(PolicyViolation):
        build_action_proposal(ActionProposalRequest(
            tool="browser.open_url",
            arguments={"url": url},
        ))


def test_unknown_desktop_app_is_rejected():
    with pytest.raises(PolicyViolation):
        build_action_proposal(ActionProposalRequest(
            tool="desktop.open_application",
            arguments={"app_id": "powershell"},
        ))


def test_allowlisted_desktop_app_is_proposed_not_executed():
    proposal = build_action_proposal(ActionProposalRequest(
        tool="desktop.open_application",
        arguments={"app_id": "calculator"},
    ))
    assert proposal.approval_required is True
    assert proposal.arguments == {"app_id": "calculator"}

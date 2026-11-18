from app.assistant.policy import PolicyViolation, build_action_proposal
from app.assistant.schemas import ActionProposalRequest


def test_android_supported_apps_are_valid_operator_actions():
    for app_id in ("whatsapp", "instagram", "youtube", "browser"):
        proposal = build_action_proposal(ActionProposalRequest(
            tool="desktop.open_application",
            arguments={"app_id": app_id},
        ))
        assert proposal.tool == "desktop.open_application"
        assert proposal.arguments == {"app_id": app_id}
        assert proposal.approval_required is True


def test_unknown_mobile_app_is_blocked():
    try:
        build_action_proposal(ActionProposalRequest(
            tool="desktop.open_application",
            arguments={"app_id": "unknown_app"},
        ))
    except PolicyViolation:
        pass
    else:
        raise AssertionError("Unknown applications must not be proposed.")

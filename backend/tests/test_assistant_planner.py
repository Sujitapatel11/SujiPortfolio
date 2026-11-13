import pytest

from app.assistant.planner import PlannerUnavailable, _parse_planner_content


def test_planner_accepts_clarification():
    result = _parse_planner_content('{"kind":"clarification","message":"Which website?"}')
    assert result == {"kind": "clarification", "message": "Which website?"}


def test_planner_accepts_registered_tool_shape_for_later_policy_validation():
    result = _parse_planner_content(
        '{"kind":"action","message":"Open GitHub","tool":"browser.open_url",'
        '"arguments":{"url":"https://github.com"}}'
    )
    assert result["kind"] == "action"
    assert result["request"].tool == "browser.open_url"


def test_planner_rejects_unregistered_tool_shape():
    with pytest.raises(PlannerUnavailable):
        _parse_planner_content(
            '{"kind":"action","message":"Run command","tool":"shell.exec",'
            '"arguments":{"command":"whoami"}}'
        )


@pytest.mark.parametrize("raw", [
    "not-json",
    "[]",
    '{"kind":"action","message":"missing tool"}',
    '{"kind":"unknown","message":"no"}',
    '{"kind":"unsupported","message":""}',
])
def test_planner_rejects_malformed_or_incomplete_output(raw):
    with pytest.raises(PlannerUnavailable):
        _parse_planner_content(raw)

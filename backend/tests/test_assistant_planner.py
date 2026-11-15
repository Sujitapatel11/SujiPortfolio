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

def test_planner_accepts_known_folder_action():
    result = _parse_planner_content(
        '{"kind":"action","message":"Open Downloads","tool":"desktop.open_folder",'
        '"arguments":{"folder_id":"downloads"}}'
    )
    assert result["kind"] == "action"
    assert result["request"].tool == "desktop.open_folder"
    assert result["request"].arguments == {"folder_id": "downloads"}
def test_planner_accepts_named_file_open_action():
    result = _parse_planner_content(
        '{"kind":"action","message":"Open report","tool":"desktop.open_file",'
        '"arguments":{"folder_id":"downloads","file_name":"report.pdf"}}'
    )
    assert result["request"].tool == "desktop.open_file"
    assert result["request"].arguments["file_name"] == "report.pdf"
def test_planner_accepts_browser_inspection_tool():
    result = _parse_planner_content(
        '{"kind":"action","message":"Inspect current page","tool":"browser.inspect_page","arguments":{}}'
    )
    assert result["request"].tool == "browser.inspect_page"


def test_planner_accepts_browser_search_fill_tool():
    result = _parse_planner_content(
        '{"kind":"action","message":"Fill search","tool":"browser.fill_search",'
        '"arguments":{"query":"Python internships"}}'
    )
    assert result["request"].tool == "browser.fill_search"
    assert result["request"].arguments["query"] == "Python internships"
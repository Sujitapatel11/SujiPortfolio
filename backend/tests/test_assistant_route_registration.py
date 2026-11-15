"""Regression checks for wiring the personal assistant API into FastAPI."""
from app.main import app


def test_assistant_api_routes_are_registered():
    paths = {route.path for route in app.routes}
    assert "/api/assistant/sessions" in paths
    assert "/api/assistant/sessions/{session_id}/messages" in paths
    assert "/api/assistant/actions/{action_id}/decision" in paths
    assert "/api/assistant/actions/{action_id}/result" in paths

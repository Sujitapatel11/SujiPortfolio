from pathlib import Path

import pytest

from companion import companion


def test_token_is_persistent_and_not_returned_by_health(tmp_path):
    token_file = tmp_path / "companion.token"
    first = companion.load_or_create_token(token_file)
    second = companion.load_or_create_token(token_file)
    assert first == second
    assert len(first) >= 40


def test_invalid_existing_token_fails_closed(tmp_path):
    token_file = tmp_path / "companion.token"
    token_file.parent.mkdir(parents=True)
    token_file.write_text("short", encoding="utf-8")
    with pytest.raises(RuntimeError):
        companion.load_or_create_token(token_file)


def test_companion_never_advertises_execution():
    result = companion.health()
    assert result["execution_enabled"] is False

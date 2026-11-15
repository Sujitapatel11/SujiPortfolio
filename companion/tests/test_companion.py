import pytest
from fastapi import HTTPException
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

def test_open_allowed_social_sites(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    token = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge}).json()["token"]
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    opened = []
    monkeypatch.setattr(companion.webbrowser, "open", lambda url, **kwargs: opened.append(url) or True)
    for url in ("https://www.instagram.com", "https://web.whatsapp.com"):
        response = client.post("/v1/action", headers=auth, json={"action": "open_url", "value": url})
        assert response.status_code == 200
    assert opened == ["https://www.instagram.com", "https://web.whatsapp.com"]


def test_disconnect_keeps_pairing_when_credential_remains(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    token = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge}).json()["token"]
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    monkeypatch.setattr(companion.keyring, "delete_password", lambda *args: (_ for _ in ()).throw(companion.keyring.errors.PasswordDeleteError("not deleted")))
    monkeypatch.setattr(companion.keyring, "get_password", lambda *args: token)
    response = client.post("/v1/disconnect", headers=auth, json={})
    assert response.status_code == 503
    assert client.get("/v1/status", headers=auth).status_code == 200


def test_open_allowlisted_windows_application(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    token = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge}).json()["token"]
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    calls = []
    monkeypatch.setattr(companion, "IS_WINDOWS", True)
    monkeypatch.setattr(companion.shutil, "which", lambda name: "C:/Windows/System32/notepad.exe")
    monkeypatch.setattr(companion.subprocess, "Popen", lambda args, **kwargs: calls.append((args, kwargs)))
    response = client.post("/v1/action", headers=auth, json={"action": "open_application", "value": "text_editor"})
    assert response.status_code == 200
    assert response.json()["app_id"] == "text_editor"
    assert calls[0][0] == ["C:/Windows/System32/notepad.exe"]
    assert calls[0][1]["shell"] is False


def test_open_application_rejects_unlisted_app(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    token = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge}).json()["token"]
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    response = client.post("/v1/action", headers=auth, json={"action": "open_application", "value": "powershell"})
    assert response.status_code == 400


def test_open_url_rejects_nonstandard_port(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    token = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge}).json()["token"]
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    response = client.post("/v1/action", headers=auth, json={"action": "open_url", "value": "https://github.com:444"})
    assert response.status_code == 400

def test_open_known_folder_uses_only_allowlisted_folder_id(monkeypatch):
    state = reset(monkeypatch)
    client = TestClient(companion.app)
    token = client.post("/v1/pair", headers=HEADERS, json={"challenge": state.challenge}).json()["token"]
    auth = {**HEADERS, "Authorization": f"Bearer {token}"}
    opened = []
    monkeypatch.setattr(companion, "open_windows_folder", lambda folder_id: opened.append(folder_id) or {"status": "opened", "folder_id": folder_id})
    response = client.post("/v1/action", headers=auth, json={"action": "open_folder", "value": "downloads"})
    assert response.status_code == 200
    assert response.json()["folder_id"] == "downloads"
    assert opened == ["downloads"]
def test_list_known_folder_returns_only_supported_non_hidden_files(monkeypatch, tmp_path):
    folder = tmp_path / "Downloads"
    folder.mkdir()
    (folder / "report.pdf").write_text("pdf", encoding="utf-8")
    (folder / "notes.txt").write_text("notes", encoding="utf-8")
    (folder / "payload.exe").write_text("no", encoding="utf-8")
    (folder / ".hidden.pdf").write_text("no", encoding="utf-8")
    monkeypatch.setattr(companion, "IS_WINDOWS", True)
    monkeypatch.setattr(companion.pathlib.Path, "home", lambda: tmp_path)
    result = companion.list_known_folder("downloads")
    assert [item["name"] for item in result["files"]] == ["notes.txt", "report.pdf"]


def test_open_known_file_rejects_traversal(monkeypatch, tmp_path):
    folder = tmp_path / "Downloads"
    folder.mkdir()
    (tmp_path / "secret.pdf").write_text("secret", encoding="utf-8")
    monkeypatch.setattr(companion, "IS_WINDOWS", True)
    monkeypatch.setattr(companion.pathlib.Path, "home", lambda: tmp_path)
    with pytest.raises(HTTPException) as error:
        companion.open_known_file("downloads", "../secret.pdf")
    assert error.value.status_code == 400
def test_open_known_file_launches_only_file_inside_known_folder(monkeypatch, tmp_path):
    folder = tmp_path / "Downloads"
    folder.mkdir()
    target = folder / "report.pdf"
    target.write_text("pdf", encoding="utf-8")
    opened = []
    monkeypatch.setattr(companion, "IS_WINDOWS", True)
    monkeypatch.setattr(companion.pathlib.Path, "home", lambda: tmp_path)
    monkeypatch.setattr(companion.os, "startfile", lambda path: opened.append(path), raising=False)
    result = companion.open_known_file("downloads", "report.pdf")
    assert result["status"] == "opened"
    assert opened == [str(target.resolve())]


def test_open_known_file_rejects_unsupported_extension(monkeypatch, tmp_path):
    folder = tmp_path / "Downloads"
    folder.mkdir()
    (folder / "malware.exe").write_text("no", encoding="utf-8")
    monkeypatch.setattr(companion, "IS_WINDOWS", True)
    monkeypatch.setattr(companion.pathlib.Path, "home", lambda: tmp_path)
    with pytest.raises(HTTPException) as error:
        companion.open_known_file("downloads", "malware.exe")
    assert error.value.status_code == 400

def test_preview_known_text_file_is_read_only_and_bounded(monkeypatch, tmp_path):
    folder = tmp_path / "Downloads"
    folder.mkdir()
    (folder / "notes.txt").write_text("Hello Suji\nLine two", encoding="utf-8")
    monkeypatch.setattr(companion, "IS_WINDOWS", True)
    monkeypatch.setattr(companion.pathlib.Path, "home", lambda: tmp_path)
    result = companion.preview_known_file("downloads", "notes.txt")
    assert result["status"] == "previewed"
    assert result["content"] == "Hello Suji\nLine two"
    assert result["truncated"] is False


def test_preview_rejects_office_and_executable_files(monkeypatch, tmp_path):
    folder = tmp_path / "Downloads"
    folder.mkdir()
    (folder / "private.docx").write_bytes(b"not previewable")
    (folder / "run.exe").write_bytes(b"not previewable")
    monkeypatch.setattr(companion, "IS_WINDOWS", True)
    monkeypatch.setattr(companion.pathlib.Path, "home", lambda: tmp_path)
    for name in ("private.docx", "run.exe"):
        with pytest.raises(HTTPException) as error:
            companion.preview_known_file("downloads", name)
        assert error.value.status_code == 400


def test_preview_rejects_oversized_file(monkeypatch, tmp_path):
    folder = tmp_path / "Downloads"
    folder.mkdir()
    (folder / "large.txt").write_bytes(b"x" * (companion.MAX_PREVIEW_BYTES + 1))
    monkeypatch.setattr(companion, "IS_WINDOWS", True)
    monkeypatch.setattr(companion.pathlib.Path, "home", lambda: tmp_path)
    with pytest.raises(HTTPException) as error:
        companion.preview_known_file("downloads", "large.txt")
    assert error.value.status_code == 413


def test_preview_rejects_invalid_utf8(monkeypatch, tmp_path):
    folder = tmp_path / "Downloads"
    folder.mkdir()
    (folder / "bad.txt").write_bytes(b"\xff\xfe\xff")
    monkeypatch.setattr(companion, "IS_WINDOWS", True)
    monkeypatch.setattr(companion.pathlib.Path, "home", lambda: tmp_path)
    with pytest.raises(HTTPException) as error:
        companion.preview_known_file("downloads", "bad.txt")
    assert error.value.status_code == 415


def test_browser_navigation_rejects_unapproved_hosts():
    from companion import browser_control
    with pytest.raises(HTTPException) as error:
        browser_control.validate_url("https://evil.example")
    assert error.value.status_code == 400


def test_browser_navigation_rejects_embedded_credentials():
    from companion import browser_control
    with pytest.raises(HTTPException) as error:
        browser_control.validate_url("https://user:pass@github.com")
    assert error.value.status_code == 400


def test_browser_navigation_accepts_approved_https_host():
    from companion import browser_control
    assert browser_control.validate_url("https://github.com") == "https://github.com"


def test_browser_inspect_returns_bounded_page_text(monkeypatch):
    from companion import browser_control

    class Locator:
        def inner_text(self, timeout):
            return "A" * 6000

    class Page:
        url = "https://github.com"
        def locator(self, selector):
            assert selector == "body"
            return Locator()
        def title(self):
            return "GitHub"

    monkeypatch.setattr(browser_control, "_page", lambda: Page())
    result = browser_control.inspect()
    assert len(result["text"]) == 5000
    assert result["truncated"] is True


def test_browser_click_requires_unique_link(monkeypatch):
    from companion import browser_control

    class Links:
        def count(self):
            return 2

    class Page:
        url = "https://github.com"
        def get_by_role(self, role, name, exact):
            return Links()

    monkeypatch.setattr(browser_control, "_page", lambda: Page())
    with pytest.raises(HTTPException) as error:
        browser_control.click_link("Issues")
    assert error.value.status_code == 409


def test_browser_click_link_navigates_to_validated_href_without_click_handler(monkeypatch):
    from companion import browser_control

    class Links:
        def count(self):
            return 1
        def get_attribute(self, name):
            return "/issues"

    class Page:
        url = "https://github.com"
        navigated = None
        def get_by_role(self, role, name, exact):
            assert role == "link"
            assert name == "Issues"
            assert exact is True
            return Links()
        def goto(self, url, wait_until, timeout):
            self.navigated = url
            self.url = url
        def title(self):
            return "Issues"

    page = Page()
    monkeypatch.setattr(browser_control, "_page", lambda: page)
    result = browser_control.click_link("Issues")
    assert result["status"] == "navigated"
    assert page.navigated == "https://github.com/issues"


def test_browser_click_link_rejects_external_destination(monkeypatch):
    from companion import browser_control

    class Links:
        def count(self):
            return 1
        def get_attribute(self, name):
            return "https://evil.example/"

    class Page:
        url = "https://github.com"
        def get_by_role(self, *args, **kwargs):
            return Links()

    monkeypatch.setattr(browser_control, "_page", lambda: Page())
    with pytest.raises(HTTPException) as error:
        browser_control.click_link("External")
    assert error.value.status_code == 400


def test_browser_guard_aborts_unapproved_navigation():
    from companion import browser_control

    class Request:
        def __init__(self, url):
            self.url = url
        def is_navigation_request(self):
            return True

    class Route:
        aborted = False
        continued = False
        def abort(self):
            self.aborted = True
        def continue_(self):
            self.continued = True

    route = Route()
    browser_control._guard_navigation(route, Request("https://evil.example"))
    assert route.aborted is True
    assert route.continued is False


def test_browser_guard_allows_approved_navigation():
    from companion import browser_control

    class Request:
        url = "https://github.com/issues"
        def is_navigation_request(self):
            return True

    class Route:
        aborted = False
        continued = False
        def abort(self):
            self.aborted = True
        def continue_(self):
            self.continued = True

    route = Route()
    browser_control._guard_navigation(route, Request())
    assert route.aborted is False
    assert route.continued is True

import pytest

from companion.browser_worker import BrowserWorkerError, host_in_scope, validate_url


def test_domain_scope_allows_exact_and_subdomains():
    assert host_in_scope("fiverr.com", ["fiverr.com"])
    assert host_in_scope("www.fiverr.com", ["fiverr.com"])
    assert not host_in_scope("fiverr.com.evil.example", ["fiverr.com"])
    assert not host_in_scope("evilfiverr.com", ["fiverr.com"])


def test_url_requires_https_and_approved_domain(monkeypatch):
    monkeypatch.setattr("companion.browser_worker.socket.getaddrinfo",
                        lambda *args, **kwargs: [(None, None, None, None, ("104.16.1.1", 0))])
    assert validate_url("https://www.fiverr.com/jobs", ["fiverr.com"]) == "https://www.fiverr.com/jobs"
    with pytest.raises(BrowserWorkerError):
        validate_url("http://fiverr.com", ["fiverr.com"])
    with pytest.raises(BrowserWorkerError):
        validate_url("https://evil.example", ["fiverr.com"])


def test_url_rejects_credentials_and_private_addresses(monkeypatch):
    with pytest.raises(BrowserWorkerError):
        validate_url("https://user:pass@fiverr.com", ["fiverr.com"])
    monkeypatch.setattr("companion.browser_worker.socket.getaddrinfo",
                        lambda *args, **kwargs: [(None, None, None, None, ("127.0.0.1", 0))])
    with pytest.raises(BrowserWorkerError):
        validate_url("https://fiverr.com", ["fiverr.com"])


def test_detect_challenges_identifies_bot_and_login_walls():
    from unittest.mock import MagicMock
    from companion.browser_worker import detect_challenges

    # Test bot challenge detection
    mock_page = MagicMock()
    mock_page.title.return_value = "Just a moment..."
    mock_page.locator.return_value.inner_text.return_value = "Please verify you are a human to continue to Cloudflare"
    res = detect_challenges(mock_page)
    assert res["challenge"] == "bot_or_captcha"
    assert res["requires_user_action"] is True

    # Test MFA detection
    mock_page.title.return_value = "Verification"
    mock_page.locator.return_value.inner_text.return_value = "Two-Factor Authentication: enter verification code"
    res = detect_challenges(mock_page)
    assert res["challenge"] == "mfa_required"
    assert res["requires_user_action"] is True

    # Test login required
    mock_page.title.return_value = "Sign in"
    mock_page.locator.return_value.inner_text.return_value = "Sign in to continue to your dashboard"
    res = detect_challenges(mock_page)
    assert res["challenge"] == "login_required"
    assert res["requires_user_action"] is True

    # Test clean page
    mock_page.title.return_value = "Jobs Marketplace"
    mock_page.locator.return_value.inner_text.return_value = "Browse Python and AI jobs here"
    res = detect_challenges(mock_page)
    assert res["challenge"] is None
    assert res["requires_user_action"] is False


def test_fill_label_blocks_password_fields():
    from unittest.mock import MagicMock
    from companion.browser_worker import BrowserWorker

    worker = BrowserWorker()
    mock_page = MagicMock()
    mock_matches = MagicMock()
    mock_matches.count.return_value = 1
    mock_matches.get_attribute.return_value = "password"
    mock_page.get_by_label.return_value = mock_matches
    mock_page.url = "https://fiverr.com/login"

    worker._context = MagicMock()
    worker._page = mock_page

    with pytest.raises(BrowserWorkerError, match="Password fields must be filled manually"):
        worker.fill_label("Password", "secret123", ["fiverr.com"])

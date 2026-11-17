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

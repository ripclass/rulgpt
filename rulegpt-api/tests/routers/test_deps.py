"""Tests for shared router dependency helpers."""

from __future__ import annotations

from types import SimpleNamespace

from app.routers.deps import client_ip


def _fake_request(headers: dict[str, str] | None = None, client_host: str | None = "198.51.100.9"):
    return SimpleNamespace(
        headers=headers or {},
        client=SimpleNamespace(host=client_host) if client_host is not None else None,
    )


def test_client_ip_uses_rightmost_xff_hop():
    request = _fake_request({"x-forwarded-for": "1.2.3.4, 10.0.0.7"})
    assert client_ip(request) == "10.0.0.7"


def test_client_ip_trusts_the_only_xff_hop_even_with_request_client_present():
    """In production, a single XFF hop is the one Render's proxy appended —
    trusting it (not request.client, which is the proxy's own address) is
    the whole point of rightmost semantics."""
    request = _fake_request({"x-forwarded-for": "1.2.3.4"}, client_host="10.0.0.1")
    assert client_ip(request) == "1.2.3.4"


def test_client_ip_falls_back_to_request_client_host_without_header():
    request = _fake_request({})
    assert client_ip(request) == "198.51.100.9"


def test_client_ip_ignores_empty_trailing_entries():
    request = _fake_request({"x-forwarded-for": "1.2.3.4, 10.0.0.7, "})
    assert client_ip(request) == "10.0.0.7"


def test_client_ip_returns_none_without_header_or_client():
    request = _fake_request({}, client_host=None)
    assert client_ip(request) is None

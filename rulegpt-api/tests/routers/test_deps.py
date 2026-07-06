"""Tests for shared router dependency helpers."""

from __future__ import annotations

from types import SimpleNamespace

from app.routers.deps import client_ip


def _fake_request(headers: dict[str, str] | None = None, client_host: str | None = "198.51.100.9"):
    return SimpleNamespace(
        headers=headers or {},
        client=SimpleNamespace(host=client_host) if client_host is not None else None,
    )


def test_client_ip_prefers_cf_connecting_ip():
    """Cloudflare fronts all onrender.com traffic and overwrites any
    client-supplied CF-Connecting-IP, so it is the spoof-proof source."""
    request = _fake_request(
        {
            "cf-connecting-ip": "203.0.113.50",
            "x-forwarded-for": "spoofed.entry, 203.0.113.50, 172.69.1.1",
        }
    )
    assert client_ip(request) == "203.0.113.50"


def test_client_ip_uses_second_from_right_xff_hop():
    """Production chain is ``client, cf-edge``: the rightmost hop is a
    rotating Cloudflare edge IP, the second-from-right is the caller."""
    request = _fake_request({"x-forwarded-for": "203.0.113.50, 172.69.16.2"})
    assert client_ip(request) == "203.0.113.50"


def test_client_ip_spoofed_prefix_still_resolves_the_real_caller():
    """A client-sent XFF gets appended to by each proxy: the attacker entry
    sits further left and must never win."""
    request = _fake_request({"x-forwarded-for": "6.6.6.6, 203.0.113.50, 172.68.3.4"})
    assert client_ip(request) == "203.0.113.50"


def test_client_ip_single_xff_hop_used_as_is():
    request = _fake_request({"x-forwarded-for": "1.2.3.4"}, client_host="10.0.0.1")
    assert client_ip(request) == "1.2.3.4"


def test_client_ip_falls_back_to_request_client_host_without_header():
    request = _fake_request({})
    assert client_ip(request) == "198.51.100.9"


def test_client_ip_ignores_empty_trailing_entries():
    request = _fake_request({"x-forwarded-for": "203.0.113.50, 172.69.16.2, "})
    assert client_ip(request) == "203.0.113.50"


def test_client_ip_returns_none_without_header_or_client():
    request = _fake_request({}, client_host=None)
    assert client_ip(request) is None

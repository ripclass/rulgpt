"""Unit tests for the entitlement consumption helper (Task 4.3).

Uses a minimal fake `db.query(...).filter(...).with_for_update().first()`
chain rather than a real Postgres session — consistent with the rest of this
suite (no local DB is available; see `tests/test_query_quota.py`).
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers.deps import consume_or_require_entitlement


class _FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def filter(self, *conditions):
        return self

    def with_for_update(self):
        return self

    def first(self):
        return self._rows[0] if self._rows else None


class _FakeDb:
    def __init__(self, rows=None):
        self._rows = rows or []
        self.flush_calls = 0

    def query(self, model):
        return _FakeQuery(self._rows)

    def flush(self):
        self.flush_calls += 1


def _row(credits=1, consumed=0):
    return SimpleNamespace(credits=credits, consumed=consumed)


def test_professional_tier_consumes_nothing_even_with_no_entitlement_rows():
    db = _FakeDb(rows=[])
    consume_or_require_entitlement(db, "user-1", "professional", "case_note")
    assert db.flush_calls == 0


def test_enterprise_tier_consumes_nothing():
    db = _FakeDb(rows=[])
    consume_or_require_entitlement(db, "user-1", "enterprise", "draft")
    assert db.flush_calls == 0


def test_free_user_with_credit_consumes_one():
    row = _row(credits=1, consumed=0)
    db = _FakeDb(rows=[row])
    consume_or_require_entitlement(db, "user-1", "free", "case_note")
    assert row.consumed == 1
    assert db.flush_calls == 1


def test_free_user_without_credit_raises_402_with_price_info():
    db = _FakeDb(rows=[])
    with pytest.raises(HTTPException) as exc_info:
        consume_or_require_entitlement(db, "user-1", "free", "case_note")

    assert exc_info.value.status_code == 402
    detail = exc_info.value.detail
    assert detail["error"] == "payment_required"
    assert detail["kind"] == "case_note"
    assert detail["price_usd"] == 9
    assert detail["pro_price_usd"] == 29


def test_draft_price_is_nineteen_dollars():
    db = _FakeDb(rows=[])
    with pytest.raises(HTTPException) as exc_info:
        consume_or_require_entitlement(db, "user-1", "free", "draft")
    assert exc_info.value.detail["price_usd"] == 19


def test_free_user_consume_twice_on_one_credit_raises_402_second_time():
    row = _row(credits=1, consumed=0)
    db = _FakeDb(rows=[row])

    consume_or_require_entitlement(db, "user-1", "free", "draft")
    assert row.consumed == 1

    # Second call: the entitlement is exhausted, so a real query would no
    # longer return this row (credits > consumed is now false).
    db._rows = []
    with pytest.raises(HTTPException) as exc_info:
        consume_or_require_entitlement(db, "user-1", "free", "draft")
    assert exc_info.value.status_code == 402

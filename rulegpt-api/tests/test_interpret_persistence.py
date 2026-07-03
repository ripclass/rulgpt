"""Regression test for the Task 4.2 review fix: `_persist_mt700_result` must
set `session_token` on the `RuleGPTSession` it constructs, since the column
is `nullable=False, unique=True` with no Python-side or server-side default
(see `app/models/session.py`). Without it, every real Postgres commit would
raise an IntegrityError — a 500 on every successful MT700 interpretation —
and since the row is never persisted, the daily MT700 limit is silently
unenforced.

This exercises the REAL `_persist_mt700_result` (not the stubbed-out version
`tests/routers/test_interpret_route.py` uses via its autouse `_no_persistence`
fixture) against a fake db that just captures what gets added, so no real
Postgres connection is needed. Models use Postgres-only column types
(dialect-specific UUID/JSONB/ARRAY), which rules out an in-memory SQLite
`Base.metadata.create_all()` approach for this check.
"""

from __future__ import annotations

from types import SimpleNamespace
from uuid import UUID

from app.models.query import RuleGPTQuery
from app.models.session import RuleGPTSession
from app.routers import interpret


class _CapturingDb:
    def __init__(self):
        self.added: list = []
        self.commit_calls = 0

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commit_calls += 1


def _fake_request(tier: str = "anonymous", user_id=None):
    return SimpleNamespace(
        state=SimpleNamespace(user_id=user_id, user_tier=tier),
        headers={},
        client=SimpleNamespace(host="203.0.113.9"),
    )


def _call_persist(db: _CapturingDb) -> None:
    fields = [{"tag": "20", "name": "Documentary Credit Number", "content": "LC0012345"}]
    flags: list[dict] = []
    interpret._persist_mt700_result(db, _fake_request(), "raw mt700 text", fields, flags, "an answer", [], [])


def test_persist_mt700_result_sets_a_valid_session_token():
    db = _CapturingDb()
    _call_persist(db)

    sessions = [obj for obj in db.added if isinstance(obj, RuleGPTSession)]
    assert len(sessions) == 1
    session_obj = sessions[0]

    assert session_obj.session_token is not None
    assert session_obj.session_token != ""
    # Must be a real, well-formed UUID string — not just any non-empty placeholder.
    UUID(session_obj.session_token)


def test_persist_mt700_result_writes_a_query_row_linked_to_the_session():
    db = _CapturingDb()
    _call_persist(db)

    queries = [obj for obj in db.added if isinstance(obj, RuleGPTQuery)]
    sessions = [obj for obj in db.added if isinstance(obj, RuleGPTSession)]

    assert len(queries) == 1
    assert queries[0].routing_tier == "mt700"
    assert queries[0].session is sessions[0]
    assert db.commit_calls == 1

"""Pure parser/flagging tests for the MT700 interpreter (no I/O)."""

from __future__ import annotations

from app.services.mt700 import MT700_FIELDS, flag_soft_clauses, parse_mt700

SAMPLE_MT700 = """:20:LC0012345
:23:PREADV/2026/001
:31C:260701
:31D:260930LONDON
:32B:USD500000,00 ABOUT USD 500,000
:39A:10/10
:40A:IRREVOCABLE
:43P:NOT ALLOWED
:44C:260915
:45A:100 MT HOT ROLLED STEEL COILS, CIF SHANGHAI INCOTERMS 2020
:46A:1. SIGNED COMMERCIAL INVOICE IN TRIPLICATE
2. FULL SET CLEAN ON BOARD BILL OF LADING
3. PACKING LIST IN DUPLICATE
:47A:PAYMENT SUBJECT TO BUYER'S APPROVAL OF THE QUALITY CERTIFICATE PRIOR TO NEGOTIATION
"""


def test_parse_mt700_returns_twelve_fields_in_order_with_correct_names():
    fields = parse_mt700(SAMPLE_MT700)

    assert len(fields) == 12
    expected_tags = [
        "20", "23", "31C", "31D", "32B", "39A",
        "40A", "43P", "44C", "45A", "46A", "47A",
    ]
    assert [f["tag"] for f in fields] == expected_tags
    for f in fields:
        assert f["name"] == MT700_FIELDS[f["tag"]]

    assert fields[0]["content"] == "LC0012345"
    assert "SUBJECT TO BUYER'S APPROVAL" in fields[-1]["content"]


def test_parse_mt700_unrecognised_tag_gets_placeholder_name():
    fields = parse_mt700(":99Z:SOME UNKNOWN FIELD CONTENT\n")
    assert len(fields) == 1
    assert fields[0]["tag"] == "99Z"
    assert fields[0]["name"] == "Unrecognised field"


def test_parse_mt700_below_three_fields_returns_short_list():
    fields = parse_mt700("this is not a SWIFT message at all, just prose.")
    assert len(fields) < 3


def test_flag_soft_clauses_flags_47a_subject_to_approval():
    fields = parse_mt700(SAMPLE_MT700)
    flags = flag_soft_clauses(fields)
    tags_flagged = {f["tag"] for f in flags}
    assert "47A" in tags_flagged
    flag_47a = next(f for f in flags if f["tag"] == "47A")
    assert "discretion" in flag_47a["note"].lower()


def test_flag_soft_clauses_flags_32b_about_tolerance():
    fields = parse_mt700(SAMPLE_MT700)
    flags = flag_soft_clauses(fields)
    tags_flagged = {f["tag"] for f in flags}
    assert "32B" in tags_flagged
    flag_32b = next(f for f in flags if f["tag"] == "32B")
    assert "tolerance" in flag_32b["note"].lower() or "30" in flag_32b["note"]


def test_flag_soft_clauses_only_flags_the_two_risky_fields():
    fields = parse_mt700(SAMPLE_MT700)
    flags = flag_soft_clauses(fields)
    assert {f["tag"] for f in flags} == {"32B", "47A"}


def test_flag_soft_clauses_no_flags_on_clean_message():
    clean = ":20:LC0000001\n:31D:260930LONDON\n:32B:USD100000,00\n"
    fields = parse_mt700(clean)
    assert flag_soft_clauses(fields) == []

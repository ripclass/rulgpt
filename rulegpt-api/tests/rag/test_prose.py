"""Outbound sanitizer — AI-tell stripping ported from Saarah/enso-academy."""

from app.services.rag.prose import sanitize_outbound


def test_strips_leaked_cjk_glyphs():
    # The exact leak class observed in production Saarah on GLM: "标记" mid-sentence.
    assert sanitize_outbound("Present the 标记 documents before expiry.") == \
        "Present the documents before expiry."


def test_strips_japanese_and_korean_too():
    assert "ル" not in sanitize_outbound("The ルーブリック rule applies.")
    assert "규칙" not in sanitize_outbound("The 규칙 rule applies.")


def test_bangla_and_latin_untouched():
    s = "ব্যাংক examines documents within 5 days."
    assert sanitize_outbound(s) == s


def test_em_dash_becomes_comma_en_dash_survives():
    assert sanitize_outbound("Banks examine documents — not goods.") == \
        "Banks examine documents, not goods."
    assert sanitize_outbound("See Articles 19–25 for details.") == \
        "See Articles 19–25 for details."


def test_plain_mode_strips_bold_and_headings():
    assert sanitize_outbound("## Summary\n**Partial shipments** are allowed.") == \
        "Summary\nPartial shipments are allowed."


def test_markdown_mode_preserves_structure_but_still_strips_tells():
    body = "## Risk level\n**High** — coverage 标记 gap in transit."
    out = sanitize_outbound(body, markdown=True)
    assert out.startswith("## Risk level")
    assert "**High**" in out
    assert "标记" not in out and "—" not in out
    assert "**High**, coverage gap in transit." in out


def test_punctuation_tidy_after_strips():
    assert sanitize_outbound("The rule 标记 , applies — fully.") == \
        "The rule, applies, fully."


def test_empty_and_none_safe():
    assert sanitize_outbound("") == ""

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


def test_genuine_chinese_answer_is_not_stripped():
    """A legitimately Chinese answer must survive — the CJK strip only targets
    a stray Han glyph leaking into non-CJK prose, not the answer's language."""
    from app.services.rag.prose import sanitize_outbound
    chinese = "电放是指承运人在收回正本提单前，指示目的港代理放货。这存在无单放货的风险 [URC 522 Article 7]。"
    out = sanitize_outbound(chinese)
    assert "电放" in out and "无单放货" in out  # Chinese content preserved
    assert "URC 522 Article 7" in out


def test_stray_cjk_leak_is_still_stripped():
    """A single leaked glyph in an English answer is still removed."""
    from app.services.rag.prose import sanitize_outbound
    leaked = "The bank must examine documents标 within five banking days under UCP 600."
    out = sanitize_outbound(leaked)
    assert "标" not in out
    assert "five banking days" in out

"""Outbound prose sanitizer — deterministic last line of defence against
model AI-tells that prompt rules don't reliably catch.

Ported from two production-proven Enso implementations:
  - Juugadu/Saarah `src/persona/sanitize.ts` — GLM/Kimi (Chinese-origin
    models) occasionally emit a stray Han glyph mid-sentence (observed
    "标记" for "mark"); RulGPT generates on the same model family
    (z-ai/glm-5.2), so the same exposure applies.
  - enso-academy `lib/ai/prose.ts` — the em-dash is the clearest written
    AI tell; collapse it to a comma. The en-dash (numeric ranges like
    "Articles 19-25", "110%") is deliberately left alone.

Two modes:
  - markdown=False (chat answers, MT700 narrative): also strips markdown
    bold markers and heading hashes, which the plain-prose house style
    forbids anyway.
  - markdown=True (case notes / drafts, whose section headings are part
    of the product contract): only CJK stripping, em-dash conversion and
    whitespace tidy-up — structure untouched.
"""

from __future__ import annotations

import re

# Hangul Jamo; CJK symbols/punctuation; Hiragana; Katakana; CJK Ext A;
# CJK Unified Ideographs; Hangul Syllables; CJK Compatibility;
# half/full-width forms. Bangla (U+0980-U+09FF) and Latin are untouched.
_CJK_RANGES = re.compile(
    "["
    "ᄀ-ᇿ"   # Hangul Jamo
    "　-〿"   # CJK symbols and punctuation
    "぀-ゟ"   # Hiragana
    "゠-ヿ"   # Katakana
    "㐀-䶿"   # CJK Extension A
    "一-鿿"   # CJK Unified Ideographs
    "가-힯"   # Hangul Syllables
    "豈-﫿"   # CJK Compatibility Ideographs
    "＀-￯"   # Half/full-width forms
    "]"
)

_EM_DASH = re.compile(r"[ \t]*—[ \t]*")
_BOLD = re.compile(r"\*\*([^*\n]+)\*\*")
_HEADING_HASHES = re.compile(r"^[ \t]*#{1,6}[ \t]+", re.MULTILINE)
_SPACE_RUNS = re.compile(r"[ \t]{2,}")
_SPACE_BEFORE_PUNCT = re.compile(r"[ \t]+([,.;:!?])")
_DOUBLED_COMMAS = re.compile(r",\s*,")
_TRAILING_SPACE = re.compile(r"[ \t]+\n")


def sanitize_outbound(text: str, *, markdown: bool = False) -> str:
    """Strip AI-tells from model-generated prose before it reaches a user."""
    if not text:
        return text
    # The CJK strip targets a STRAY Han glyph leaking into otherwise-non-CJK
    # prose. A genuinely CJK answer (a Chinese/Japanese/Korean user's question,
    # answered in their language) is mostly CJK — stripping it would delete the
    # whole answer. Only strip when CJK is a small minority (a leak, not the
    # language). Verified 2026-07-08: Chinese answers were being reduced to
    # garbled English fragments before this guard.
    cjk_count = len(_CJK_RANGES.findall(text))
    letter_count = sum(1 for c in text if c.isalpha())
    # A stray-glyph or leaked-word artifact is a minority of the text; a real
    # CJK answer is the majority. 40% cleanly separates them (a leaked word in a
    # short English sentence tops out ~30%; a genuine Chinese answer is 60%+).
    cjk_is_a_leak = letter_count == 0 or (cjk_count / letter_count) < 0.40
    out = _CJK_RANGES.sub("", text) if cjk_is_a_leak else text
    out = _EM_DASH.sub(", ", out)
    if not markdown:
        out = _BOLD.sub(r"\1", out)
        out = out.replace("**", "")
        out = _HEADING_HASHES.sub("", out)
    out = _SPACE_RUNS.sub(" ", out)
    out = _SPACE_BEFORE_PUNCT.sub(r"\1", out)
    out = _DOUBLED_COMMAS.sub(",", out)
    out = _TRAILING_SPACE.sub("\n", out)
    return out.strip()

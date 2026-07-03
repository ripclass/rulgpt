"""Deterministic MT700 (documentary credit issuance) SWIFT message parser.

Pure parsing/flagging only — no I/O, no network calls, no DB access. HTTP
orchestration for the interpreter lives in `app.routers.interpret`.
"""

from __future__ import annotations

import re

MT700_FIELDS = {
    "20": "Documentary Credit Number", "23": "Reference to Pre-Advice",
    "26E": "Number of Amendment", "27": "Sequence of Total", "31C": "Date of Issue",
    "31D": "Date and Place of Expiry", "32B": "Currency Code, Amount",
    "39A": "Percentage Credit Amount Tolerance", "39B": "Maximum Credit Amount",
    "39C": "Additional Amounts Covered", "40A": "Form of Documentary Credit",
    "40E": "Applicable Rules", "41A": "Available With… By… (BIC)", "41D": "Available With… By…",
    "42C": "Drafts at…", "42A": "Drawee (BIC)", "42D": "Drawee", "42M": "Mixed Payment Details",
    "42P": "Negotiation/Deferred Payment Details", "43P": "Partial Shipments",
    "43T": "Transhipment", "44A": "Place of Taking in Charge/Dispatch",
    "44B": "Place of Final Destination/Delivery", "44C": "Latest Date of Shipment",
    "44D": "Shipment Period", "44E": "Port of Loading/Airport of Departure",
    "44F": "Port of Discharge/Airport of Destination", "45A": "Description of Goods and/or Services",
    "46A": "Documents Required", "47A": "Additional Conditions", "48": "Period for Presentation",
    "49": "Confirmation Instructions", "50": "Applicant", "51A": "Applicant Bank",
    "53A": "Reimbursing Bank", "57A": "Advise Through Bank", "59": "Beneficiary",
    "71B": "Charges", "71D": "Charges", "72Z": "Sender to Receiver Information",
    "78": "Instructions to Paying/Accepting/Negotiating Bank",
}
_TAG_RE = re.compile(r"^:(\d{2}[A-Z]?):\s*", re.M)

SOFT_CLAUSE_PATTERNS = [
    (re.compile(r"\bsubject to\b.*\b(approval|satisfaction|discretion)\b", re.I | re.S),
     "Conditional clause dependent on a party's discretion — payment certainty is weakened."),
    (re.compile(r"\bat (our|the issuing bank'?s?) discretion\b", re.I),
     "Bank-discretion wording — a classic soft clause."),
    (re.compile(r"\babout\b|\bapproximately\b|\bcirca\b", re.I),
     "'About/approximately' triggers the ±10% tolerance of UCP 600 Article 30 — confirm the tolerance is intended."),
    (re.compile(r"\bcharter\s*party\b", re.I),
     "Charter party B/L implications — UCP 600 Article 22 applies; banks do not examine charter parties."),
    (re.compile(r"\bstale\b|\bthird party documents (not )?acceptable\b", re.I),
     "Ambiguous documentary wording — ISBP 821 interpretation risk."),
]


def parse_mt700(raw: str) -> list[dict]:
    """Split raw MT700 text into [{tag, name, content}] in order of appearance."""
    parts = _TAG_RE.split(raw)
    fields = []
    # parts = [preamble, tag1, body1, tag2, body2, ...]
    for i in range(1, len(parts) - 1, 2):
        tag, content = parts[i], parts[i + 1].strip()
        fields.append({"tag": tag, "name": MT700_FIELDS.get(tag, "Unrecognised field"),
                       "content": content})
    return fields


def flag_soft_clauses(fields: list[dict]) -> list[dict]:
    flags = []
    for f in fields:
        for pattern, note in SOFT_CLAUSE_PATTERNS:
            if pattern.search(f["content"]):
                flags.append({"tag": f["tag"], "name": f["name"], "note": note})
    return flags


_KEYWORD_STOPWORDS = {
    "the", "a", "an", "is", "are", "this", "that", "with", "for", "of", "to", "in",
    "on", "and", "or", "not", "but", "banks", "bank", "article", "confirm", "weakened",
}


def flag_keywords(flags: list[dict], limit: int = 12) -> str:
    """Extract a compact keyword string from up to the first two flag notes.

    Used to build a supplementary RulHub search query so retrieval is
    steered toward the specific risk the flags identified (e.g. UCP 600
    Article 30 tolerance wording), not just generic MT700 rules.
    """
    words: list[str] = []
    for flag in flags[:2]:
        for token in re.findall(r"[A-Za-z]+", flag["note"]):
            lowered = token.lower()
            if len(lowered) > 3 and lowered not in _KEYWORD_STOPWORDS and lowered not in words:
                words.append(lowered)
    return " ".join(words[:limit])

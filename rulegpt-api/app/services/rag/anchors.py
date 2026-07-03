"""Foundational anchor rules shared across retrievers.

These are rules that must never be missing from retrieval context for their
domain when the query touches on them — used both by the local pgvector
retriever (`retriever.py`) and the RulHub-native retriever
(`rulhub_retriever.py`) as a safety net enrichment step.
"""

from __future__ import annotations

# Foundational anchor rules — always included when their domain is queried.
# These are the rules that must NEVER be missing from retrieval context.
ANCHOR_RULES: dict[str, list[str]] = {
    "icc": [
        "UCP600-14",      # Standard for examination (5 banking days, face value)
        "UCP600-18",      # Commercial invoice requirements
        "UCP600-28",      # Insurance document (110% CIF)
        "UCP600-30",      # Tolerance (about/approximately ±10%)
        "UCP600-31",      # Partial shipments ALLOWED (the one that failed)
        "UCP600-31-DERIVED-001",  # Partial shipments derived rule
        "UCP600-36",      # Force majeure (protects banks, not beneficiaries)
        "MT700-43P-001",  # Field 43P partial shipments
        "UCP600-19",      # Multimodal transport document
        "UCP600-20",      # Bill of lading
    ],
    "sanctions": [
        "OFAC-IRAN-001",  # Iran comprehensive sanctions
    ],
}

# Keywords that trigger specific anchor rules
ANCHOR_TRIGGERS: dict[str, list[str]] = {
    "UCP600-31": ["partial shipment", "partial drawing", "two shipments", "two presentations", "split shipment"],
    "UCP600-31-DERIVED-001": ["partial shipment", "partial drawing"],
    "UCP600-36": ["force majeure", "strike", "riot", "war", "act of god", "lc expired", "lc has expired"],
    "UCP600-30": ["tolerance", "about", "approximately", "5%", "10%"],
    "UCP600-28": ["insurance", "110%", "cif insurance", "cip insurance"],
    "UCP600-14": ["examination period", "banking days", "5 days", "five days", "how long"],
    "UCP600-19": ["multimodal", "combined transport", "door to door", "multimodal transport document"],
    "UCP600-20": ["bill of lading", "b/l", "ocean bill", "marine bill", "shipped on board"],
    "MT700-43P-001": ["partial shipment", "field 43p"],
}

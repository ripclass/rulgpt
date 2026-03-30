"""Typed models for the RuleGPT RAG pipeline."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


ComplexityLevel = Literal["simple", "interpretation", "complex"]
ConfidenceBand = Literal["high", "medium", "low"]


class ClassifierOutput(BaseModel):
    domain: str = "other"
    jurisdiction: str = "global"
    document_type: str = "other"
    commodity: Optional[str] = None
    complexity: ComplexityLevel = "simple"
    in_scope: bool = True
    reason: Optional[str] = None


class NormalizedRule(BaseModel):
    rule_id: str
    rulebook: str = "unknown"
    article: Optional[str] = None
    title: Optional[str] = None
    reference: Optional[str] = None
    version: Optional[str] = None
    domain: str = "other"
    jurisdiction: str = "global"
    document_type: str = "other"
    description: str = ""
    conditions: List[Any] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    deterministic: bool = True
    requires_llm: bool = False
    severity: str = "medium"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    content_hash: str
    raw: Dict[str, Any] = Field(default_factory=dict)


class RetrievedRule(BaseModel):
    rule_id: str
    rulebook: str
    reference: str
    title: str
    excerpt: str
    domain: str = "other"
    jurisdiction: str = "global"
    document_type: str = "other"
    similarity_score: float = 0.0
    rerank_score: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Citation(BaseModel):
    rule_id: str
    rulebook: str
    reference: str
    excerpt: str
    confidence: ConfidenceBand = "medium"


class QueryResult(BaseModel):
    answer: str
    citations: List[Citation] = Field(default_factory=list)
    confidence_band: ConfidenceBand = "low"
    suggested_followups: List[str] = Field(default_factory=list)
    show_trdr_cta: bool = False
    disclaimer: str
    classifier_output: ClassifierOutput
    retrieved_rule_ids: List[str] = Field(default_factory=list)
    model_used: str = "fallback"
    classifier_model: str = "heuristic"
    latency_ms: int = 0
    stage_latency_ms: Dict[str, int] = Field(default_factory=dict)
    routing_tier: str = "sonnet"


class EmbeddingSyncReport(BaseModel):
    processed: int = 0
    rules_inserted: int = 0
    rules_updated: int = 0
    embedded: int = 0
    updated: int = 0
    skipped_unchanged: int = 0
    failed: int = 0
    errors: List[str] = Field(default_factory=list)

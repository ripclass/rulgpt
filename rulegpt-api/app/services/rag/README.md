# RuleGPT RAG Interface

Backend should call only:

```python
from app.services.rag.pipeline import process_query

result = await process_query(query="...", session=db_session, language="en")
```

`result` is a `QueryResult` model that already contains:
- `answer`
- `citations`
- `confidence_band`
- `suggested_followups`
- `show_trdr_cta`
- `disclaimer`
- classifier/retrieval metadata (`classifier_output`, `retrieved_rule_ids`, latency fields)

This package intentionally avoids auth/payment concerns.


# Initial Embedding Sync

Run this after the backend is deployed, the database migration has completed, and `pgvector` is enabled.

## API-backed sync

Use this when Render can reach RulHub and OpenAI:

```powershell
cd rulegpt-api
@'
import asyncio
from app.database import SessionLocal
from app.services.rag.embedder import RuleEmbedder


async def main() -> None:
    db = SessionLocal()
    try:
        report = await RuleEmbedder().sync_embeddings(
            db,
            include_api=True,
            include_local=False,
        )
        print(report.model_dump_json(indent=2))
    finally:
        db.close()


asyncio.run(main())
'@ | python -
```

## Local-file sync

Use this only if the backend environment has a mounted rule file tree and `RULEGPT_LOCAL_RULES_ROOT` points at it:

```powershell
cd rulegpt-api
$env:RULEGPT_LOCAL_RULES_ROOT="D:\path\to\rules"
py scripts\sync_local_rules.py --local-only
```

If you also want to merge any available RulHub API rules during the same run:

```powershell
cd rulegpt-api
$env:RULEGPT_LOCAL_RULES_ROOT="D:\path\to\rules"
py scripts\sync_local_rules.py --include-api
```

If the report shows `failed > 0`, resolve the missing API keys or pgvector setup before retrying.

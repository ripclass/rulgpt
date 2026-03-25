from __future__ import annotations

import argparse
import asyncio
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import settings
from app.database import SessionLocal
from app.services.rag.embedder import DEFAULT_RULE_DATA_PATH, RuleEmbedder


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Sync local RuleGPT rules into PostgreSQL + pgvector."
    )
    parser.add_argument(
        "--local-path",
        default=settings.RULEGPT_LOCAL_RULES_ROOT or str(DEFAULT_RULE_DATA_PATH),
        help="Local rules directory to ingest.",
    )
    parser.add_argument(
        "--include-api",
        action="store_true",
        help="Also pull rules from the configured RulHub API during sync.",
    )
    parser.add_argument(
        "--local-only",
        action="store_true",
        help="Require local files only and skip API collection.",
    )
    return parser


async def _run(local_path: Path, include_api: bool, include_local: bool) -> None:
    db = SessionLocal()
    try:
        report = await RuleEmbedder().sync_embeddings(
            db,
            include_api=include_api,
            include_local=include_local,
            local_data_path=local_path,
        )
        print(report.model_dump_json(indent=2))
    finally:
        db.close()


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    include_local = True
    include_api = bool(args.include_api and not args.local_only)
    local_path = Path(args.local_path).expanduser()

    asyncio.run(_run(local_path=local_path, include_api=include_api, include_local=include_local))


if __name__ == "__main__":
    main()

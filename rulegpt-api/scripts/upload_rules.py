r"""Upload new rule versions to the database. Archives old versions, activates new ones.

Usage:
    # Set your production DATABASE_URL first:
    set DATABASE_URL=postgresql://...your-supabase-url...

    # Then run from the rulegpt-api directory:
    cd rulegpt-api
    python scripts/upload_rules.py "C:\Users\User\Documents\Rules\Data\_staging\icc_letter_rules\New Upload 4-5-26"

    # Dry run (show what would happen without uploading):
    python scripts/upload_rules.py --dry-run "C:\Users\User\Documents\Rules\Data\_staging\icc_letter_rules\New Upload 4-5-26"
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import settings
from app.database import SessionLocal
from app.services.rag.embedder import RuleEmbedder, load_rules_from_local_data


def _detect_rulebooks(rules: list) -> set[str]:
    """Extract unique rulebook names from a list of normalized rules."""
    return {r.rulebook for r in rules if r.rulebook}


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload new rule versions. Archives old, activates new.")
    parser.add_argument("path", help="Directory containing JSON rule files to upload.")
    parser.add_argument("--dry-run", action="store_true", help="Show plan without uploading.")
    args = parser.parse_args()

    rule_path = Path(args.path).expanduser()
    if not rule_path.is_dir():
        print(f"Error: {rule_path} is not a directory.")
        sys.exit(1)

    json_files = list(rule_path.glob("**/*.json"))
    if not json_files:
        print(f"No JSON files found in {rule_path}")
        sys.exit(1)

    print(f"Loading rules from: {rule_path}")
    print(f"Found {len(json_files)} JSON files")
    print(f"Database: {settings.DATABASE_URL[:40]}...")
    print()

    rules = load_rules_from_local_data(rule_path)
    rulebooks = _detect_rulebooks(rules)
    new_rule_ids = {r.rule_id for r in rules}

    print(f"Normalized {len(rules)} rules across {len(rulebooks)} rulebooks:")
    for rb in sorted(rulebooks):
        count = sum(1 for r in rules if r.rulebook == rb)
        print(f"  {rb}: {count} rules")
    print()

    if args.dry_run:
        print("--- DRY RUN ---")
        print(f"Step 1: Archive all existing rules where rulebook IN {sorted(rulebooks)}")
        print(f"        (sets is_active=false on rules + embeddings for these rulebooks)")
        print(f"Step 2: Upsert {len(rules)} new rules as is_active=true")
        print(f"        (rules with matching rule_id get updated, new ones get inserted)")
        print(f"Step 3: Generate embeddings for new/changed rules")
        print()
        print("Sample rules:")
        for rule in rules[:5]:
            print(f"  {rule.rule_id} | {rule.rulebook} | {rule.title[:60]}")
        if len(rules) > 5:
            print(f"  ... and {len(rules) - 5} more")
        return

    print(f"This will:")
    print(f"  1. Archive existing rules for: {', '.join(sorted(rulebooks))}")
    print(f"  2. Upsert {len(rules)} new rule versions as active")
    print(f"  3. Generate embeddings (may take a few minutes)")
    print()

    confirm = input("Continue? [y/N] ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        return

    asyncio.run(_upload(rules, rulebooks))


async def _upload(rules: list, rulebooks: set[str]) -> None:
    from sqlalchemy import text, update
    from app.models.rule import RuleRecord
    from app.models.embedding import RuleEmbedding

    db = SessionLocal()
    try:
        # Step 1: Archive old rules for these rulebooks
        print("\nStep 1: Archiving old rule versions...")
        archived_rules = db.execute(
            update(RuleRecord)
            .where(RuleRecord.rulebook.in_(rulebooks), RuleRecord.is_active == True)  # noqa: E712
            .values(is_active=False)
        )
        archived_embeds = db.execute(
            update(RuleEmbedding)
            .where(RuleEmbedding.rulebook.in_(rulebooks), RuleEmbedding.is_active == True)  # noqa: E712
            .values(is_active=False)
        )
        db.commit()
        print(f"  Archived {archived_rules.rowcount} rules, {archived_embeds.rowcount} embeddings")

        # Step 2 & 3: Upsert new rules + generate embeddings
        print(f"\nStep 2-3: Upserting {len(rules)} new rules + generating embeddings...")
        embedder = RuleEmbedder()
        report = await embedder.sync_embeddings(db, rules=rules, include_api=False, include_local=False)

        print("\n--- Upload Complete ---")
        print(report.model_dump_json(indent=2))
    except Exception as e:
        db.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

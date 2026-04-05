r"""Upload Data_clean rules, excluding ICC letter rules already uploaded.

Usage:
    cd rulegpt-api
    set DATABASE_URL=postgresql://...
    python scripts/upload_clean_rules.py --dry-run
    python scripts/upload_clean_rules.py --yes
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import settings
from app.database import SessionLocal
from app.services.rag.embedder import RuleEmbedder, load_rules_from_local_data

DATA_CLEAN = Path(r"C:\Users\User\Documents\Rules\Data_clean")
ICC_NEW = Path(r"C:\Users\User\Documents\Rules\Data\_staging\icc_letter_rules\New Upload 4-5-26")


def _get_icc_ids() -> set[str]:
    """Get rule_ids from the ICC files already uploaded."""
    ids = set()
    for f in ICC_NEW.glob("*.json"):
        try:
            data = json.load(open(f, encoding="utf-8"))
            if isinstance(data, list):
                for r in data:
                    rid = r.get("rule_id", r.get("id", ""))
                    if rid:
                        ids.add(rid)
        except Exception:
            pass
    return ids


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload Data_clean rules (excluding ICC already uploaded).")
    parser.add_argument("--dry-run", action="store_true", help="Show plan without uploading.")
    parser.add_argument("--yes", "-y", action="store_true", help="Skip confirmation prompt.")
    args = parser.parse_args()

    if not DATA_CLEAN.is_dir():
        print(f"Error: {DATA_CLEAN} not found.")
        sys.exit(1)

    print(f"Loading rules from: {DATA_CLEAN}")
    print(f"Database: {settings.DATABASE_URL[:40]}...")
    print()

    # Load all rules from Data_clean
    all_rules = load_rules_from_local_data(DATA_CLEAN)
    print(f"Loaded {len(all_rules)} rules from Data_clean")

    # Exclude ICC rule_ids already uploaded
    icc_ids = _get_icc_ids()
    print(f"Excluding {len(icc_ids)} ICC rule_ids (already uploaded as new versions)")

    filtered = [r for r in all_rules if r.rule_id not in icc_ids]
    print(f"Rules to upload: {len(filtered)}")
    print()

    # Count by rulebook
    rb_counts: dict[str, int] = {}
    for r in filtered:
        rb = r.rulebook or "unknown"
        rb_counts[rb] = rb_counts.get(rb, 0) + 1
    for rb, count in sorted(rb_counts.items(), key=lambda x: -x[1]):
        print(f"  {rb}: {count}")
    print()

    rulebooks = set(rb_counts.keys())

    if args.dry_run:
        print("--- DRY RUN ---")
        print(f"Step 1: Archive existing rules for {len(rulebooks)} rulebooks")
        print(f"Step 2: Upsert {len(filtered)} rules as active")
        print(f"Step 3: Generate embeddings")
        return

    print(f"This will:")
    print(f"  1. Archive existing non-ICC rules for affected rulebooks")
    print(f"  2. Upsert {len(filtered)} rules as active")
    print(f"  3. Generate embeddings (this will take several minutes)")
    print()

    if not args.yes:
        confirm = input("Continue? [y/N] ").strip().lower()
        if confirm != "y":
            print("Aborted.")
            return

    asyncio.run(_upload(filtered, rulebooks))


async def _upload(rules: list, rulebooks: set[str]) -> None:
    from sqlalchemy import update
    from app.models.rule import RuleRecord
    from app.models.embedding import RuleEmbedding

    # Rulebooks that overlap with ICC — don't archive those
    ICC_RULEBOOKS = {
        "UCP600", "ISBP745", "ISP98", "URDG758", "URC522", "URR725",
        "eUCP 2.1", "Incoterms 2020", "EU", "UN", "SWIFT",
        "collections_ops_core_v1", "guarantee_ops_core_v1", "standby_ops_core_v1",
    }

    # Only archive rulebooks that are NOT in the ICC set
    archive_rulebooks = rulebooks - ICC_RULEBOOKS
    if not archive_rulebooks:
        archive_rulebooks = set()

    db = SessionLocal()
    try:
        if archive_rulebooks:
            print(f"\nStep 1: Archiving old versions for {len(archive_rulebooks)} non-ICC rulebooks...")
            archived_rules = db.execute(
                update(RuleRecord)
                .where(RuleRecord.rulebook.in_(archive_rulebooks), RuleRecord.is_active == True)  # noqa: E712
                .values(is_active=False)
            )
            archived_embeds = db.execute(
                update(RuleEmbedding)
                .where(RuleEmbedding.rulebook.in_(archive_rulebooks), RuleEmbedding.is_active == True)  # noqa: E712
                .values(is_active=False)
            )
            db.commit()
            print(f"  Archived {archived_rules.rowcount} rules, {archived_embeds.rowcount} embeddings")
        else:
            print("\nStep 1: No non-ICC rulebooks to archive.")

        # Step 2 & 3: Upsert + embed
        print(f"\nStep 2-3: Upserting {len(rules)} rules + generating embeddings...")
        print("  This may take 5-10 minutes for embedding generation...")
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

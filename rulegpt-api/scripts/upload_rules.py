r"""Upload new rule versions to the database. Archives old versions, activates new ones.

Usage:
    # Set your production DATABASE_URL first:
    set DATABASE_URL=postgresql://...your-supabase-url...

    # Then run from the rulegpt-api directory:
    cd rulegpt-api
    python scripts/upload_rules.py "C:\Users\User\Documents\Rules\Data_clean"

    # Protect ICC rulebooks from being archived/overwritten:
    python scripts/upload_rules.py --protect-icc "C:\Users\User\Documents\Rules\Data_clean"

    # Dry run (show what would happen without uploading):
    python scripts/upload_rules.py --dry-run --protect-icc "C:\Users\User\Documents\Rules\Data_clean"
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


# ICC-core rulebooks that were recently uploaded from a separate source pack.
# These should NOT be archived or overwritten when uploading Data_clean.
_ICC_PROTECTED_EXACT = {
    "UCP600", "ISBP745", "ISP98", "URDG758", "URC522", "URR725",
    "eUCP 2.1", "Incoterms 2020",
}
_ICC_PROTECTED_PREFIXES = (
    "icc.incoterms.",
    "icc.trade_finance.",
)


def _is_icc_protected(rulebook: str) -> bool:
    """Check if a rulebook is in the ICC-protected set."""
    if rulebook in _ICC_PROTECTED_EXACT:
        return True
    return any(rulebook.startswith(p) for p in _ICC_PROTECTED_PREFIXES)


def _detect_rulebooks(rules: list) -> set[str]:
    """Extract unique rulebook names from a list of normalized rules."""
    return {r.rulebook for r in rules if r.rulebook}


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload new rule versions. Archives old, activates new.")
    parser.add_argument("path", help="Directory containing JSON rule files to upload.")
    parser.add_argument("--dry-run", action="store_true", help="Show plan without uploading.")
    parser.add_argument("--yes", "-y", action="store_true", help="Skip confirmation prompt.")
    parser.add_argument(
        "--protect-icc", action="store_true",
        help="Skip ICC-core rulebooks (UCP600, ISBP745, ISP98, etc.) — don't archive or overwrite them.",
    )
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

    all_rules = load_rules_from_local_data(rule_path)

    # Filter out ICC-protected rulebooks if requested
    if args.protect_icc:
        protected_rules = [r for r in all_rules if _is_icc_protected(r.rulebook)]
        rules = [r for r in all_rules if not _is_icc_protected(r.rulebook)]
        protected_books = _detect_rulebooks(protected_rules)
        if protected_books:
            print(f"ICC PROTECTION: Skipping {len(protected_rules)} rules from {len(protected_books)} protected rulebooks:")
            for rb in sorted(protected_books):
                count = sum(1 for r in protected_rules if r.rulebook == rb)
                print(f"  SKIP  {rb}: {count} rules")
            print()
    else:
        rules = all_rules

    if not rules:
        print("No rules to upload after filtering.")
        sys.exit(0)

    rulebooks = _detect_rulebooks(rules)
    new_rule_ids = {r.rule_id for r in rules}

    print(f"Normalized {len(rules)} rules across {len(rulebooks)} rulebooks:")
    for rb in sorted(rulebooks):
        count = sum(1 for r in rules if r.rulebook == rb)
        print(f"  {rb}: {count} rules")
    print()

    # Domain distribution
    from collections import Counter
    domain_counts = Counter(r.domain for r in rules)
    print("Domain distribution:")
    for d, c in domain_counts.most_common():
        print(f"  {d}: {c}")
    print()

    if args.dry_run:
        print("--- DRY RUN ---")
        print(f"Step 1: Archive all existing rules where rulebook IN {sorted(rulebooks)}")
        print(f"        (sets is_active=false on rules + embeddings for these rulebooks)")
        if args.protect_icc:
            print(f"        ICC-protected rulebooks will NOT be touched")
        print(f"Step 2: Upsert {len(rules)} new rules as is_active=true")
        print(f"        (rules with matching rule_id get updated, new ones get inserted)")
        print(f"Step 3: Generate embeddings for new/changed rules")
        print()
        print("Sample rules:")
        for rule in rules[:5]:
            print(f"  {rule.rule_id} | {rule.rulebook} | {rule.domain} | {rule.jurisdiction} | {(rule.title or '')[:50]}")
        if len(rules) > 5:
            print(f"  ... and {len(rules) - 5} more")
        return

    print(f"This will:")
    print(f"  1. Archive existing rules for: {', '.join(sorted(rulebooks))}")
    if args.protect_icc:
        print(f"     (ICC-protected rulebooks will NOT be touched)")
    print(f"  2. Upsert {len(rules)} new rule versions as active")
    print(f"  3. Generate embeddings (may take a few minutes)")
    print()

    if not args.yes:
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
        # Step 1: Archive old rules — one rulebook at a time with extended timeout
        print("\nStep 1: Archiving old rule versions (per-rulebook batches)...")
        total_archived_rules = 0
        total_archived_embeds = 0
        for rb in sorted(rulebooks):
            # SET LOCAL persists within current transaction (works with PgBouncer)
            db.execute(text("SET LOCAL statement_timeout = '120s'"))
            ar = db.execute(
                text("UPDATE rulegpt_rules SET is_active = false, updated_at = now() WHERE rulebook = :rb AND is_active = true"),
                {"rb": rb},
            )
            ae = db.execute(
                text("UPDATE rulegpt_rule_embeddings SET is_active = false WHERE rulebook = :rb AND is_active = true"),
                {"rb": rb},
            )
            db.commit()
            r_count = ar.rowcount
            e_count = ae.rowcount
            total_archived_rules += r_count
            total_archived_embeds += e_count
            if r_count or e_count:
                print(f"  Archived {rb}: {r_count} rules, {e_count} embeddings")
        print(f"  Total archived: {total_archived_rules} rules, {total_archived_embeds} embeddings")

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

"""CLI: python scripts/search.py キーワード"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.search import search_messages  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2:
        print("使い方: python scripts/search.py <検索語>")
        raise SystemExit(1)

    query = " ".join(sys.argv[1:])
    for hit in search_messages(query):
        print("-" * 60)
        print(f"thread={hit['thread_id']} user={hit['line_user_id']}")
        print(f"{hit['created_at']} [{hit['direction']}] {hit['body'] or ''}")
        if hit.get("resolution_summary"):
            print(f"解決メモ: {hit['resolution_summary']}")


if __name__ == "__main__":
    main()

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "line-archive.db"
ATTACHMENTS_DIR = DATA_DIR / "attachments"

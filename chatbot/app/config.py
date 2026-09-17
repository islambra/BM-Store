import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(override=True)

ROOT = Path(__file__).resolve().parent.parent
APP_DIR = Path(__file__).resolve().parent

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
CATALOG_SOURCE = os.getenv("CATALOG_SOURCE", "mock").strip().lower()
PRODUCTS_API_URL = os.getenv("PRODUCTS_API_URL", "").rstrip("/")
_DEFAULT_CORS_ORIGINS = (
    "https://bm-store-tsw8.onrender.com,"
    "http://localhost:3001"
)
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", _DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]
DB_PATH = Path(os.getenv("DB_PATH", ROOT / "data" / "conversations.db"))
PRODUCTS_PATH = APP_DIR / "data" / "products.json"
OWNER_WHATSAPP = os.getenv("OWNER_WHATSAPP", "").strip()

#!/usr/bin/env python3
"""Step 4: function calling against mock catalog, without the HTTP server."""

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from app.catalog import MockCatalog
from app.gemini_chat import run_turn
from app.tools import dispatch


def assert_mock_tools() -> None:
    catalog = MockCatalog()
    search = dispatch(catalog, "search_products", {"query": "قفطان", "max_price_mad": 1500})
    assert search["count"] >= 1, search
    assert all(p["price_mad"] <= 1500 for p in search["products"])
    stock = dispatch(catalog, "check_stock", {"product_id": "caf-002", "size": "XL"})
    assert stock["available"] is False
    missing = dispatch(catalog, "get_product", {"product_id": "nope"})
    assert missing["found"] is False
    print("mock tools: ok")


def assert_live_function_calling() -> None:
    key = os.getenv("GEMINI_API_KEY")
    if not key or key.startswith("your_"):
        print("skip live Gemini function-calling (no GEMINI_API_KEY)")
        return
    result = run_turn("واش كاين فواكه مجففة؟")
    print(json.dumps({"message": result["message"], "tools": result["tools"], "products": [p["id"] for p in result["products"]]}, ensure_ascii=False, indent=2))
    assert result["products"], "expected function calling to return products"
    print("live function calling: ok")


if __name__ == "__main__":
    assert_mock_tools()
    assert_live_function_calling()

#!/usr/bin/env python3
"""Live catalog against BM Store products API."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from app.catalog import ApiCatalog


def main() -> None:
    catalog = ApiCatalog("https://bm-store-tsw8.onrender.com/api")
    products = catalog.list_products()
    assert products, products
    first = products[0]
    assert first["id"]
    assert first["price_mad"] is not None
    assert first["image"] and "localhost" not in first["image"]
    found = catalog.get_product(first["id"])
    assert found and found["id"] == first["id"]
    search = catalog.search_products(query=first.get("name_darija") or first.get("name") or "fruit")
    assert search
    stock = catalog.check_stock(first["id"])
    assert stock["found"] is True
    print("bm store catalog:", len(products), first["name_darija"] or first["name"], first["price_mad"], "دج")


if __name__ == "__main__":
    main()

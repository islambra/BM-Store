#!/usr/bin/env python3
"""Catalog fallback when Gemini is unavailable."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.catalog import MockCatalog
from app.gemini_chat import catalog_fallback
from app.tools import dispatch


class BrokenCatalog(MockCatalog):
    def search_products(self, *args, **kwargs):
        raise TimeoutError("catalog down")

    def list_products(self, category=None):
        raise TimeoutError("catalog down")


def test_fallback_lists_products():
    catalog = MockCatalog()
    result = catalog_fallback("حابة نعرف واش عندكم منتجات", catalog)
    assert result["products"], result
    assert result["handoff"] is None
    assert "منتجات" in result["message"] or result["products"]


def test_dispatch_does_not_crash_on_catalog_error():
    result = dispatch(BrokenCatalog(), "list_products", {})
    assert "error" in result


def test_fallback_survives_catalog_outage():
    result = catalog_fallback("واش كاين؟", BrokenCatalog())
    assert result["products"] == []
    assert result["message"]


if __name__ == "__main__":
    test_fallback_lists_products()
    test_dispatch_does_not_crash_on_catalog_error()
    test_fallback_survives_catalog_outage()
    print("chat fallback: ok")

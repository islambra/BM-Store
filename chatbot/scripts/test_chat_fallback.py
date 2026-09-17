#!/usr/bin/env python3
"""Catalog fallback when Gemini is unavailable."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.catalog import MockCatalog
from app.gemini_chat import catalog_fallback, is_product_query, prefetch_catalog
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
    assert "timings" in result


def test_product_query_detection():
    assert is_product_query("سلام") is False
    assert is_product_query("واش كاين منتجات؟") is True
    assert is_product_query("واش كاين فواكه مجففة؟") is True


def test_prefetch_uses_catalog():
    catalog = MockCatalog()
    products, tool_name = prefetch_catalog("واش كاين فواكه مجففة؟", catalog)
    assert tool_name in {"search_products", "list_products"}
    assert products


if __name__ == "__main__":
    test_fallback_lists_products()
    test_dispatch_does_not_crash_on_catalog_error()
    test_fallback_survives_catalog_outage()
    test_product_query_detection()
    test_prefetch_uses_catalog()
    print("chat fallback: ok")

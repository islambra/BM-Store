from __future__ import annotations

from typing import Any, Optional

from app.catalog import Catalog
from app.handoff import handoff_payload


def tool_declarations() -> list[dict]:
    return [
        {
            "name": "search_products",
            "description": "بحث في سلعة المحل بالكلمة، الفئة، الثمن، اللون أو المقاس.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "كلمة البحث بالعربية أو الفرنسية أو الإنجليزية"},
                    "category": {"type": "string", "description": "فئة اختيارية من الكتالوج"},
                    "max_price_mad": {"type": "number", "description": "أقصى ثمن بالدينار الجزائري"},
                    "color": {"type": "string"},
                    "size": {"type": "string", "description": "S/M/L/XL أو مقاس الحذاء 36-40"},
                },
                "required": ["query"],
            },
        },
        {
            "name": "get_product",
            "description": "تفاصيل منتج واحد بالمعرّف.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                },
                "required": ["product_id"],
            },
        },
        {
            "name": "list_products",
            "description": "لائحة المنتجات، مع إمكانية تصفية بالفئة.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string"},
                },
            },
        },
        {
            "name": "check_stock",
            "description": "شوف واش كاين المخزون.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                    "size": {"type": "string"},
                },
                "required": ["product_id"],
            },
        },
        {
            "name": "request_human_handoff",
            "description": "حوّل المحادثة لصاحب المحل لما الزبون يحتاج إنسان.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string", "description": "سبب التحويل"},
                    "summary": {"type": "string", "description": "ملخص قصير للمحادثة وشنو بغا الزبون"},
                },
                "required": ["reason", "summary"],
            },
        },
    ]


def dispatch(catalog: Catalog, name: str, args: Optional[dict[str, Any]] = None) -> dict:
    args = args or {}
    if name == "search_products":
        products = catalog.search_products(
            query=args.get("query") or "",
            category=args.get("category"),
            max_price_mad=args.get("max_price_mad"),
            color=args.get("color"),
            size=args.get("size"),
        )
        return {"count": len(products), "products": products}
    if name == "get_product":
        product = catalog.get_product(args.get("product_id") or "")
        if not product:
            return {"found": False, "error": "المنتج غير موجود"}
        return {"found": True, "product": product}
    if name == "list_products":
        products = catalog.list_products(category=args.get("category"))
        return {"count": len(products), "products": products}
    if name == "check_stock":
        return catalog.check_stock(args.get("product_id") or "", args.get("size"))
    if name == "request_human_handoff":
        return handoff_payload(args.get("reason") or "طلب الزبون", args.get("summary") or "")
    return {"error": f"أداة غير معروفة: {name}"}


def collect_products(tool_results: list[dict]) -> list[dict]:
    seen = {}
    for result in tool_results:
        payload = result.get("result") or {}
        items = []
        if isinstance(payload.get("products"), list):
            items.extend(payload["products"])
        if isinstance(payload.get("product"), dict):
            items.append(payload["product"])
        for item in items:
            pid = item.get("id")
            if pid and pid not in seen:
                seen[pid] = item
    return list(seen.values())

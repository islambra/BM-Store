from __future__ import annotations

import json
import os
from typing import Any, Optional
from urllib.parse import urlparse

import httpx

from dotenv import load_dotenv

from app.config import CATALOG_SOURCE, PRODUCTS_API_URL, PRODUCTS_PATH

load_dotenv(override=True)


def _rewrite_image(url: Optional[str], origin: str) -> Optional[str]:
    if not url:
        return None
    if "localhost:5000" in url and origin:
        return url.replace("http://localhost:5000", origin).replace("https://localhost:5000", origin)
    return url


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def normalize_product(raw: dict, origin: str = "") -> dict:
    sizes = raw.get("sizes") if isinstance(raw.get("sizes"), dict) else {}
    if sizes:
        stock_total = int(sum(_as_int(v) for v in sizes.values()))
    else:
        stock_total = _as_int(raw.get("stock") or raw.get("stock_total"))
    price = raw.get("price_mad")
    if price is None:
        price = raw.get("price")
    image = raw.get("image")
    if not image and isinstance(raw.get("images"), list) and raw["images"]:
        image = raw["images"][0]
    category = raw.get("categoryName") or raw.get("category")
    return {
        "id": str(raw.get("id") or raw.get("_id") or ""),
        "name": raw.get("name"),
        "name_darija": raw.get("nameAr") or raw.get("name_darija") or raw.get("name"),
        "category": category,
        "description": raw.get("descriptionAr") or raw.get("description"),
        "price_mad": price,
        "old_price": raw.get("oldPrice") or raw.get("originalPrice"),
        "colors": raw.get("colors") or [],
        "sizes": sizes,
        "in_stock": stock_total > 0 and raw.get("isActive", True) is not False,
        "stock_total": stock_total,
        "tags": raw.get("tags") or [],
        "image": _rewrite_image(image, origin),
        "slug": raw.get("slug"),
        "discount": raw.get("discount"),
    }


def _extract_products(payload: Any) -> list[dict]:
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    data = payload.get("data", payload)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        if isinstance(data.get("products"), list):
            return data["products"]
        if data.get("_id") or data.get("id"):
            return [data]
        product = data.get("product")
        if isinstance(product, dict):
            return [product]
    if isinstance(payload.get("products"), list):
        return payload["products"]
    return []


def _page_count(payload: Any) -> int:
    if not isinstance(payload, dict):
        return 1
    data = payload.get("data", payload)
    if isinstance(data, dict):
        return max(1, _as_int(data.get("pages"), 1))
    return 1


class Catalog:
    def list_products(self, category: Optional[str] = None) -> list[dict]:
        raise NotImplementedError

    def get_product(self, product_id: str) -> Optional[dict]:
        raise NotImplementedError

    def search_products(
        self,
        query: str,
        category: Optional[str] = None,
        max_price_mad: Optional[float] = None,
        color: Optional[str] = None,
        size: Optional[str] = None,
    ) -> list[dict]:
        raise NotImplementedError

    def check_stock(self, product_id: str, size: Optional[str] = None) -> dict:
        raise NotImplementedError


class MockCatalog(Catalog):
    def __init__(self, path=PRODUCTS_PATH):
        with open(path, encoding="utf-8") as f:
            payload = json.load(f)
        self.store = payload.get("store", {})
        self.products = payload["products"]

    def list_products(self, category: Optional[str] = None) -> list[dict]:
        items = self.products
        if category:
            needle = category.strip().lower()
            items = [p for p in items if needle in (p.get("category") or "").lower()]
        return [normalize_product(p) for p in items]

    def get_product(self, product_id: str) -> Optional[dict]:
        for product in self.products:
            if str(product.get("id")) == str(product_id):
                return normalize_product(product)
        return None

    def search_products(
        self,
        query: str,
        category: Optional[str] = None,
        max_price_mad: Optional[float] = None,
        color: Optional[str] = None,
        size: Optional[str] = None,
    ) -> list[dict]:
        tokens = [t for t in (query or "").lower().split() if t]
        results = []
        for product in self.products:
            public = normalize_product(product)
            blob = " ".join(
                [
                    public.get("id") or "",
                    public.get("name") or "",
                    public.get("name_darija") or "",
                    public.get("category") or "",
                    public.get("description") or "",
                    " ".join(public.get("colors") or []),
                    " ".join(public.get("tags") or []),
                ]
            ).lower()
            if tokens and not any(token in blob for token in tokens):
                continue
            if category and category.lower() not in (public.get("category") or "").lower():
                continue
            if max_price_mad is not None and float(public.get("price_mad") or 0) > float(max_price_mad):
                continue
            if color and color.lower() not in " ".join(public.get("colors") or []).lower():
                continue
            if size and str(size) not in (public.get("sizes") or {}):
                continue
            if size and int((public.get("sizes") or {}).get(str(size), 0)) <= 0:
                continue
            results.append(public)
        return results

    def check_stock(self, product_id: str, size: Optional[str] = None) -> dict:
        product = self.get_product(product_id)
        if not product:
            return {"found": False, "product_id": product_id, "error": "المنتج غير موجود"}
        sizes = product.get("sizes") or {}
        if size:
            qty = int(sizes.get(str(size), 0))
            return {
                "found": True,
                "product_id": product_id,
                "name": product.get("name_darija") or product.get("name"),
                "size": str(size),
                "quantity": qty,
                "available": qty > 0,
            }
        return {
            "found": True,
            "product_id": product_id,
            "name": product.get("name_darija") or product.get("name"),
            "sizes": sizes,
            "stock_total": product.get("stock_total"),
            "available": bool(product.get("in_stock")),
        }


class ApiCatalog(Catalog):
    def __init__(self, base_url: str = PRODUCTS_API_URL):
        url = (base_url or "").rstrip("/")
        if not url:
            raise ValueError("PRODUCTS_API_URL is required when CATALOG_SOURCE=api")
        if url.endswith("/products"):
            url = url[: -len("/products")]
        self.base_url = url
        parsed = urlparse(url)
        self.origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ""

    def _get(self, path: str, params: Optional[dict] = None) -> Any:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(f"{self.base_url}{path}", params=params)
            response.raise_for_status()
            return response.json()

    def _all_products(self, extra_params: Optional[dict] = None) -> list[dict]:
        params = {"limit": 50, "page": 1}
        if extra_params:
            params.update({k: v for k, v in extra_params.items() if v not in (None, "")})
        first = self._get("/products", params=params)
        items = list(_extract_products(first))
        pages = min(_page_count(first), 2)
        for page in range(2, pages + 1):
            params["page"] = page
            payload = self._get("/products", params=params)
            items.extend(_extract_products(payload))
        return [normalize_product(item, self.origin) for item in items]

    def list_products(self, category: Optional[str] = None) -> list[dict]:
        items = self._all_products({"category": category} if category else None)
        if category:
            needle = category.strip().lower()
            items = [
                p
                for p in items
                if needle in (p.get("category") or "").lower() or needle in (p.get("name_darija") or "").lower()
            ]
        return items

    def get_product(self, product_id: str) -> Optional[dict]:
        try:
            data = self._get(f"/products/{product_id}")
            found = _extract_products(data)
            if found:
                return normalize_product(found[0], self.origin)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code != 404:
                raise
        for product in self.list_products():
            if product["id"] == str(product_id):
                return product
        return None

    def search_products(
        self,
        query: str,
        category: Optional[str] = None,
        max_price_mad: Optional[float] = None,
        color: Optional[str] = None,
        size: Optional[str] = None,
    ) -> list[dict]:
        items = self._all_products({"search": query, "category": category})
        tokens = [t for t in (query or "").lower().split() if t]
        results = []
        for product in items:
            blob = " ".join(
                [
                    product.get("id") or "",
                    product.get("name") or "",
                    product.get("name_darija") or "",
                    product.get("category") or "",
                    product.get("description") or "",
                    " ".join(product.get("tags") or []),
                ]
            ).lower()
            if tokens and not any(token in blob for token in tokens):
                continue
            if category and category.lower() not in (product.get("category") or "").lower():
                continue
            if max_price_mad is not None and float(product.get("price_mad") or 0) > float(max_price_mad):
                continue
            if color and color.lower() not in " ".join(product.get("colors") or []).lower():
                continue
            if size and str(size) not in (product.get("sizes") or {}):
                continue
            results.append(product)
        return results

    def check_stock(self, product_id: str, size: Optional[str] = None) -> dict:
        product = self.get_product(product_id)
        if not product:
            return {"found": False, "product_id": product_id, "error": "المنتج غير موجود"}
        qty = int(product.get("stock_total") or 0)
        if size and product.get("sizes"):
            qty = int((product.get("sizes") or {}).get(str(size), 0))
        return {
            "found": True,
            "product_id": product_id,
            "name": product.get("name_darija") or product.get("name"),
            "size": size,
            "quantity": qty,
            "stock_total": product.get("stock_total"),
            "available": qty > 0,
        }


def get_catalog() -> Catalog:
    source = (os.getenv("CATALOG_SOURCE") or CATALOG_SOURCE or "mock").strip().lower()
    api_url = (os.getenv("PRODUCTS_API_URL") or PRODUCTS_API_URL or "").rstrip("/")
    if source == "api":
        return ApiCatalog(api_url)
    return MockCatalog()

from __future__ import annotations

import json
import logging
import time
from typing import Optional

from google import genai
from google.genai import types

from app.catalog import Catalog, get_catalog
from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.handoff import wants_human
from app.prompt import SYSTEM_PROMPT
from app.tools import collect_products, dispatch, tool_declarations

logger = logging.getLogger("bmstore.chat")

MAX_GEMINI_ROUNDS = 2
PREFETCH_LIMIT = 12

_PRODUCT_HINTS = (
    "منتج",
    "منتجات",
    "سلع",
    "سلعة",
    "كاين",
    "عندكم",
    "عندك",
    "ثمن",
    "سعر",
    "شحال",
    "مخزون",
    "عرض",
    "عروض",
    "تخفيض",
    "فواكه",
    "عسل",
    "زيت",
    "product",
    "price",
    "stock",
    "catalogue",
    "catalog",
    "acheter",
    "prix",
    "تلقا",
    "نحب",
    "ندور",
)

_GREETING_ONLY = (
    "سلام",
    "السلام",
    "مرحبا",
    "أهلا",
    "اهلا",
    "hello",
    "hi",
    "hey",
    "salut",
    "bonjour",
    "bonsoir",
    "merci",
    "شكرا",
    "شكراً",
)


def _client() -> genai.Client:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing. Copy .env.example to .env and add your key.")
    return genai.Client(api_key=GEMINI_API_KEY)


def _tools() -> list[types.Tool]:
    declarations = []
    for raw in tool_declarations():
        declarations.append(
            types.FunctionDeclaration(
                name=raw["name"],
                description=raw.get("description"),
                parameters=raw.get("parameters"),
            )
        )
    return [types.Tool(function_declarations=declarations)]


def _history_to_contents(history: list[dict]) -> list[types.Content]:
    contents: list[types.Content] = []
    for item in history:
        role = "user" if item.get("role") == "user" else "model"
        text = item.get("content") or ""
        if not text:
            continue
        contents.append(types.Content(role=role, parts=[types.Part(text=text)]))
    return contents


def _extract_function_calls(response) -> list:
    calls = getattr(response, "function_calls", None) or []
    if calls:
        return calls
    candidates = getattr(response, "candidates", None) or []
    if not candidates or not getattr(candidates[0], "content", None):
        return []
    found = []
    for part in candidates[0].content.parts or []:
        fc = getattr(part, "function_call", None)
        if fc:
            found.append(fc)
    return found


def _response_text(response) -> str:
    candidates = getattr(response, "candidates", None) or []
    if not candidates or not getattr(candidates[0], "content", None):
        return ""
    chunks = []
    for part in candidates[0].content.parts or []:
        if getattr(part, "thought", False):
            continue
        text = getattr(part, "text", None)
        if text:
            chunks.append(text)
    return "".join(chunks).strip()


def _is_transient(exc: BaseException) -> bool:
    message = str(exc)
    return any(
        token in message
        for token in ("RESOURCE_EXHAUSTED", "UNAVAILABLE", "DEADLINE", "429", "500", "503", "timeout", "Timeout")
    )


def _empty_timings() -> dict:
    return {"gemini_ms": 0, "tool_ms": 0, "rounds": 0}


def is_product_query(message: str) -> bool:
    text = (message or "").strip().lower()
    if not text:
        return False
    stripped = "".join(ch for ch in text if ch.isalnum() or ch.isspace())
    tokens = [tok for tok in stripped.split() if tok]
    if tokens and all(any(greet == tok or greet in tok for greet in _GREETING_ONLY) for tok in tokens):
        return False
    return any(hint in text for hint in _PRODUCT_HINTS)


def _compact_products(products: list[dict]) -> list[dict]:
    compact = []
    for product in products[:PREFETCH_LIMIT]:
        compact.append(
            {
                "id": product.get("id"),
                "name": product.get("name"),
                "name_darija": product.get("name_darija"),
                "category": product.get("category"),
                "price_mad": product.get("price_mad"),
                "stock_total": product.get("stock_total"),
                "in_stock": product.get("in_stock"),
            }
        )
    return compact


def prefetch_catalog(user_message: str, catalog: Catalog) -> tuple[list[dict], str]:
    products = catalog.search_products(query=user_message)
    tool_name = "search_products"
    if not products:
        products = catalog.list_products()
        tool_name = "list_products"
    return products[:PREFETCH_LIMIT], tool_name


def catalog_fallback(user_message: str, catalog: Catalog, timings: Optional[dict] = None) -> dict:
    timings = timings or _empty_timings()
    query = (user_message or "").strip()
    products: list[dict] = []
    started = time.perf_counter()
    try:
        if query:
            products = catalog.search_products(query=query)
        if not products:
            products = catalog.list_products()
    except Exception:
        products = []
    timings["tool_ms"] += int((time.perf_counter() - started) * 1000)
    products = products[:6]
    if products:
        names = "، ".join(
            (item.get("name_darija") or item.get("name") or "").strip()
            for item in products
            if (item.get("name_darija") or item.get("name"))
        )
        message = f"هادي بعض المنتجات لي كاينين دوكا: {names}. واش تحبي نزيد نفصل؟"
        tools = [{"name": "search_products", "args": {"query": query}}]
    else:
        message = "سمح لي، ما قدرت نجاوب دوكا. عاودي السؤال."
        tools = []
    return {
        "message": message,
        "products": products,
        "tools": tools,
        "handoff": None,
        "timings": timings,
    }


def run_turn(
    user_message: str,
    history: Optional[list[dict]] = None,
    catalog: Optional[Catalog] = None,
) -> dict:
    catalog = catalog or get_catalog()
    timings = _empty_timings()
    try:
        return _run_gemini_turn(user_message, history or [], catalog, timings)
    except Exception:
        logger.exception("gemini turn failed; using catalog fallback")
        return catalog_fallback(user_message, catalog, timings)


def _run_gemini_turn(user_message: str, history: list[dict], catalog: Catalog, timings: dict) -> dict:
    client = _client()
    contents = _history_to_contents(history)
    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    tool_trace: list[dict] = []
    if is_product_query(user_message):
        started = time.perf_counter()
        prefetched, tool_name = prefetch_catalog(user_message, catalog)
        timings["tool_ms"] += int((time.perf_counter() - started) * 1000)
        if prefetched:
            tool_trace.append(
                {
                    "name": tool_name,
                    "args": {"query": user_message} if tool_name == "search_products" else {},
                    "result": {"count": len(prefetched), "products": prefetched},
                }
            )
            catalog_note = (
                "نتائج الكتالوج الحي لهذه الرسالة. جاوب منها ولا تعاودي search_products/list_products "
                "إلا إذا كانت ناقصة:\n"
                + json.dumps(_compact_products(prefetched), ensure_ascii=False)
            )
            contents.append(types.Content(role="user", parts=[types.Part(text=catalog_note)]))

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=_tools(),
        temperature=0.3,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    )

    handoff: Optional[dict] = None
    text = ""

    for _ in range(MAX_GEMINI_ROUNDS):
        response = None
        last_error = None
        for attempt in range(3):
            try:
                started = time.perf_counter()
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=contents,
                    config=config,
                )
                timings["gemini_ms"] += int((time.perf_counter() - started) * 1000)
                timings["rounds"] += 1
                break
            except Exception as exc:
                last_error = exc
                if _is_transient(exc) and attempt < 2:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                raise
        if response is None:
            raise last_error or RuntimeError("Gemini returned no response")
        calls = _extract_function_calls(response)
        if not calls:
            text = _response_text(response)
            break

        candidates = getattr(response, "candidates", None) or []
        if not candidates or not getattr(candidates[0], "content", None):
            text = _response_text(response)
            break
        contents.append(candidates[0].content)

        fn_response_parts = []
        for call in calls:
            name = call.name
            args = dict(call.args or {})
            started = time.perf_counter()
            result = dispatch(catalog, name, args)
            timings["tool_ms"] += int((time.perf_counter() - started) * 1000)
            tool_trace.append({"name": name, "args": args, "result": result})
            if result.get("handed_off"):
                handoff = result
            fn_response_parts.append(
                types.Part.from_function_response(name=name, response=result)
            )
        contents.append(types.Content(role="user", parts=fn_response_parts))

    if not handoff and wants_human(user_message):
        summary = user_message[:280]
        result = dispatch(
            catalog,
            "request_human_handoff",
            {"reason": "طلب الزبون إنسان", "summary": summary},
        )
        tool_trace.append(
            {"name": "request_human_handoff", "args": {"reason": "طلب الزبون إنسان"}, "result": result}
        )
        handoff = result
        if not text:
            text = "ماشي مشكل، نحولك لصاحب المحل باش يرد عليك."

    if not text:
        text = "سمح لي، ما قدرت نجاوب دوكا. عاودي السؤال."

    logger.info(
        "chat timings gemini_ms=%s tool_ms=%s rounds=%s tools=%s",
        timings["gemini_ms"],
        timings["tool_ms"],
        timings["rounds"],
        [item["name"] for item in tool_trace],
    )

    return {
        "message": text,
        "products": collect_products(tool_trace),
        "tools": [{"name": t["name"], "args": t["args"]} for t in tool_trace],
        "handoff": {
            "reason": handoff.get("reason"),
            "summary": handoff.get("summary"),
        }
        if handoff
        else None,
        "timings": timings,
    }

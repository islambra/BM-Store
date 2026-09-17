from __future__ import annotations

import time
from typing import Optional

from google import genai
from google.genai import types
from google.genai import errors as genai_errors

from app.catalog import Catalog, get_catalog
from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.handoff import wants_human
from app.prompt import SYSTEM_PROMPT
from app.tools import collect_products, dispatch, tool_declarations


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


def run_turn(
    user_message: str,
    history: Optional[list[dict]] = None,
    catalog: Optional[Catalog] = None,
) -> dict:
    catalog = catalog or get_catalog()
    client = _client()
    contents = _history_to_contents(history or [])
    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=_tools(),
        temperature=0.3,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    )

    tool_trace: list[dict] = []
    handoff: Optional[dict] = None
    text = ""

    for _ in range(5):
        response = None
        last_error = None
        for attempt in range(4):
            try:
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=contents,
                    config=config,
                )
                break
            except genai_errors.ClientError as exc:
                last_error = exc
                message = str(exc)
                if "RESOURCE_EXHAUSTED" in message or "429" in message:
                    time.sleep(3 * (attempt + 1))
                    continue
                raise
        if response is None:
            raise last_error
        calls = _extract_function_calls(response)
        if not calls:
            text = _response_text(response)
            break

        model_content = response.candidates[0].content
        contents.append(model_content)

        fn_response_parts = []
        for call in calls:
            name = call.name
            args = dict(call.args or {})
            result = dispatch(catalog, name, args)
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
    }

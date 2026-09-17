#!/usr/bin/env python3
"""Conversation + handoff checks against mock tools (no Gemini required for heuristics)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.handoff import wants_human
from app.notify import customer_chat_url, digits_only
from app.catalog import MockCatalog
from app.tools import dispatch


def main() -> None:
    assert wants_human("بغيت نهدر مع صاحب المحل")
    assert wants_human("واش يمكن تخفيض كبير؟")
    assert not wants_human("واش كاين قفطان أسود؟")

    catalog = MockCatalog()
    result = dispatch(
        catalog,
        "request_human_handoff",
        {"reason": "تفاوض", "summary": "بغات تخفيض على القفطان الذهبي"},
    )
    assert result["handed_off"] is True
    assert digits_only("+213 540415331") == "213540415331"
    url = customer_chat_url("طلب صاحبة المحل", "تحب قفطان أسود مقاس M")
    assert url and "wa.me/213540415331" in url
    print("handoff heuristics: ok")


if __name__ == "__main__":
    main()

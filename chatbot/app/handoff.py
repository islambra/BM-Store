from __future__ import annotations

import re

HANDOFF_PATTERNS = [
    r"صاحب\s*المحل",
    r"المالك",
    r"المولا",
    r"مولات?\s*المحل",
    r"واتساب",
    r"whats?app",
    r"نهدر مع",
    r"نهضر مع",
    r"شكاية",
    r"complain",
    r"رجعو?\s*لي\s*(الفلوس|الدراهم)",
    r"refund",
    r"بدّل",
    r"تفصيل",
    r"تخفيض كبير",
    r"خصم كبير",
]


def wants_human(text: str) -> bool:
    if not text:
        return False
    lowered = text.lower()
    return any(re.search(pattern, lowered, flags=re.IGNORECASE) for pattern in HANDOFF_PATTERNS)


def handoff_payload(reason: str, summary: str) -> dict:
    return {
        "handed_off": True,
        "reason": reason,
        "summary": summary,
        "message": "تم تحويل المحادثة لصاحب المحل. يرد عليك قريب إن شاء الله.",
    }

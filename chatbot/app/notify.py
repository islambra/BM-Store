from __future__ import annotations

import os
from typing import Optional
from urllib.parse import quote

from dotenv import load_dotenv

load_dotenv()


def _owner_phone() -> str:
    load_dotenv(override=True)
    return "".join(ch for ch in os.getenv("OWNER_WHATSAPP", "") if ch.isdigit())


def digits_only(phone: str) -> str:
    return "".join(ch for ch in (phone or "") if ch.isdigit())


def customer_chat_url(reason: str, summary: str) -> Optional[str]:
    phone = _owner_phone()
    if not phone:
        return None
    text = (
        "السلام، راني نكتبلك من موقع المتجر.\n\n"
        f"السبب: {reason}\n"
        f"الملخص: {summary}\n\n"
        "شكرا."
    )
    return f"https://wa.me/{phone}?text={quote(text)}"


def notify_owner(conversation_id: str, reason: str, summary: str) -> dict:
    """Free path: never sends via WhatsApp API. Only builds a wa.me link for the customer."""
    url = customer_chat_url(reason, summary)
    return {
        "conversation_id": conversation_id,
        "reason": reason,
        "summary": summary,
        "whatsapp_url": url,
        "sent": False,
        "channel": "wa.me" if url else None,
    }

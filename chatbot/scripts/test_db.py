#!/usr/bin/env python3
"""Step 6: conversation persistence without Gemini."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import db


def main() -> None:
    db.init_db()
    cid = db.create_conversation()
    db.add_message(cid, "user", "واش كاين قفطان؟")
    db.add_message(cid, "assistant", "آه، كاين القفطان الملكي.")
    convo = db.get_conversation(cid)
    assert len(convo["messages"]) == 2
    db.mark_handoff(cid, "طلب المالك", "بغات تهضر مع صاحب المحل")
    convo = db.get_conversation(cid)
    assert convo["status"] == "handed_off"
    assert convo["handoff"]["reason"] == "طلب المالك"
    print("sqlite conversations: ok")


if __name__ == "__main__":
    main()

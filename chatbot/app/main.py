from typing import Optional
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import db
from app.catalog import get_catalog
from app.config import CATALOG_SOURCE, CORS_ORIGINS, GEMINI_API_KEY
from app.gemini_chat import run_turn
from app.notify import customer_chat_url, notify_owner

app = FastAPI(title="نور الأناقة — مساعدة المحل", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None


class SessionResponse(BaseModel):
    sessionId: str


@app.on_event("startup")
def startup() -> None:
    db.init_db()


@app.get("/")
def root():
    return {"service": "نور الأناقة", "docs": "/docs", "health": "/health"}


@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "catalog": CATALOG_SOURCE,
        "gemini": bool(GEMINI_API_KEY),
        "whatsapp": bool(os.getenv("OWNER_WHATSAPP", "").strip()),
    }


@app.post("/api/session", response_model=SessionResponse)
def create_session():
    return {"sessionId": db.create_conversation()}


@app.post("/api/chat")
def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message is required")
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    session_id = req.sessionId
    if not session_id or not db.conversation_exists(session_id):
        session_id = db.create_conversation()

    history = db.list_history(session_id)
    db.add_message(session_id, "user", req.message.strip())

    try:
        result = run_turn(req.message.strip(), history=history, catalog=get_catalog())
    except Exception as exc:
        err = str(exc)
        if "RESOURCE_EXHAUSTED" in err or "429" in err:
            raise HTTPException(status_code=429, detail="السيرفر مشغول دوكا، استنائي شوية وعاودي.") from exc
        raise HTTPException(status_code=502, detail="ما قدرناش نجاوبو دوكا، عاودي من بعد.") from exc

    db.add_message(session_id, "assistant", result["message"])
    handoff = None
    if result.get("handoff"):
        handoff = db.mark_handoff(
            session_id,
            result["handoff"]["reason"],
            result["handoff"]["summary"],
        )
        notice = notify_owner(
            session_id,
            result["handoff"]["reason"],
            result["handoff"]["summary"],
        )
        handoff["whatsapp_url"] = notice.get("whatsapp_url") or customer_chat_url(
            result["handoff"]["reason"],
            result["handoff"]["summary"],
        )
        handoff["notified"] = bool(notice.get("sent"))

    return {
        "sessionId": session_id,
        "message": result["message"],
        "data": {"products": result.get("products") or []},
        "tools": result.get("tools") or [],
        "timings": result.get("timings") or {},
        "handoff": handoff,
    }


@app.get("/api/conversations/{conversation_id}")
def get_conversation(conversation_id: str):
    data = db.get_conversation(conversation_id)
    if not data:
        raise HTTPException(status_code=404, detail="conversation not found")
    return data


@app.get("/api/owner/handoffs")
def owner_handoffs():
    return {"handoffs": db.list_handoffs()}

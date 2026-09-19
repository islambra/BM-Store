# Chatbot — what to set when deploying

Public settings already used for the BM Store chatbot.  
Put these on the host (Render). Do not commit a real `.env` with a live Gemini key.

## Services

| Role | URL |
|---|---|
| Chatbot API | https://bm-store-vywx.onrender.com |
| Chatbot Swagger | https://bm-store-vywx.onrender.com/docs |
| Chat endpoint | POST https://bm-store-vywx.onrender.com/api/chat |
| Marketplace products API (catalog) | https://bm-store-tsw8.onrender.com/api |
| Marketplace website (frontend) | https://bm-store-tsw8.onrender.com |

The chat bubble on the website calls the chatbot API. The chatbot reads products from the marketplace API.

## Frontend (`client/`) — set at **build** time, then redeploy the website

```
VITE_CHATBOT_API_URL=https://bm-store-vywx.onrender.com
```

No `/api` suffix. The app posts to `/api/session` and `/api/chat` on that origin.

If this variable is missing, the code already uses `https://bm-store-vywx.onrender.com`.

Also in `client/.env.example`.

## Chatbot backend (`chatbot/`) — Render environment

```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
CATALOG_SOURCE=api
PRODUCTS_API_URL=https://bm-store-tsw8.onrender.com/api
CORS_ORIGINS=https://bm-store-tsw8.onrender.com,http://localhost:3001
OWNER_WHATSAPP=213XXXXXXXXX
```

| Variable | Current value | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | set on Render only (never commit the real key) | Gemini answers |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | Model name |
| `CATALOG_SOURCE` | `api` | Use live BM Store products |
| `PRODUCTS_API_URL` | `https://bm-store-tsw8.onrender.com/api` | Catalog |
| `CORS_ORIGINS` | `https://bm-store-tsw8.onrender.com` plus local Vite/CRA | Browser origins allowed to call the chatbot |
| `OWNER_WHATSAPP` | `213XXXXXXXXX` | WhatsApp handoff (digits, country code included) |

If the website URL changes, update `CORS_ORIGINS` to that origin or the bubble will fail in the browser (Swagger can still work).

Also in `chatbot/.env.example`.

## If URLs change later

Keep these three in sync:

1. Frontend `VITE_CHATBOT_API_URL` = chatbot API origin (`https://bm-store-vywx.onrender.com`)
2. Chatbot `PRODUCTS_API_URL` = marketplace API (`https://bm-store-tsw8.onrender.com/api`)
3. Chatbot `CORS_ORIGINS` includes the live website origin (`https://bm-store-tsw8.onrender.com`)

Then rebuild the frontend (for `VITE_*`) and restart the chatbot service.

## Request body (chat)

```
POST https://bm-store-vywx.onrender.com/api/chat
Content-Type: application/json

{
  "message": "string",
  "sessionId": "string"
}
```

`sessionId` is optional on the first message.

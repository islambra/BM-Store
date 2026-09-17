# نور الأناقة — مساعدة المحل

مساعدة دردشة بالدارجة الجزائرية والفصحى: Gemini 3.1 Flash-Lite + function calling على كتالوج المنتجات، حفظ المحادثات، وتحويل لصاحب المحل.

## قرار على كود GitHub السابق

الكود القديم (Google ADK + 9 خدمات gRPC + عربة/أداء + GKE) ما كيناسبش محل صغير.  
**تبنينا من الصفر للمنطق**، وبقينا غير على فكرة React + فقاعة الدردشة.

طبقة الكتالوج مربوطة بـ BM Store: `CATALOG_SOURCE=api` و `PRODUCTS_API_URL`.

## التشغيل

```bash
cp .env.example .env   # حطي GEMINI_API_KEY
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 1) Gemini وحده
python scripts/test_gemini.py

# أدوات الـ mock بدون مفتاح
python scripts/test_function_calling.py
python scripts/test_handoff.py

# السيرفر
uvicorn app.main:app --reload --port 8000
```

واجهة:

```bash
cd frontend && npm install && npm start
```

- الواجهة: http://localhost:3000
- API: http://localhost:8000/docs
- تحويلات المالك: http://localhost:8000/api/owner/handoffs

## استبدال الـ mock بـ API حقيقي

في `.env`:

```
CATALOG_SOURCE=api
PRODUCTS_API_URL=https://bm-store-tsw8.onrender.com/api
```

الكتالوج يقرأ `GET /products` بالشكل `{ success, data: { products, page, pages } }` و `GET /products/{id}`.
صور `localhost:5000` تتحوّل تلقائياً إلى نطاق Render.

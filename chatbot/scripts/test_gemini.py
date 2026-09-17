#!/usr/bin/env python3
"""Step 1: Gemini API only — one message in, one reply out."""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key or api_key.startswith("your_"):
    print("Missing GEMINI_API_KEY. Copy .env.example to .env and paste your key.")
    sys.exit(1)

model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
prompt = sys.argv[1] if len(sys.argv) > 1 else "قول مرحبا بجملة وحدة بالدارجة الجزائرية."

client = genai.Client(api_key=api_key)
response = client.models.generate_content(model=model, contents=prompt)
print(response.text)

"""PostCare-Gemini — Google Gemini API client for agent layer."""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

AGENT_NAME = "PostCare-Gemini"
API_KEY = os.environ.get("POSTCARE_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
MODEL = os.environ.get("POSTCARE_GEMINI_MODEL", "gemini-2.0-flash")


def is_configured() -> bool:
    return bool(API_KEY)


def generate_json(prompt: str) -> dict | None:
    """Call Gemini with JSON response. Returns None if unconfigured or on failure."""
    if not API_KEY:
        return None

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}"
        f":generateContent?key={API_KEY}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        text = body["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (urllib.error.URLError, KeyError, IndexError, json.JSONDecodeError, TimeoutError) as exc:
        logger.warning("PostCare-Gemini call failed: %s", exc)
        return None

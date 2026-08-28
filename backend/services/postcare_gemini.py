"""PostCare-Gemini — Google Gemini API client for agent layer."""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

AGENT_NAME = "PostCare-Gemini"
FALLBACK_MODELS = ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest")


def _api_key() -> str | None:
    return os.environ.get("POSTCARE_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")


def _model_name() -> str:
    return os.environ.get("POSTCARE_GEMINI_MODEL", "gemini-2.0-flash")


def is_configured() -> bool:
    return bool(_api_key())


def model_name() -> str:
    return _model_name()


def _parse_json_text(text: str) -> dict | None:
    text = text.strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


def _call_gemini(payload: dict, *, model: str) -> str | None:
    api_key = _api_key()
    if not api_key:
        return None

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
        f":generateContent?key={api_key}"
    )
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        return body["candidates"][0]["content"]["parts"][0]["text"]
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, TimeoutError) as exc:
        logger.warning("PostCare-Gemini call failed for model %s: %s", model, exc)
        return None


def _models_to_try() -> list[str]:
    primary = _model_name()
    return [primary, *[m for m in FALLBACK_MODELS if m != primary]]


def generate_text(prompt: str, *, temperature: float = 0.4) -> str | None:
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature},
    }
    for model in _models_to_try():
        text = _call_gemini(payload, model=model)
        if text and text.strip():
            return text.strip()
    return None


def generate_chat(
    system: str,
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.7,
) -> str | None:
    """Multi-turn chat; messages use roles 'user' and 'assistant'."""
    contents = []
    for msg in messages:
        role = "user" if msg.get("role") == "user" else "model"
        text = (msg.get("content") or "").strip()
        if not text:
            continue
        contents.append({"role": role, "parts": [{"text": text}]})
    if not contents:
        return None

    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }
    for model in _models_to_try():
        text = _call_gemini(payload, model=model)
        if text and text.strip():
            return text.strip()
    return None


def generate_json(prompt: str, *, temperature: float = 0.4) -> dict | None:
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json",
        },
    }
    for model in _models_to_try():
        text = _call_gemini(payload, model=model)
        if not text:
            continue
        parsed = _parse_json_text(text)
        if parsed is not None:
            return parsed
        logger.warning("PostCare-Gemini JSON parse failed for model %s", model)
    return None

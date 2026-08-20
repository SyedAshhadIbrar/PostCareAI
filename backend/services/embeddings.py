"""Semantic embeddings for RAG — sentence-transformers with Gemini API fallback."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import TYPE_CHECKING

import numpy as np

from backend.core.settings import POSTCARE_GEMINI_API_KEY, RAG_EMBED_MODEL

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

_st_model = None
_backend: str | None = None


def _load_sentence_transformer():
    global _st_model, _backend
    if _st_model is not None:
        return _st_model
    from sentence_transformers import SentenceTransformer

    _st_model = SentenceTransformer(RAG_EMBED_MODEL)
    _backend = "sentence-transformers"
    logger.info("RAG embeddings: %s (%s)", RAG_EMBED_MODEL, _backend)
    return _st_model


def _gemini_embed_batch(texts: list[str]) -> list[np.ndarray] | None:
    if not POSTCARE_GEMINI_API_KEY:
        return None

    embed_model = "text-embedding-004"
    vectors: list[np.ndarray] = []
    for text in texts:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{embed_model}"
            f":embedContent?key={POSTCARE_GEMINI_API_KEY}"
        )
        payload = {
            "model": f"models/{embed_model}",
            "content": {"parts": [{"text": text[:8000]}]},
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            values = body["embedding"]["values"]
            vec = np.array(values, dtype=np.float32)
            norm = float(np.linalg.norm(vec))
            vectors.append(vec / norm if norm > 0 else vec)
        except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError) as exc:
            logger.warning("Gemini embed failed: %s", exc)
            return None
    global _backend
    _backend = "gemini-embedding"
    return vectors


def embed_texts(texts: list[str]) -> np.ndarray:
    """Return (N, dim) L2-normalized embedding matrix."""
    if not texts:
        return np.zeros((0, 0), dtype=np.float32)

    try:
        model = _load_sentence_transformer()
        matrix = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return matrix.astype(np.float32)
    except Exception as exc:
        logger.warning("sentence-transformers unavailable (%s), trying Gemini embed", exc)

    gemini_vecs = _gemini_embed_batch(texts)
    if gemini_vecs:
        return np.stack(gemini_vecs).astype(np.float32)

    raise RuntimeError(
        "No embedding backend available. Install sentence-transformers "
        "or set POSTCARE_GEMINI_API_KEY for Gemini embeddings."
    )


def embed_query(text: str) -> np.ndarray:
    matrix = embed_texts([text])
    return matrix[0]


def embedding_backend() -> str:
    return _backend or "unknown"


def embedding_model_name() -> str:
    if _backend == "gemini-embedding":
        return "text-embedding-004"
    return RAG_EMBED_MODEL

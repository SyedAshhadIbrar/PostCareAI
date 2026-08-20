"""Application settings and resolved paths."""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = Path(os.environ.get("POSTCARE_MODEL_DIR", REPO_ROOT / "models" / "medsiglip"))
RAG_DOCUMENTS_DIR = REPO_ROOT / "rag" / "documents"
RAG_EMBED_MODEL = os.environ.get("POSTCARE_RAG_EMBED_MODEL", "all-MiniLM-L6-v2")

HF_TOKEN = os.environ.get("HF_TOKEN")
DEVICE = os.environ.get("POSTCARE_DEVICE", "cpu")

POSTCARE_GEMINI_API_KEY = os.environ.get("POSTCARE_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
POSTCARE_GEMINI_MODEL = os.environ.get("POSTCARE_GEMINI_MODEL", "gemini-2.0-flash")

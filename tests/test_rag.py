"""Tests for vector RAG retrieval."""

from __future__ import annotations

import pytest

from backend.core.settings import RAG_DOCUMENTS_DIR
from backend.services.rag_ingest import ingest_all
from backend.services.vector_store import VectorStore


@pytest.fixture(scope="module")
def vector_index() -> VectorStore:
    """Build a fresh in-memory-backed index for retrieval tests."""
    store = VectorStore(index_path=RAG_DOCUMENTS_DIR.parent.parent / "data" / "test_rag_index.json")
    count = store.build(documents_dir=RAG_DOCUMENTS_DIR, force=True)
    if count == 0:
        pytest.skip("No RAG documents found under rag/documents/")
    return store


def test_ingest_finds_document_chunks() -> None:
    chunks, fingerprint = ingest_all()

    assert chunks, "expected at least one chunk from rag/documents"
    assert fingerprint
    assert any(chunk.get("text") for chunk in chunks)


def test_rag_retrieval_returns_non_empty_results(vector_index: VectorStore) -> None:
    hits = vector_index.search(
        "appendectomy wound care redness bathing day 3",
        top_k=4,
        min_score=0.0,
    )

    assert hits, "semantic search should return at least one chunk"
    first = hits[0]
    assert first.get("text")
    assert first.get("source")
    assert "score" in first
    assert first["score"] >= 0.0

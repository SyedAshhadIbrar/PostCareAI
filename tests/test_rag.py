"""RAG ingestion and vector store search."""

from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest

from backend.services.rag_ingest import _chunk_plain_text, ingest_all
from backend.services.vector_store import VectorStore


def test_chunk_plain_text_splits_long_body():
    text = "word " * 200
    chunks = _chunk_plain_text(text, chunk_size=100, overlap=20)
    assert len(chunks) >= 2
    assert all(len(c) <= 100 for c in chunks)


def test_ingest_all_finds_markdown_guide():
    chunks, fingerprint = ingest_all()
    assert fingerprint
    assert len(chunks) >= 1
    assert any("post_op_recovery_guide" in c["doc_id"] for c in chunks)


def test_vector_store_search_with_mock_embeddings(tmp_path):
    store = VectorStore(index_path=tmp_path / "rag_test.json")
    store.chunks = [
        {
            "id": "c0",
            "doc_id": "guide",
            "source": "post_op_recovery_guide.md",
            "section": "Showering",
            "page": None,
            "text": "Patients may shower gently after surgery unless told otherwise.",
        },
        {
            "id": "c1",
            "doc_id": "guide",
            "source": "post_op_recovery_guide.md",
            "section": "Pain",
            "page": None,
            "text": "Take prescribed pain medicine and rest if pain worsens.",
        },
    ]
    store.vectors = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)

    with patch("backend.services.vector_store.embed_svc.embed_query", return_value=np.array([1.0, 0.0], dtype=np.float32)):
        hits = store.search("When can I shower?", top_k=1, min_score=0.0)

    assert len(hits) == 1
    assert "shower" in hits[0]["text"].lower()

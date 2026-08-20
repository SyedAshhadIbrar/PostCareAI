"""Vector database — semantic embeddings + cosine retrieval over ingested documents."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np

from backend.core.settings import RAG_DOCUMENTS_DIR, REPO_ROOT
from backend.services import embeddings as embed_svc
from backend.services.rag_ingest import ingest_all

logger = logging.getLogger(__name__)

INDEX_PATH = REPO_ROOT / "data" / "rag_index.json"


class VectorStore:
    def __init__(self, index_path: Path | None = None) -> None:
        self.index_path = Path(index_path or INDEX_PATH)
        self.chunks: list[dict] = []
        self.vectors: np.ndarray | None = None
        self.fingerprint: str = ""
        self.embed_model: str = ""

    def build(self, documents_dir: Path | None = None, force: bool = False) -> int:
        chunks, fingerprint = ingest_all(documents_dir or RAG_DOCUMENTS_DIR)
        if not chunks:
            logger.warning("RAG: no documents found in %s", documents_dir or RAG_DOCUMENTS_DIR)
            self.chunks = []
            self.vectors = None
            self._save()
            return 0

        if not force and self._load() and self.fingerprint == fingerprint:
            logger.info("RAG index up to date (%d chunks)", len(self.chunks))
            return len(self.chunks)

        logger.info("RAG: embedding %d chunks…", len(chunks))
        texts = [c["text"] for c in chunks]
        matrix = embed_svc.embed_texts(texts)

        self.chunks = chunks
        self.vectors = matrix
        self.fingerprint = fingerprint
        self.embed_model = embed_svc.embedding_model_name()
        self._save()
        logger.info(
            "RAG index built: %d chunks, model=%s, backend=%s",
            len(chunks),
            self.embed_model,
            embed_svc.embedding_backend(),
        )
        return len(chunks)

    def load_or_build(self) -> int:
        chunks, fingerprint = ingest_all()
        if self._load() and self.fingerprint == fingerprint and self.chunks:
            return len(self.chunks)
        return self.build(force=True)

    def _save(self) -> None:
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "embed_model": self.embed_model,
            "embed_backend": embed_svc.embedding_backend(),
            "fingerprint": self.fingerprint,
            "chunks": self.chunks,
            "vectors": self.vectors.tolist() if self.vectors is not None else [],
        }
        self.index_path.write_text(json.dumps(payload), encoding="utf-8")

    def _load(self) -> bool:
        if not self.index_path.exists():
            return False
        payload = json.loads(self.index_path.read_text(encoding="utf-8"))
        self.chunks = payload.get("chunks", [])
        vectors = payload.get("vectors", [])
        self.vectors = np.array(vectors, dtype=np.float32) if vectors else None
        self.fingerprint = payload.get("fingerprint", "")
        self.embed_model = payload.get("embed_model", "")
        return bool(self.chunks and self.vectors is not None)

    def search(self, query: str, top_k: int = 4, min_score: float = 0.25) -> list[dict]:
        if not self.chunks or self.vectors is None:
            return []

        q = embed_svc.embed_query(query)
        scores = self.vectors @ q
        order = np.argsort(scores)[::-1][:top_k]

        hits: list[dict] = []
        for idx in order:
            score = float(scores[idx])
            if score < min_score:
                continue
            chunk = dict(self.chunks[int(idx)])
            chunk["score"] = round(score, 4)
            hits.append(chunk)
        return hits


vector_store = VectorStore()


if __name__ == "__main__":
    count = vector_store.build(force=True)
    assert count > 0
    hits = vector_store.search("appendectomy shower bathing wound care day 3", top_k=3)
    assert hits, "expected semantic hits"
    print(f"ok: {count} chunks, top={hits[0]['source']} score={hits[0]['score']}")

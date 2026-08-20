"""RAG data ingestion — load Markdown + PDF, chunk for embedding."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path

from backend.core.settings import RAG_DOCUMENTS_DIR

CHUNK_SIZE = 500
CHUNK_OVERLAP = 80


def source_fingerprint(sources: list[Path]) -> str:
    parts = []
    for path in sorted(sources):
        stat = path.stat()
        parts.append(f"{path.name}:{stat.st_mtime_ns}:{stat.st_size}")
    return hashlib.md5("|".join(parts).encode()).hexdigest()


def discover_sources(documents_dir: Path | None = None) -> list[Path]:
    root = documents_dir or RAG_DOCUMENTS_DIR
    files: list[Path] = []
    files.extend(sorted(root.glob("*.md")))
    pdf_dir = root / "pdfs"
    if pdf_dir.is_dir():
        files.extend(sorted(pdf_dir.glob("*.pdf")))
    return files


def _chunk_plain_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(start + 1, end - overlap)
    return chunks


def _chunk_markdown(text: str, doc_id: str, source: str) -> list[dict]:
    chunks: list[dict] = []
    section = "General"
    buffer: list[str] = []

    def flush() -> None:
        body = "\n".join(buffer).strip()
        if len(body) < 40:
            return
        for i, piece in enumerate(_chunk_plain_text(body)):
            chunks.append(
                {
                    "id": f"{doc_id}-{len(chunks)}",
                    "doc_id": doc_id,
                    "source": source,
                    "section": section,
                    "page": None,
                    "text": piece,
                }
            )

    for line in text.splitlines():
        if line.startswith("#"):
            flush()
            buffer = []
            section = line.lstrip("#").strip() or section
            continue
        buffer.append(line)
    flush()
    return chunks


def _extract_pdf_pages(path: Path) -> list[tuple[int, str]]:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages: list[tuple[int, str]] = []
    for i, page in enumerate(reader.pages):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((i + 1, text))
    return pages


def _chunk_pdf(path: Path) -> list[dict]:
    doc_id = path.stem
    source = path.name
    chunks: list[dict] = []
    for page_num, page_text in _extract_pdf_pages(path):
        for piece in _chunk_plain_text(page_text):
            chunks.append(
                {
                    "id": f"{doc_id}-p{page_num}-{len(chunks)}",
                    "doc_id": doc_id,
                    "source": source,
                    "section": f"Page {page_num}",
                    "page": page_num,
                    "text": piece,
                }
            )
    return chunks


def ingest_all(documents_dir: Path | None = None) -> tuple[list[dict], str]:
    root = documents_dir or RAG_DOCUMENTS_DIR
    sources = discover_sources(root)
    if not sources:
        return [], source_fingerprint([])

    all_chunks: list[dict] = []
    for path in sources:
        if path.suffix.lower() == ".md":
            text = path.read_text(encoding="utf-8")
            all_chunks.extend(_chunk_markdown(text, path.stem, path.name))
        elif path.suffix.lower() == ".pdf":
            all_chunks.extend(_chunk_pdf(path))

    return all_chunks, source_fingerprint(sources)


if __name__ == "__main__":
    chunks, fp = ingest_all()
    assert chunks, "expected chunks from rag/documents"
    pdf_chunks = [c for c in chunks if c["source"].endswith(".pdf")]
    assert pdf_chunks, "expected PDF chunks"
    print(f"ok: {len(chunks)} chunks ({len(pdf_chunks)} from PDF), fingerprint={fp[:8]}")

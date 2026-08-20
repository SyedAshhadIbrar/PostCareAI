# PostCare RAG Knowledge Base

Real retrieval-augmented generation pipeline for patient recovery chat.

## Pipeline

```
Ingestion → Chunking → Embedding → Vector index → Retrieval → Generation
```

| Stage | Implementation |
|-------|----------------|
| **Ingestion** | `rag/documents/*.md` + `rag/documents/pdfs/*.pdf` |
| **Chunking** | Section-aware (MD) or page + sliding window (PDF, 500 chars, 80 overlap) |
| **Embedding** | `sentence-transformers` (`all-MiniLM-L6-v2`) or Gemini `text-embedding-004` fallback |
| **Vector DB** | `data/rag_index.json` (cosine similarity, numpy) |
| **Retrieval** | Top-k semantic matches on patient query + case context |
| **Generation** | PostCare-Gemini (or rule fallback) grounded on retrieved passages |

## Add documents

1. Drop **Markdown** guides in `rag/documents/`
2. Drop **PDF** care guides in `rag/documents/pdfs/`
3. Restart API (index rebuilds automatically when files change)

## Rebuild index manually

```bash
py -3.11 -m backend.services.vector_store
```

## Environment

| Variable | Purpose |
|----------|---------|
| `POSTCARE_RAG_EMBED_MODEL` | HuggingFace sentence-transformer model (default: `all-MiniLM-L6-v2`) |
| `POSTCARE_GEMINI_API_KEY` | Used for chat generation; also embedding fallback if ST unavailable |

## Current documents

- `appendectomy_postop.md` — prototype markdown guide
- `wound_monitoring.md` — wound monitoring basics
- `pdfs/after-appendicitis-surgery-eng.pdf` — post-appendectomy care PDF

"""Keyword RAG over rag/documents/*.md — ponytail: no vector DB until needed."""

from __future__ import annotations

from backend.core.settings import RAG_DOCUMENTS_DIR


def retrieve_guidance(
    procedure: str,
    post_op_day: int,
    findings: dict[str, bool],
    symptoms: list[str] | None = None,
) -> list[dict]:
    terms = [procedure.lower(), f"day {post_op_day}", f"days {post_op_day}"]
    terms.extend(k.replace("_", " ") for k, v in findings.items() if v)
    terms.extend(s.lower() for s in (symptoms or []))

    hits: list[tuple[int, dict]] = []
    for path in sorted(RAG_DOCUMENTS_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8").lower()
        score = sum(1 for term in terms if term in text)
        if score == 0:
            continue
        excerpt = _best_excerpt(path.read_text(encoding="utf-8"), terms)
        hits.append(
            (
                score,
                {
                    "id": path.stem,
                    "source": path.name,
                    "score": score,
                    "excerpt": excerpt,
                },
            )
        )

    hits.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in hits[:3]]


def _best_excerpt(text: str, terms: list[str], max_len: int = 280) -> str:
    lower = text.lower()
    for term in terms:
        idx = lower.find(term)
        if idx >= 0:
            start = max(0, idx - 40)
            snippet = text[start : start + max_len].strip()
            return snippet + ("..." if start + max_len < len(text) else "")
    return text[:max_len].strip() + ("..." if len(text) > max_len else "")


if __name__ == "__main__":
    docs = retrieve_guidance(
        "appendectomy",
        6,
        {"erythema": True, "exudate": True, "infection_risk": True},
        ["redness", "swelling"],
    )
    assert docs, "expected at least one document hit"
    assert docs[0]["excerpt"]
    print(f"ok: {len(docs)} docs, top={docs[0]['id']}")

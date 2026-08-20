"""Patient recovery chat — vector RAG + case context, PostCare-Gemini or rule fallback."""

from __future__ import annotations

import json
from typing import Any

from backend.schemas.case import PostCareCase
from backend.services import postcare_gemini as gemini
from backend.services.vector_store import vector_store

AGENT_NAME = "PostCare-RAG"


def _recovery_snapshot(case: PostCareCase) -> dict[str, Any]:
    p = case.patient
    w = case.wound
    return {
        "case_id": case.case_id,
        "patient_name": p.patient_name,
        "procedure": p.procedure,
        "post_op_day": p.post_op_day,
        "pain_score": p.pain_score,
        "symptoms": p.symptoms,
        "discharge_date": p.discharge_date,
        "consultant_surgeon": p.consultant_surgeon,
        "clinician_priority": case.clinician_priority,
        "safety_flags": case.safety_flags,
        "wound_scores": {
            name: round(getattr(w, name).score, 3)
            for name in (
                "healing_status",
                "erythema",
                "edema",
                "infection_risk",
                "urgency",
                "exudate",
            )
        },
        "wound_signals": {
            name: getattr(w, name).positive
            for name in (
                "healing_status",
                "erythema",
                "edema",
                "infection_risk",
                "urgency",
                "exudate",
            )
        },
    }


def _format_sources(chunks: list[dict]) -> list[dict]:
    return [
        {
            "id": c.get("id"),
            "doc_id": c.get("doc_id"),
            "source": c.get("source"),
            "section": c.get("section"),
            "page": c.get("page"),
            "score": c.get("score"),
            "excerpt": c.get("text", "")[:400],
        }
        for c in chunks
    ]


def _rule_reply(case: PostCareCase, message: str, chunks: list[dict]) -> str:
    ctx = _recovery_snapshot(case)
    parts = [
        f"Hi {ctx['patient_name']}, here is guidance based on your recovery profile "
        f"({ctx['procedure']}, day {ctx['post_op_day']}, pain {ctx['pain_score']}/10)."
    ]

    if ctx["safety_flags"]:
        parts.append(
            "Your recent check-in flagged: "
            + ", ".join(f.replace("_", " ") for f in ctx["safety_flags"])
            + ". Consider contacting your care team if symptoms worsen."
        )

    if chunks:
        parts.append("Based on retrieved recovery documents:")
        for chunk in chunks[:3]:
            cite = chunk.get("source", "guide")
            section = chunk.get("section", "")
            parts.append(f"• [{cite} — {section}] {chunk.get('text', '')[:280]}")
    else:
        parts.append(
            "I could not find a close match in the knowledge base. "
            "Monitor your wound and follow your surgeon's instructions."
        )

    if "pain" in message.lower() and ctx["pain_score"] >= 7:
        parts.append("Your reported pain is elevated — seek urgent advice if it is worsening.")

    parts.append(
        "This is prototype support, not a diagnosis. Call emergency services for severe symptoms."
    )
    return " ".join(parts)


def chat(
    case: PostCareCase,
    message: str,
    history: list[dict[str, str]] | None = None,
    top_k: int = 4,
) -> dict[str, Any]:
    query = f"{case.patient.procedure} day {case.patient.post_op_day} {message}"
    chunks = vector_store.search(query, top_k=top_k)
    sources = _format_sources(chunks)
    recovery = _recovery_snapshot(case)
    history = history or []

    if gemini.is_configured():
        prompt = f"""You are PostCare-RAG, a retrieval-augmented post-operative recovery assistant.

STRICT RULES:
1. Answer ONLY using the Retrieved knowledge passages below plus the patient's recovery data.
2. If retrieved passages do not contain the answer, say you could not find it in the care documents and advise contacting the care team.
3. Do not invent medical facts. Include safety-netting for urgent symptoms.
4. Cite which document/section your answer draws from when possible.

Patient recovery data:
{json.dumps(recovery, indent=2)}

Retrieved knowledge (semantic search from PDF/Markdown care guides):
{json.dumps([{{"source": s["source"], "section": s["section"], "page": s.get("page"), "text": s["excerpt"], "relevance": s["score"]}} for s in sources], indent=2)}

Recent chat:
{json.dumps(history[-6:], indent=2)}

Patient question: {message}

Reply in JSON: {{"reply": "your answer"}}"""
        result = gemini.generate_json(prompt)
        if result and result.get("reply"):
            return {
                "reply": result["reply"],
                "sources": sources,
                "recovery_context": recovery,
                "agent": gemini.AGENT_NAME,
            }

    return {
        "reply": _rule_reply(case, message, chunks),
        "sources": sources,
        "recovery_context": recovery,
        "agent": AGENT_NAME,
    }


if __name__ == "__main__":
    from backend.schemas.case import PatientContext, PostCareCase

    sample = PostCareCase(
        case_id="PC-TEST",
        patient=PatientContext(
            patient_name="Test Patient",
            pain_score=6,
            procedure="appendectomy",
            post_op_day=8,
            symptoms=["redness"],
        ),
        wound={
            "healing_status": {"positive": False, "score": 0.4, "threshold": 0.5},
            "erythema": {"positive": True, "score": 0.7, "threshold": 0.5},
            "edema": {"positive": False, "score": 0.2, "threshold": 0.5},
            "infection_risk": {"positive": True, "score": 0.65, "threshold": 0.5},
            "urgency": {"positive": False, "score": 0.3, "threshold": 0.5},
            "exudate": {"positive": False, "score": 0.2, "threshold": 0.5},
        },
        safety_flags=["visual_infection_signal"],
    )
    out = chat(sample, "Is redness around my wound normal on day 8?")
    assert out["reply"] and out["sources"]
    print(f"ok: agent={out['agent']} sources={len(out['sources'])}")

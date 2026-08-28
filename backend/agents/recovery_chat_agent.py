"""Patient recovery chat — vector RAG + case context, PostCare-Gemini or rule fallback."""

from __future__ import annotations

import json
import logging
from typing import Any

from backend.schemas.case import PostCareCase
from backend.services import postcare_gemini as gemini
from backend.services.vector_store import vector_store

logger = logging.getLogger(__name__)

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
    lower = message.lower()
    parts: list[str] = []

    if any(word in lower for word in ("shower", "bath", "wash", "hygiene")):
        parts.append(
            "For showering, let water run gently over the incision and pat dry. "
            "Avoid soaking unless your surgeon has cleared baths or swimming."
        )
    elif any(word in lower for word in ("pain", "hurt", "ache", "sore")):
        parts.append(
            f"You reported pain {ctx['pain_score']}/10 on post-op day {ctx['post_op_day']}. "
            "Take prescribed pain medicine as directed and rest. "
            "Contact your care team if pain is worsening or not controlled."
        )
    elif any(word in lower for word in ("red", "redness", "swelling", "discharge", "infection")):
        parts.append(
            "Mild redness can be common early on, but spreading redness, warmth, pus, or foul odor "
            "needs clinician review. Monitor the wound and contact your team if symptoms worsen."
        )
    elif any(word in lower for word in ("fever", "temperature", "chills")):
        parts.append(
            "Fever or chills after surgery can signal infection. "
            "Contact your care team promptly, especially with wound changes."
        )
    elif any(word in lower for word in ("medication", "medicine", "pill", "drug")):
        parts.append(
            "Take medications exactly as prescribed at discharge. "
            "Do not start new medicines without checking with your care team."
        )
    else:
        parts.append(
            f"Regarding your question on post-op day {ctx['post_op_day']} after {ctx['procedure']}: "
            "I can share general recovery guidance, but this is not a diagnosis."
        )

    if ctx["safety_flags"]:
        parts.append(
            "Your recent check-in flagged: "
            + ", ".join(f.replace("_", " ") for f in ctx["safety_flags"])
            + "."
        )

    if chunks:
        best = chunks[0]
        parts.append(
            f"From {best.get('source', 'care guide')} ({best.get('section', 'recovery')}): "
            f"{best.get('text', '')[:240]}"
        )
    else:
        parts.append(
            "I could not find a close match in the knowledge base. "
            "Follow your surgeon's discharge instructions and contact your care team with concerns."
        )

    parts.append("This is prototype support, not a diagnosis. Seek emergency care for severe symptoms.")
    return " ".join(parts)


def chat(
    case: PostCareCase,
    message: str,
    history: list[dict[str, str]] | None = None,
    top_k: int = 4,
) -> dict[str, Any]:
    query = f"{case.patient.procedure} post-op day {case.patient.post_op_day} {message}"
    chunks = vector_store.search(query, top_k=top_k)
    sources = _format_sources(chunks)
    recovery = _recovery_snapshot(case)
    history = history or []

    if gemini.is_configured():
        rag_block = json.dumps(
            [
                {
                    "source": s["source"],
                    "section": s["section"],
                    "text": s["excerpt"],
                    "relevance": s["score"],
                }
                for s in sources
            ],
            indent=2,
        )
        system = f"""You are PostCare-RAG, a retrieval-augmented post-operative recovery assistant.

Use the patient recovery data and retrieved knowledge passages below to answer each question.
Rules:
- Answer the patient's exact question; do not repeat the same generic template every time.
- Vary wording based on what they asked and prior messages in the conversation.
- If passages are empty or irrelevant, say so and give safe general guidance.
- Do not invent medical facts. Include safety-netting for urgent symptoms.
- Keep replies concise (2-5 sentences).

Patient recovery data:
{json.dumps(recovery, indent=2)}

Retrieved knowledge:
{rag_block}"""

        turns: list[dict[str, str]] = []
        for msg in history[-8:]:
            role = msg.get("role", "user")
            content = (msg.get("content") or "").strip()
            if content and role in ("user", "assistant"):
                turns.append({"role": role, "content": content})

        if not turns or turns[-1].get("content") != message.strip():
            turns.append({"role": "user", "content": message.strip()})

        reply = gemini.generate_chat(system, turns, temperature=0.75)
        if reply:
            return {
                "reply": reply,
                "sources": sources,
                "recovery_context": recovery,
                "agent": gemini.AGENT_NAME,
            }

        logger.warning("PostCare-Gemini chat failed; using rule fallback for case %s", case.case_id)

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
    assert out["reply"] and out["sources"] is not None
    print(f"ok: agent={out['agent']}")

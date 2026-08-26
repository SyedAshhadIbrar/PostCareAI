"""Patient-facing agent — PostCare-Gemini with template fallback."""

from __future__ import annotations

import json
from typing import Any

from backend.services import postcare_gemini as gemini


def create_patient_message(triage_result: dict[str, Any], evidence: list[dict]) -> dict[str, str]:
    priority = triage_result.get("priority", "routine")

    if gemini.is_configured():
        prompt = f"""You are PostCare-Gemini patient communication agent.
Write empathetic, plain-language post-op guidance. Include safety-netting (when to seek urgent care).
Do not diagnose. Return JSON: {{"message": "...", "priority": "{priority}"}}

Triage: {json.dumps(triage_result)}
Note: detailed recovery Q&A is available in the patient Chat tab (RAG assistant)."""
        result = gemini.generate_json(prompt)
        if result and result.get("message"):
            return {
                "message": result["message"],
                "priority": result.get("priority", priority),
                "evidence_count": str(len(evidence)),
                "agent": gemini.AGENT_NAME,
            }

    if priority in ("high", "needs_review"):
        message = (
            "We noticed signals that may need clinical attention. "
            "A care team member will review your case. "
            "If pain worsens or you feel unwell, seek urgent care."
        )
    else:
        message = (
            "Your submission looks stable based on current signals. "
            "Continue your post-operative care plan and monitor for changes."
        )

    return {
        "message": message,
        "priority": priority,
        "evidence_count": str(len(evidence)),
        "agent": "PostCare-rules",
    }

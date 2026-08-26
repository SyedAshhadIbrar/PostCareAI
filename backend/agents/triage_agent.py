"""Central triage agent — PostCare-Gemini with rule-based fallback."""

from __future__ import annotations

import json
from typing import Any

from backend.schemas.case import PostCareCase
from backend.services import postcare_gemini as gemini


def _rule_triage(
    case: PostCareCase,
    evidence: list[dict],
    safety_flags: list[str],
) -> dict[str, Any]:
    priority = "routine"
    if len(safety_flags) >= 3 or (
        "high_reported_pain" in safety_flags and "visual_infection_signal" in safety_flags
    ):
        priority = "high"
    elif safety_flags:
        priority = "needs_review"

    return {
        "priority": priority,
        "reason_codes": safety_flags,
        "recommended_route": "clinician_review" if safety_flags else "patient_self_care",
        "evidence_ids": [doc.get("id") for doc in evidence if doc.get("id")],
        "case_id": case.case_id,
        "agent": "PostCare-rules",
    }


def triage_case(
    case: PostCareCase,
    evidence: list[dict],
    safety_flags: list[str],
    location_context: dict | None = None,
) -> dict[str, Any]:
    if gemini.is_configured():
        prompt = f"""You are PostCare-Gemini triage for post-operative wound monitoring.
Return JSON only with keys: priority (high|needs_review|routine), reason_codes (string array),
recommended_route (clinician_review|patient_self_care), evidence_ids (string array).

Case: {case.model_dump(mode="json")}
Safety flags: {safety_flags}
RAG evidence: {json.dumps(evidence[:3])}
Location: {json.dumps(location_context or {})}

Prioritize clinician_review when safety flags or high MedSigLIP infection/urgency scores present.
Prototype system — recommend review, not diagnosis."""
        result = gemini.generate_json(prompt)
        if result:
            result.setdefault("case_id", case.case_id)
            result.setdefault("reason_codes", safety_flags)
            result.setdefault(
                "evidence_ids",
                [doc.get("id") for doc in evidence if doc.get("id")],
            )
            result["agent"] = gemini.AGENT_NAME
            return result

    return _rule_triage(case, evidence, safety_flags)

"""Clinician handoff agent — PostCare-Gemini with structured fallback."""

from __future__ import annotations

import json
from typing import Any

from backend.schemas.case import PostCareCase
from backend.services import postcare_gemini as gemini


def _optimize_patient_note(case: PostCareCase, triage_result: dict[str, Any]) -> str | None:
    raw = (case.patient.patient_note or "").strip()
    if not raw:
        return None

    if gemini.is_configured():
        prompt = f"""You are PostCare-Gemini clinical documentation assistant.
Rewrite the patient's everyday description into concise medical natural language suitable for a surgeon's review note.
Preserve every fact the patient stated. Do not invent symptoms or findings. No definitive diagnosis.
Return JSON: {{"review_note": "1-3 sentences in professional clinical prose"}}

Patient note (lay language): {raw}
Post-op day: {case.patient.post_op_day}
Procedure: {case.patient.procedure}
Pain: {case.patient.pain_score}/10
Symptoms: {", ".join(case.patient.symptoms) or "none reported"}
Safety flags: {", ".join(case.safety_flags) or "none"}
Triage priority: {triage_result.get("priority", "routine")}"""
        result = gemini.generate_json(prompt)
        if result and result.get("review_note"):
            return str(result["review_note"]).strip()

    symptoms = ", ".join(case.patient.symptoms) or "none"
    return (
        f"On post-operative day {case.patient.post_op_day}, the patient reports: {raw}. "
        f"Pain score {case.patient.pain_score}/10; symptoms noted: {symptoms}."
    )


def create_clinician_summary(case: PostCareCase, triage_result: dict[str, Any]) -> dict[str, Any]:
    raw_note = (case.patient.patient_note or "").strip() or None
    review_note = _optimize_patient_note(case, triage_result)

    base: dict[str, Any] = {
        "case_id": case.case_id,
        "priority": triage_result.get("priority", "routine"),
        "reported_pain": case.patient.pain_score,
        "patient_note_raw": raw_note,
        "review_note": review_note,
        "visual_findings": {
            "healing_status": case.wound.healing_status.score,
            "erythema": case.wound.erythema.score,
            "edema": case.wound.edema.score,
            "infection_risk": case.wound.infection_risk.score,
            "urgency": case.wound.urgency.score,
            "exudate": case.wound.exudate.score,
        },
        "reason_codes": triage_result.get("reason_codes", []),
        "recommended_route": triage_result.get("recommended_route"),
    }

    if gemini.is_configured():
        note_block = ""
        if raw_note:
            note_block = f"\nPatient lay note: {raw_note}"
        if review_note:
            note_block += f"\nMedical review note (draft): {review_note}"

        prompt = f"""You are PostCare-Gemini clinician handoff agent.
Return JSON: {{"summary": "2-4 sentence clinical handoff for nurse/doctor review in medical natural language"}}
Include post-op day, procedure, pain, key MedSigLIP visual signals, and integrate the patient's note if provided.
No definitive diagnosis.{note_block}

Case: {case.model_dump(mode="json")}
Triage: {json.dumps(triage_result)}"""
        result = gemini.generate_json(prompt)
        if result and result.get("summary"):
            base["summary"] = result["summary"]
            base["agent"] = gemini.AGENT_NAME
            return base

    parts = [
        f"Post-op day {case.patient.post_op_day}, {case.patient.procedure}. "
        f"Reported pain {case.patient.pain_score}/10."
    ]
    if review_note:
        parts.append(review_note)
    base["summary"] = " ".join(parts)
    base["agent"] = triage_result.get("agent", "PostCare-rules")
    return base

"""Run triage → patient + clinician agents on an enriched case."""

from __future__ import annotations

from backend.agents.clinician_agent import create_clinician_summary
from backend.agents.patient_agent import create_patient_message
from backend.agents.triage_agent import triage_case
from backend.schemas.case import PostCareCase


def run_agents(case: PostCareCase) -> PostCareCase:
    triage = triage_case(
        case,
        case.evidence,
        case.safety_flags,
        case.location_context,
    )
    case.triage = triage
    case.clinician_priority = triage["priority"]
    case.patient_guidance = create_patient_message(triage, case.evidence)
    case.clinician_summary = create_clinician_summary(case, triage)
    case.status = (
        "awaiting_review"
        if triage.get("recommended_route") == "clinician_review"
        else "guidance_sent"
    )
    return case


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from backend.schemas.case import PostCareCase

    case = PostCareCase(
        case_id="PC-TEST01",
        patient={"pain_score": 9, "procedure": "appendectomy", "post_op_day": 6},
        wound={
            "healing_status": {"positive": False, "score": 0.4, "threshold": 0.5},
            "erythema": {"positive": True, "score": 0.76, "threshold": 0.5},
            "edema": {"positive": False, "score": 0.2, "threshold": 0.5},
            "infection_risk": {"positive": True, "score": 0.73, "threshold": 0.5},
            "urgency": {"positive": True, "score": 0.67, "threshold": 0.5},
            "exudate": {"positive": True, "score": 0.72, "threshold": 0.5},
        },
        safety_flags=["high_reported_pain", "visual_infection_signal", "exudate_present"],
        evidence=[{"id": "appendectomy_postop", "excerpt": "test"}],
    )
    out = run_agents(case)
    assert out.clinician_priority == "high"
    assert out.patient_guidance["message"]
    assert out.clinician_summary["case_id"] == "PC-TEST01"
    print(f"ok: priority={out.clinician_priority} status={out.status}")

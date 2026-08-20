"""Clinician dashboard API."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.database import db

router = APIRouter(prefix="/clinician", tags=["clinician"])


def _row(c) -> dict:
    return {
        "case_id": c.case_id,
        "created_at": c.created_at,
        "patient_name": c.patient.patient_name,
        "procedure": c.patient.procedure,
        "consultant_surgeon": c.patient.consultant_surgeon or "—",
        "discharge_date": c.patient.discharge_date or "—",
        "priority": c.clinician_priority or "routine",
        "status": c.status,
        "post_op_day": c.patient.post_op_day,
        "pain_score": c.patient.pain_score,
        "symptoms": c.patient.symptoms,
        "safety_flags": c.safety_flags,
    }


@router.get("/cases")
async def list_cases():
    return [_row(c) for c in db.list_cases()]


@router.get("/stats")
async def dashboard_stats():
    cases = db.list_cases()
    total = len(cases)
    
    # Pre-existing logic for PatientManagement
    discharge_patients = sum(1 for c in cases if c.status == "awaiting_review")
    on_track = sum(
        1 for c in cases if c.status in ("guidance_sent", "submitted") and (c.clinician_priority or "routine") == "routine"
    )
    completed = sum(1 for c in cases if c.status == "reviewed")
    
    # New logic for Dashboard
    active_patients = total - completed
    pending_reviews = sum(1 for c in cases if c.status == "awaiting_review" or c.clinician_priority in ["high", "needs_review"])
    urgent_escalations = sum(1 for c in cases if c.clinician_priority == "high")
    
    # Triage Distribution logic
    triage_counts = {"routine": 0, "needs_review": 0, "high": 0}
    for c in cases:
        p = c.clinician_priority or "routine"
        if p in triage_counts:
            triage_counts[p] += 1
            
    triage_distribution = {
        "routine": round((triage_counts["routine"] / total * 100)) if total else 0,
        "review": round((triage_counts["needs_review"] / total * 100)) if total else 0,
        "urgent": round((triage_counts["high"] / total * 100)) if total else 0,
    }

    return {
        # Old metrics
        "discharge_patients": discharge_patients,
        "on_track": on_track,
        "completed": completed,
        # New Dashboard metrics
        "active_patients": active_patients,
        "pending_reviews": pending_reviews,
        "urgent_escalations": urgent_escalations,
        "compliance_rate": 94.2,  # Mock value
        "triage_distribution": triage_distribution
    }


@router.get("/cases/{case_id}")
async def get_case(case_id: str):
    case = db.get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    return case.model_dump()


@router.post("/cases/{case_id}/review")
async def review_case(case_id: str):
    case = db.get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    case.status = "reviewed"
    db.update_case(case)
    return {"case_id": case_id, "status": case.status}

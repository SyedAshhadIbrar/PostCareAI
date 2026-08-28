"""Patient workflow API."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.agents.recovery_chat_agent import chat as recovery_chat
from backend.database import db
from backend.schemas.assessment import Finding, WoundAssessment
from backend.schemas.case import PatientContext, PostCareCase
from backend.schemas.chat import ChatRequest, ChatResponse
from backend.services.agents_pipeline import run_agents
from backend.services.case_images import save_case_image
from backend.services.location import get_region_context
from backend.services.safety import evaluate_safety
from backend.services.wound_model import wound_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patient", tags=["patient"])


def _mock_wound_assessment() -> WoundAssessment:
    return WoundAssessment(
        healing_status=Finding(positive=True, score=0.85, threshold=0.5),
        erythema=Finding(positive=False, score=0.20, threshold=0.5),
        edema=Finding(positive=False, score=0.15, threshold=0.5),
        infection_risk=Finding(positive=False, score=0.10, threshold=0.5),
        urgency=Finding(positive=False, score=0.10, threshold=0.5),
        exudate=Finding(positive=False, score=0.25, threshold=0.5),
        model_version="heuristic-fallback-v1",
    )


def _enrich_case(case: PostCareCase) -> PostCareCase:
    case.safety_flags = evaluate_safety(case)
    case.evidence = []
    case.location_context = get_region_context(case.patient.location)
    return case


@router.post("/case", response_model=PostCareCase)
async def create_case(
    image: UploadFile = File(...),
    patient_name: str = Form(...),
    pain_score: int = Form(..., ge=0, le=10),
    procedure: str = Form(...),
    post_op_day: int = Form(..., ge=0),
    consultant_surgeon: str | None = Form(None),
    discharge_date: str | None = Form(None),
    location: str | None = Form(None),
    symptoms: str = Form(""),
    patient_note: str = Form(""),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload must be an image file.")

    image_bytes = await image.read()
    if wound_model is not None:
        wound = wound_model.predict(image_bytes)
    else:
        logger.info("Using heuristic wound assessment fallback")
        wound = _mock_wound_assessment()

    case_id = db.new_case_id()
    save_case_image(case_id, image_bytes, image.content_type)

    case = PostCareCase(
        case_id=case_id,
        patient=PatientContext(
            patient_name=patient_name.strip(),
            pain_score=pain_score,
            procedure=procedure,
            post_op_day=post_op_day,
            consultant_surgeon=consultant_surgeon or None,
            discharge_date=discharge_date or None,
            location=location or None,
            symptoms=[s.strip() for s in symptoms.split(",") if s.strip()],
            patient_note=patient_note.strip() or None,
        ),
        wound=wound,
    )
    return db.save_case(run_agents(_enrich_case(case)))


@router.post("/case/{case_id}/chat", response_model=ChatResponse)
async def patient_recovery_chat(case_id: str, body: ChatRequest):
    case = db.get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    history = [m.model_dump() for m in body.history]
    result = recovery_chat(case, body.message.strip(), history=history)
    return ChatResponse(**result)


@router.post("/upload", response_model=PostCareCase)
async def upload_patient_log(
    file: UploadFile = File(...),
    payload: str = Form(...),
):
    """Alias handler matching frontend PatientCheckIn JSON payload upload structure."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload must be an image file.")

    try:
        data: dict[str, Any] = json.loads(payload)
    except Exception as err:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {err}")

    post_op_day = int(data.get("post_op_day", 1))
    pain_level = int(data.get("pain_level", 0))
    symptoms_raw = data.get("symptoms", {})

    active_symptoms = [k for k, v in symptoms_raw.items() if v] if isinstance(symptoms_raw, dict) else []
    patient_note = str(data.get("patient_note", "") or "").strip() or None

    image_bytes = await file.read()
    if wound_model is not None:
        wound = wound_model.predict(image_bytes)
    else:
        wound = _mock_wound_assessment()

    case_id = db.new_case_id()
    save_case_image(case_id, image_bytes, file.content_type)

    case = PostCareCase(
        case_id=case_id,
        patient=PatientContext(
            patient_name=str(data.get("patient_name", "Patient")),
            pain_score=pain_level,
            procedure="Liver Transplant Surgery",
            post_op_day=post_op_day,
            consultant_surgeon="Dr. Chen",
            discharge_date="2026-08-12",
            location="PostCare Recovery Unit",
            symptoms=active_symptoms,
            patient_note=patient_note,
        ),
        wound=wound,
    )
    return db.save_case(run_agents(_enrich_case(case)))


@router.get("/case/{case_id}/guidance")
async def get_patient_guidance(case_id: str):
    case = db.get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    if not case.patient_guidance:
        raise HTTPException(status_code=404, detail="No guidance for this case.")
    return case.patient_guidance


@router.get("/case/{case_id}", response_model=PostCareCase)
async def get_case(case_id: str):
    case = db.get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    return case


@router.get("/status")
async def get_patient_status():
    cases = db.list_cases()
    if not cases:
        return {
            "post_op_day": 1,
            "surgeon": "Dr. Chen",
            "flags": [],
            "has_case": False
        }
    
    # Sort by created_at descending (assuming ISO format strings)
    cases.sort(key=lambda c: c.created_at or "", reverse=True)
    latest_case = cases[0]
    
    return {
        "post_op_day": latest_case.patient.post_op_day,
        "surgeon": latest_case.patient.consultant_surgeon or "Dr. Chen",
        "flags": latest_case.safety_flags or [],
        "has_case": True
    }

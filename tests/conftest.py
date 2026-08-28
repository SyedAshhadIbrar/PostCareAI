"""Shared pytest fixtures for PostCareAI."""

from __future__ import annotations

import io
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.schemas.assessment import Finding, WoundAssessment
from backend.schemas.case import PatientContext, PostCareCase


LABEL_NAMES = (
    "healing_status",
    "erythema",
    "edema",
    "infection_risk",
    "urgency",
    "exudate",
)


def make_finding(positive: bool = False, score: float = 0.3, threshold: float = 0.5) -> Finding:
    return Finding(positive=positive, score=score, threshold=threshold)


def make_wound_assessment(**overrides: Any) -> WoundAssessment:
    defaults = {name: make_finding() for name in LABEL_NAMES}
    for key, value in overrides.items():
        if isinstance(value, dict):
            defaults[key] = Finding(**value)
        elif isinstance(value, Finding):
            defaults[key] = value
    return WoundAssessment(**defaults, model_version="test-medsiglip-v1")


def make_case(
    *,
    case_id: str = "PC-TEST01",
    pain_score: int = 3,
    post_op_day: int = 5,
    wound: WoundAssessment | None = None,
) -> PostCareCase:
    return PostCareCase(
        case_id=case_id,
        patient=PatientContext(
            patient_name="Test Patient",
            pain_score=pain_score,
            procedure="appendectomy",
            post_op_day=post_op_day,
            symptoms=["redness"],
        ),
        wound=wound or make_wound_assessment(),
    )


@pytest.fixture
def sample_image_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (128, 128), color=(210, 120, 110)).save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def mock_wound_model(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    """Provide a loaded wound model that returns a valid assessment."""
    mock = MagicMock()
    mock.predict.return_value = make_wound_assessment(
        infection_risk={"positive": True, "score": 0.72, "threshold": 0.58},
        urgency={"positive": False, "score": 0.31, "threshold": 0.61},
    )
    monkeypatch.setattr("backend.routes.wound.wound_model", mock)
    return mock


@pytest.fixture
def client(mock_wound_model: MagicMock) -> TestClient:
    from backend.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def rule_triage_only(monkeypatch: pytest.MonkeyPatch) -> None:
    """Force triage agent down the deterministic rule path."""
    monkeypatch.setattr("backend.agents.triage_agent.gemini.is_configured", lambda: False)

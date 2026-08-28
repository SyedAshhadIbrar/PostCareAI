"""Shared pytest fixtures for PostCareAI."""

from __future__ import annotations

# Block MedSigLIP weight load before any backend route imports wound_model.
import os

os.environ["POSTCARE_SKIP_MODEL_LOAD"] = "1"

import json
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

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

MINIMAL_PNG = bytes(
    [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ]
)


def make_finding(positive: bool = False, score: float = 0.3, threshold: float = 0.5) -> Finding:
    return Finding(positive=positive, score=score, threshold=threshold)


def make_wound_assessment(**overrides: Any) -> WoundAssessment:
    defaults = {name: make_finding() for name in LABEL_NAMES}
    defaults["model_version"] = "test-mock-v1"
    for key, value in overrides.items():
        if isinstance(value, dict) and key in LABEL_NAMES:
            defaults[key] = Finding(**value)
        else:
            defaults[key] = value
    return WoundAssessment(**defaults)


def make_case(**overrides: Any) -> PostCareCase:
    base = PostCareCase(
        case_id="PC-TEST01",
        patient=PatientContext(
            patient_name="Test Patient",
            pain_score=3,
            procedure="appendectomy",
            post_op_day=5,
        ),
        wound=make_wound_assessment(),
    )
    data = base.model_dump()
    data.update(overrides)
    if "patient" in overrides and isinstance(overrides["patient"], dict):
        data["patient"] = {**base.patient.model_dump(), **overrides["patient"]}
    if "wound" in overrides and isinstance(overrides["wound"], dict):
        wound_data = base.wound.model_dump()
        for k, v in overrides["wound"].items():
            if isinstance(v, dict) and k in LABEL_NAMES:
                wound_data[k] = {**wound_data[k], **v}
            else:
                wound_data[k] = v
        data["wound"] = wound_data
    return PostCareCase.model_validate(data)


def png_upload_file() -> tuple[str, bytes, str]:
    return ("test_wound.png", MINIMAL_PNG, "image/png")


def _default_mock_wound_model() -> MagicMock:
    mock = MagicMock()
    mock.model_version = "test-mock-v1"
    mock.predict.return_value = make_wound_assessment(
        infection_risk={"positive": True, "score": 0.72, "threshold": 0.5},
    )
    return mock


def _patch_route_wound_models(mock: MagicMock | None) -> None:
    import backend.routes.patient as patient_route
    import backend.routes.wound as wound_route

    wound_route.wound_model = mock
    patient_route.wound_model = mock


@pytest.fixture(scope="session")
def test_app(tmp_path_factory):
    """Single FastAPI app for the session — no MedSigLIP load, isolated DB."""
    root = tmp_path_factory.mktemp("postcare_pytest")
    db_path = root / "postcare_test.db"
    upload_dir = root / "uploads"
    upload_dir.mkdir(exist_ok=True)

    from backend.database import db
    from backend.services import case_images, vector_store

    db.DB_PATH = db_path
    case_images.UPLOAD_DIR = upload_dir
    vector_store.vector_store.load_or_build = lambda: 0

    mock = _default_mock_wound_model()
    _patch_route_wound_models(mock)

    from backend.main import app

    return app


@pytest.fixture(scope="session")
def session_mock_wound_model(test_app):
    """Session mock wired into route modules after app import."""
    import backend.routes.wound as wound_route

    assert wound_route.wound_model is not None
    return wound_route.wound_model


@pytest.fixture
def mock_wound_model(session_mock_wound_model):
    """Reset call counts and restore default predict payload per test."""
    session_mock_wound_model.reset_mock()
    session_mock_wound_model.predict.return_value = make_wound_assessment(
        infection_risk={"positive": True, "score": 0.72, "threshold": 0.5},
    )
    _patch_route_wound_models(session_mock_wound_model)
    return session_mock_wound_model


@pytest.fixture
def client(test_app):
    """Per-test TestClient; reuses session app without reloading weights."""
    with TestClient(test_app, raise_server_exceptions=True) as test_client:
        yield test_client


@pytest.fixture
def sample_case_in_db(client, mock_wound_model):
    """Create a case via upload API and return case payload."""
    payload = json.dumps(
        {
            "post_op_day": 4,
            "pain_level": 5,
            "symptoms": {"redness": True},
            "patient_name": "Pytest Patient",
        }
    )
    res = client.post(
        "/api/patients/upload",
        files={"file": png_upload_file()},
        data={"payload": payload},
    )
    assert res.status_code == 200, res.text
    return res.json()

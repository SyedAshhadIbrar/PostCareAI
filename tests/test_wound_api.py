"""Tests for POST /wound/assess."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.schemas.assessment import WoundAssessment
from tests.conftest import make_wound_assessment


def test_wound_assess_returns_valid_schema(client: TestClient, sample_image_bytes: bytes) -> None:
    response = client.post(
        "/wound/assess",
        files={"image": ("wound.png", sample_image_bytes, "image/png")},
    )

    assert response.status_code == 200
    data = response.json()

    parsed = WoundAssessment.model_validate(data)
    assert parsed.model_version == "test-medsiglip-v1"

    for label in (
        "healing_status",
        "erythema",
        "edema",
        "infection_risk",
        "urgency",
        "exudate",
    ):
        finding = getattr(parsed, label)
        assert 0.0 <= finding.score <= 1.0
        assert 0.0 <= finding.threshold <= 1.0
        assert isinstance(finding.positive, bool)


def test_wound_assess_rejects_non_image(client: TestClient) -> None:
    response = client.post(
        "/wound/assess",
        files={"image": ("notes.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 400
    assert "image" in response.json()["detail"].lower()


def test_wound_assess_returns_503_when_model_unloaded(
    monkeypatch: pytest.MonkeyPatch,
    sample_image_bytes: bytes,
) -> None:
    monkeypatch.setattr("backend.routes.wound.wound_model", None)

    from backend.main import app

    with TestClient(app) as client:
        response = client.post(
            "/wound/assess",
            files={"image": ("wound.png", sample_image_bytes, "image/png")},
        )

    assert response.status_code == 503
    assert "MedSigLIP" in response.json()["detail"]


def test_wound_assess_calls_model_predict(
    client: TestClient,
    mock_wound_model: MagicMock,
    sample_image_bytes: bytes,
) -> None:
    client.post(
        "/wound/assess",
        files={"image": ("wound.png", sample_image_bytes, "image/png")},
    )

    mock_wound_model.predict.assert_called_once()
    image_arg = mock_wound_model.predict.call_args.args[0]
    assert isinstance(image_arg, bytes)
    assert len(image_arg) > 0

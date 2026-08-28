"""Wound assessment API."""

from unittest.mock import MagicMock

import pytest

from tests.conftest import make_wound_assessment, png_upload_file


def test_wound_assess_returns_valid_schema(client, mock_wound_model):
    files = {"image": png_upload_file()}
    res = client.post("/wound/assess", files=files)
    assert res.status_code == 200
    body = res.json()
    for label in (
        "healing_status",
        "erythema",
        "edema",
        "infection_risk",
        "urgency",
        "exudate",
    ):
        assert label in body
        assert "score" in body[label]
        assert "positive" in body[label]
    mock_wound_model.predict.assert_called_once()


def test_wound_assess_rejects_non_image(client, mock_wound_model):
    files = {"image": ("notes.txt", b"not an image", "text/plain")}
    res = client.post("/wound/assess", files=files)
    assert res.status_code == 400
    mock_wound_model.predict.assert_not_called()


def test_wound_assess_returns_503_when_model_unloaded(client, monkeypatch):
    monkeypatch.setattr("backend.routes.wound.wound_model", None)
    files = {"image": png_upload_file()}
    res = client.post("/wound/assess", files=files)
    assert res.status_code == 503


def test_wound_assess_calls_model_predict(client, mock_wound_model):
    assessment = make_wound_assessment(
        healing_status={"positive": True, "score": 0.9, "threshold": 0.5},
    )
    mock_wound_model.predict.return_value = assessment
    files = {"image": png_upload_file()}
    res = client.post("/wound/assess", files=files)
    assert res.status_code == 200
    assert res.json()["healing_status"]["positive"] is True

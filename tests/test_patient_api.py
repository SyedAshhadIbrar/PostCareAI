"""Patient upload and recovery chat API."""

import json
from unittest.mock import patch

from tests.conftest import png_upload_file


def test_patient_upload_creates_case(client, mock_wound_model):
    payload = json.dumps(
        {
            "post_op_day": 3,
            "pain_level": 4,
            "symptoms": {"redness": True},
            "patient_name": "Upload Test",
        }
    )
    res = client.post(
        "/api/patients/upload",
        files={"file": png_upload_file()},
        data={"payload": payload},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["case_id"].startswith("PC-")
    assert body["patient"]["patient_name"] == "Upload Test"
    assert body["wound"]["infection_risk"]["positive"] is True
    mock_wound_model.predict.assert_called_once()


def test_patient_upload_rejects_non_image(client, mock_wound_model):
    payload = json.dumps({"post_op_day": 1, "pain_level": 0, "symptoms": {}})
    res = client.post(
        "/api/patients/upload",
        files={"file": ("bad.txt", b"text", "text/plain")},
        data={"payload": payload},
    )
    assert res.status_code == 400


def test_patient_chat_returns_reply_shape(client, sample_case_in_db):
    case_id = sample_case_in_db["case_id"]
    with patch("backend.agents.recovery_chat_agent.gemini.is_configured", return_value=False):
        res = client.post(
            f"/patient/case/{case_id}/chat",
            json={"message": "When can I shower?", "history": []},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["reply"]
    assert "sources" in body
    assert body["agent"] in ("PostCare-RAG", "PostCare-Gemini")


def test_patient_chat_unknown_case(client):
    res = client.post(
        "/patient/case/PC-NOPE99/chat",
        json={"message": "Hello", "history": []},
    )
    assert res.status_code == 404

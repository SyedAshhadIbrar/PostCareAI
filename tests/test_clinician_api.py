"""Clinician queue and review API."""

from tests.conftest import png_upload_file
import json


def _upload_case(client) -> str:
    payload = json.dumps(
        {"post_op_day": 2, "pain_level": 3, "symptoms": {}, "patient_name": "Clinician Test"}
    )
    res = client.post(
        "/api/patients/upload",
        files={"file": png_upload_file()},
        data={"payload": payload},
    )
    assert res.status_code == 200
    return res.json()["case_id"]


def test_clinician_list_cases(client):
    case_id = _upload_case(client)
    res = client.get("/clinician/cases")
    assert res.status_code == 200
    rows = res.json()
    assert isinstance(rows, list)
    assert any(r["case_id"] == case_id for r in rows)


def test_clinician_get_case_includes_image_metadata(client):
    case_id = _upload_case(client)
    res = client.get(f"/clinician/cases/{case_id}")
    assert res.status_code == 200
    body = res.json()
    assert body["has_wound_image"] is True
    assert body["wound_image_url"] == f"/clinician/cases/{case_id}/image"


def test_clinician_case_image_endpoint(client):
    case_id = _upload_case(client)
    res = client.get(f"/clinician/cases/{case_id}/image")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/")


def test_clinician_review_moves_case_to_reviewed(client):
    case_id = _upload_case(client)
    res = client.post(f"/clinician/cases/{case_id}/review")
    assert res.status_code == 200
    assert res.json()["status"] == "reviewed"

    detail = client.get(f"/clinician/cases/{case_id}").json()
    assert detail["status"] == "reviewed"

    rows = client.get("/clinician/cases").json()
    reviewed = [r for r in rows if r["case_id"] == case_id][0]
    assert reviewed["status"] == "reviewed"
    assert rows[-1]["case_id"] == case_id


def test_clinician_stats(client):
    res = client.get("/clinician/stats")
    assert res.status_code == 200
    body = res.json()
    assert "pending_reviews" in body
    assert "completed" in body


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "rag" in body

import json
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:8000"
IMG = Path(__file__).resolve().parents[1] / "test_wound.png"


def multipart_upload():
    img = IMG.read_bytes()
    boundary = "----postcaretest"
    payload = json.dumps(
        {
            "post_op_day": 3,
            "pain_level": 4,
            "symptoms": {"redness": True},
            "patient_name": "UI Test",
        }
    )
    body = b"".join(
        [
            f'--{boundary}\r\nContent-Disposition: form-data; name="payload"\r\n\r\n{payload}\r\n'.encode(),
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test_wound.png"\r\nContent-Type: image/png\r\n\r\n'.encode()
            + img
            + b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    req = urllib.request.Request(
        f"{BASE}/api/patients/upload",
        data=body,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    return json.load(urllib.request.urlopen(req))


def chat(case_id: str):
    body = json.dumps({"message": "Is redness normal on day 3?", "history": []}).encode()
    req = urllib.request.Request(
        f"{BASE}/patient/case/{case_id}/chat",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(req))


def main():
    health = json.load(urllib.request.urlopen(f"{BASE}/health"))
    print("HEALTH", health["status"], "model=", health["model_loaded"], "rag_chunks=", health["rag"]["chunks_indexed"])

    case = multipart_upload()
    print("UPLOAD", case["case_id"], "healing", round(case["wound"]["healing_status"]["score"] * 100), "%")

    reply = chat(case["case_id"])
    print("CHAT", reply.get("agent"), "sources=", len(reply.get("sources") or []))
    print("REPLY", (reply.get("reply") or "")[:220])


if __name__ == "__main__":
    main()

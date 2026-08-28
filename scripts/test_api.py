import json
import urllib.request

BASE = "http://127.0.0.1:8000"

# Minimal valid 1x1 PNG (no external test_wound.png required)
_MINIMAL_PNG = bytes(
    [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ]
)


def multipart_upload():
    img = _MINIMAL_PNG
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

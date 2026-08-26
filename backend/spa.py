from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse, RedirectResponse

REACT_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"


def react_dist_ready() -> bool:
    return (REACT_DIST / "index.html").is_file()


def _is_api_get_path(path: str) -> bool:
    if path in {"/health", "/docs", "/redoc", "/openapi.json"}:
        return True
    if path.startswith("/api/") or path.startswith("/wound/"):
        return True
    if path == "/patient/status" or path.startswith("/patient/case/"):
        return True
    if path in {"/clinician/cases", "/clinician/stats"} or path.startswith("/clinician/cases/"):
        return True
    if path.startswith("/ui/"):
        return True
    return False


def serve_react(full_path: str = ""):
    if not react_dist_ready():
        return RedirectResponse(url="/ui/patient/")

    path = f"/{full_path}" if full_path else "/"
    if _is_api_get_path(path):
        raise HTTPException(status_code=404)

    file_path = REACT_DIST / full_path if full_path else REACT_DIST / "index.html"
    if full_path and file_path.is_file():
        return FileResponse(file_path)
    return FileResponse(REACT_DIST / "index.html")

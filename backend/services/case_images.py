"""Persist wound photos uploaded with patient check-ins."""

from __future__ import annotations

from pathlib import Path

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "data" / "uploads"


def _extension(content_type: str | None) -> str:
    if not content_type:
        return ".jpg"
    if "png" in content_type:
        return ".png"
    if "webp" in content_type:
        return ".webp"
    return ".jpg"


def save_case_image(case_id: str, data: bytes, content_type: str | None = None) -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    path = UPLOAD_DIR / f"{case_id}{_extension(content_type)}"
    path.write_bytes(data)
    return path


def case_image_path(case_id: str) -> Path | None:
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        path = UPLOAD_DIR / f"{case_id}{ext}"
        if path.is_file():
            return path
    return None


def case_has_image(case_id: str) -> bool:
    return case_image_path(case_id) is not None

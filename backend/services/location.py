"""Location-aware care context (Phase 3+)."""

from __future__ import annotations


def get_region_context(location: str | None = None) -> dict:
    """MVP stub — returns minimal context until geocoding is integrated."""
    if not location:
        return {"region": None, "care_options": []}
    return {"region": location, "care_options": []}

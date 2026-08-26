"""Structured MedSigLIP wound assessment output."""

from pydantic import BaseModel, Field


class Finding(BaseModel):
    positive: bool
    score: float = Field(ge=0.0, le=1.0)
    threshold: float = Field(ge=0.0, le=1.0)


class WoundAssessment(BaseModel):
    healing_status: Finding
    erythema: Finding
    edema: Finding
    infection_risk: Finding
    urgency: Finding
    exudate: Finding
    model_version: str | None = None

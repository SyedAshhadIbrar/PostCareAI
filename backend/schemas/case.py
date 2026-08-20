"""Complete patient case combining vision assessment and context."""

from pydantic import BaseModel, Field

from backend.schemas.assessment import WoundAssessment


class PatientContext(BaseModel):
    patient_name: str = "Anonymous Patient"
    pain_score: int = Field(ge=0, le=10)
    procedure: str
    post_op_day: int = Field(ge=0)
    consultant_surgeon: str | None = None
    discharge_date: str | None = None
    location: str | None = None
    symptoms: list[str] = Field(default_factory=list)
    patient_note: str | None = None


class PostCareCase(BaseModel):
    case_id: str
    patient: PatientContext
    wound: WoundAssessment
    created_at: str | None = None
    status: str = "submitted"
    clinician_priority: str | None = None
    safety_flags: list[str] = Field(default_factory=list)
    evidence: list[dict] = Field(default_factory=list)
    location_context: dict = Field(default_factory=dict)
    triage: dict = Field(default_factory=dict)
    patient_guidance: dict = Field(default_factory=dict)
    clinician_summary: dict = Field(default_factory=dict)

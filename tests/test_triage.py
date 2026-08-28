"""Tests for triage agent priority levels (rule-based path)."""

from __future__ import annotations

import pytest

from backend.agents.triage_agent import triage_case
from tests.conftest import make_case, make_wound_assessment


@pytest.mark.usefixtures("rule_triage_only")
def test_triage_routine_when_no_safety_flags() -> None:
    case = make_case()
    result = triage_case(case, evidence=[], safety_flags=[])

    assert result["priority"] == "routine"
    assert result["recommended_route"] == "patient_self_care"
    assert result["agent"] == "PostCare-rules"


@pytest.mark.usefixtures("rule_triage_only")
def test_triage_needs_review_for_single_flag() -> None:
    case = make_case()
    flags = ["visual_infection_signal"]
    result = triage_case(case, evidence=[], safety_flags=flags)

    assert result["priority"] == "needs_review"
    assert result["recommended_route"] == "clinician_review"
    assert result["reason_codes"] == flags


@pytest.mark.usefixtures("rule_triage_only")
def test_triage_high_for_three_or_more_flags() -> None:
    case = make_case()
    flags = [
        "high_reported_pain",
        "visual_infection_signal",
        "exudate_present",
    ]
    result = triage_case(case, evidence=[], safety_flags=flags)

    assert result["priority"] == "high"
    assert result["recommended_route"] == "clinician_review"


@pytest.mark.usefixtures("rule_triage_only")
def test_triage_high_for_pain_plus_infection_combo() -> None:
    wound = make_wound_assessment(
        infection_risk={"positive": True, "score": 0.9, "threshold": 0.58},
    )
    case = make_case(pain_score=9, wound=wound)
    flags = ["high_reported_pain", "visual_infection_signal"]
    result = triage_case(case, evidence=[], safety_flags=flags)

    assert result["priority"] == "high"

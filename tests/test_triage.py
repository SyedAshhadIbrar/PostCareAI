"""Triage agent priority logic."""

from unittest.mock import patch

from tests.conftest import make_case
from backend.agents.triage_agent import triage_case


def test_triage_routine_when_no_flags():
    case = make_case()
    with patch("backend.agents.triage_agent.gemini.is_configured", return_value=False):
        result = triage_case(case, evidence=[], safety_flags=[])
    assert result["priority"] == "routine"
    assert result["recommended_route"] == "patient_self_care"
    assert result["agent"] == "PostCare-rules"


def test_triage_needs_review_with_single_flag():
    case = make_case()
    flags = ["visual_infection_signal"]
    with patch("backend.agents.triage_agent.gemini.is_configured", return_value=False):
        result = triage_case(case, evidence=[], safety_flags=flags)
    assert result["priority"] == "needs_review"
    assert result["recommended_route"] == "clinician_review"


def test_triage_high_with_many_flags():
    case = make_case()
    flags = ["high_reported_pain", "visual_infection_signal", "exudate_present"]
    with patch("backend.agents.triage_agent.gemini.is_configured", return_value=False):
        result = triage_case(case, evidence=[], safety_flags=flags)
    assert result["priority"] == "high"


def test_triage_high_pain_plus_infection():
    case = make_case()
    flags = ["high_reported_pain", "visual_infection_signal"]
    with patch("backend.agents.triage_agent.gemini.is_configured", return_value=False):
        result = triage_case(case, evidence=[], safety_flags=flags)
    assert result["priority"] == "high"

"""Tests for deterministic safety flag evaluation."""

from __future__ import annotations

from backend.services.safety import evaluate_safety
from tests.conftest import make_case, make_wound_assessment


def test_high_pain_triggers_flag() -> None:
    case = make_case(pain_score=9)
    flags = evaluate_safety(case)

    assert "high_reported_pain" in flags


def test_extended_post_op_window_triggers_flag() -> None:
    case = make_case(post_op_day=14)
    flags = evaluate_safety(case)

    assert "extended_post_op_window" in flags


def test_visual_infection_signal_triggers_flag() -> None:
    wound = make_wound_assessment(
        infection_risk={"positive": True, "score": 0.81, "threshold": 0.58},
    )
    case = make_case(wound=wound)
    flags = evaluate_safety(case)

    assert "visual_infection_signal" in flags


def test_bad_inputs_trigger_multiple_flags() -> None:
    wound = make_wound_assessment(
        infection_risk={"positive": True, "score": 0.88, "threshold": 0.58},
        urgency={"positive": True, "score": 0.77, "threshold": 0.61},
        exudate={"positive": True, "score": 0.66, "threshold": 0.42},
    )
    case = make_case(pain_score=10, post_op_day=20, wound=wound)
    flags = evaluate_safety(case)

    assert "high_reported_pain" in flags
    assert "extended_post_op_window" in flags
    assert "visual_infection_signal" in flags
    assert "elevated_urgency_signal" in flags
    assert "exudate_present" in flags
    assert len(flags) == 5


def test_stable_case_has_no_safety_flags() -> None:
    case = make_case(pain_score=2, post_op_day=3)
    flags = evaluate_safety(case)

    assert flags == []

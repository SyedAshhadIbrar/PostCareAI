"""Safety flag evaluation rules."""

from tests.conftest import make_case
from backend.services.safety import evaluate_safety, HIGH_PAIN_THRESHOLD, POST_OP_ESCALATION_DAY


def test_no_flags_on_mild_case():
    case = make_case()
    assert evaluate_safety(case) == []


def test_high_pain_flag():
    case = make_case(patient={"pain_score": HIGH_PAIN_THRESHOLD})
    assert "high_reported_pain" in evaluate_safety(case)


def test_extended_post_op_flag():
    case = make_case(patient={"post_op_day": POST_OP_ESCALATION_DAY})
    assert "extended_post_op_window" in evaluate_safety(case)


def test_visual_infection_flag():
    case = make_case(wound={"infection_risk": {"positive": True, "score": 0.8, "threshold": 0.5}})
    flags = evaluate_safety(case)
    assert "visual_infection_signal" in flags


def test_urgency_and_exudate_flags():
    case = make_case(
        wound={
            "urgency": {"positive": True, "score": 0.7, "threshold": 0.5},
            "exudate": {"positive": True, "score": 0.6, "threshold": 0.5},
        }
    )
    flags = evaluate_safety(case)
    assert "elevated_urgency_signal" in flags
    assert "exudate_present" in flags

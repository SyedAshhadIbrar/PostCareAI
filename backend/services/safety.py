"""Deterministic safety flags before agent reasoning."""

from __future__ import annotations

from backend.schemas.case import PostCareCase

# Prototype thresholds — replace with values from your clinical guidance sources.
HIGH_PAIN_THRESHOLD = 8
POST_OP_ESCALATION_DAY = 14


def evaluate_safety(case: PostCareCase) -> list[str]:
    flags: list[str] = []

    if case.patient.pain_score >= HIGH_PAIN_THRESHOLD:
        flags.append("high_reported_pain")

    if case.patient.post_op_day >= POST_OP_ESCALATION_DAY:
        flags.append("extended_post_op_window")

    if case.wound.infection_risk.positive:
        flags.append("visual_infection_signal")

    if case.wound.urgency.positive:
        flags.append("elevated_urgency_signal")

    if case.wound.exudate.positive:
        flags.append("exudate_present")

    return flags

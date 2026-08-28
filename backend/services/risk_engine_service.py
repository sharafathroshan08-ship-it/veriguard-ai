from typing import Any


SEVERITY_POINTS = {
    "low": 5,
    "medium": 10,
    "high": 20,
    "critical": 30,
}


def calculate_field_risk(
    field_issues: list[dict[str, Any]],
) -> int:
    score = 0

    for issue in field_issues:
        severity = str(
            issue.get("severity", "low")
        ).lower()

        score += SEVERITY_POINTS.get(
            severity,
            5,
        )

    return min(score, 40)


def calculate_visual_risk(
    visual_analysis: dict[str, Any] | None,
) -> int:
    if not visual_analysis:
        return 0

    score = visual_analysis.get(
        "visual_risk_score",
        0,
    )

    try:
        return min(
            max(int(score), 0),
            40,
        )
    except (TypeError, ValueError):
        return 0


def calculate_content_risk(
    content_analysis: dict[str, Any],
) -> int:
    score = content_analysis.get(
        "risk_score",
        0,
    )

    try:
        return min(
            max(int(score), 0),
            30,
        )
    except (TypeError, ValueError):
        return 0


def calculate_gemini_risk(
    gemini_analysis: dict[str, Any] | None,
) -> int:
    if not gemini_analysis:
        return 0

    if not gemini_analysis.get(
        "available",
        False,
    ):
        return 0

    score = gemini_analysis.get(
        "risk_signal",
        0,
    )

    try:
        return min(
            max(int(score), 0),
            30,
        )
    except (TypeError, ValueError):
        return 0


def calculate_risk_score(
    content_risk: int,
    field_risk: int,
    visual_risk: int,
    gemini_risk: int,
) -> int:
    """
    Combine the available verification signals.

    The result is a risk-screening score, not a probability
    that the document is fraudulent.
    """

    score = (
        content_risk
        + field_risk
        + visual_risk
        + gemini_risk
    )

    return min(
        max(score, 0),
        100,
    )


def get_risk_level(
    risk_score: int,
) -> str:

    if risk_score <= 20:
        return "low"

    if risk_score <= 50:
        return "medium"

    if risk_score <= 80:
        return "high"

    return "critical"


def get_decision(
    risk_level: str,
) -> str:

    decisions = {
        "low": "accepted_with_automated_checks",
        "medium": "review_recommended",
        "high": "manual_verification_required",
        "critical": "high_priority_manual_verification",
    }

    return decisions.get(
        risk_level,
        "review_recommended",
    )


def calculate_confidence(
    content_analysis: dict[str, Any],
    extracted_fields: dict[str, Any],
    visual_analysis: dict[str, Any] | None,
    gemini_analysis: dict[str, Any] | None,
) -> int:

    confidence = 0

    if content_analysis.get(
        "document_type"
    ) != "unknown":
        confidence += 20

    extracted_text = str(
        content_analysis.get(
            "extracted_text",
            "",
        )
    ).strip()

    if len(extracted_text) > 30:
        confidence += 20

    field_count = len(
        extracted_fields
    )

    if field_count >= 4:
        confidence += 25
    elif field_count >= 2:
        confidence += 15
    elif field_count >= 1:
        confidence += 8

    if visual_analysis is not None:
        confidence += 15

    if (
        gemini_analysis
        and gemini_analysis.get(
            "available",
            False,
        )
    ):
        confidence += 20

    return min(
        confidence,
        100,
    )


def build_reasons(
    field_issues: list[dict[str, Any]],
    visual_analysis: dict[str, Any] | None,
    content_analysis: dict[str, Any],
    gemini_analysis: dict[str, Any] | None,
) -> list[str]:

    reasons: list[str] = []

    for issue in field_issues:
        title = issue.get("title")

        if title:
            reasons.append(
                str(title)
            )

    if visual_analysis:

        for issue in visual_analysis.get(
            "issues",
            [],
        ):

            title = issue.get(
                "title"
            )

            if title:
                reasons.append(
                    str(title)
                )

    for issue in content_analysis.get(
        "issues",
        [],
    ):

        title = issue.get(
            "title"
        )

        if title:
            reasons.append(
                str(title)
            )

    if gemini_analysis:

        for indicator in gemini_analysis.get(
            "indicators",
            [],
        ):

            title = indicator.get(
                "title"
            )

            if title:
                reasons.append(
                    f"Gemini AI: {title}"
                )

    return list(
        dict.fromkeys(
            reasons
        )
    )


def build_risk_result(
    content_analysis: dict[str, Any],
    extracted_fields: dict[str, Any],
    field_issues: list[dict[str, Any]],
    visual_analysis: dict[str, Any] | None,
    gemini_analysis: dict[str, Any] | None = None,
) -> dict[str, Any]:

    content_risk = calculate_content_risk(
        content_analysis
    )

    field_risk = calculate_field_risk(
        field_issues
    )

    visual_risk = calculate_visual_risk(
        visual_analysis
    )

    gemini_risk = calculate_gemini_risk(
        gemini_analysis
    )

    risk_score = calculate_risk_score(
        content_risk,
        field_risk,
        visual_risk,
        gemini_risk,
    )

    risk_level = get_risk_level(
        risk_score
    )

    decision = get_decision(
        risk_level
    )

    confidence = calculate_confidence(
        content_analysis,
        extracted_fields,
        visual_analysis,
        gemini_analysis,
    )

    reasons = build_reasons(
        field_issues,
        visual_analysis,
        content_analysis,
        gemini_analysis,
    )

    if risk_level == "low":

        recommendation = (
            "The document passed the current automated "
            "screening checks. Continue with normal "
            "verification procedures."
        )

    elif risk_level == "medium":

        recommendation = (
            "Some verification indicators were detected. "
            "Manual review is recommended before acceptance."
        )

    elif risk_level == "high":

        recommendation = (
            "Multiple risk indicators were detected. "
            "Manual verification is required before acceptance."
        )

    else:

        recommendation = (
            "A high concentration of risk indicators was detected. "
            "Treat the document as requiring urgent manual review."
        )

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "decision": decision,
        "confidence": confidence,
        "content_risk_score": content_risk,
        "field_risk_score": field_risk,
        "visual_risk_score": visual_risk,
        "gemini_risk_score": gemini_risk,
        "reasons": reasons,
        "recommendation": recommendation,
    }
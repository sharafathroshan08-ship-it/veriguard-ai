def build_fraud_evidence(
    field_issues: list[dict],
    visual_analysis: dict | None,
    content_issues: list[dict],
) -> list[dict]:
    """
    Convert verification findings into
    structured evidence for the UI.
    """

    evidence = []

    # Field-level evidence
    for issue in field_issues:
        evidence.append({
            "type": "field",
            "field": issue.get("field"),
            "title": issue.get("title"),
            "severity": issue.get("severity"),
            "description": issue.get("description"),
        })

    # Visual evidence
    if visual_analysis:
        for issue in visual_analysis.get("issues", []):
            evidence.append({
                "type": "visual",
                "field": None,
                "title": issue.get("title"),
                "severity": issue.get("severity"),
                "description": issue.get("description"),
            })

    # Content evidence
    for issue in content_issues:
        evidence.append({
            "type": "content",
            "field": issue.get("field"),
            "title": issue.get("title"),
            "severity": issue.get("severity"),
            "description": issue.get("description"),
        })

    return evidence
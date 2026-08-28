import re


DOCUMENT_RULES = {
    "certificate": {
        "keywords": [
            "certificate",
            "certification",
            "institution",
            "issued",
        ],
        "required_fields": [
            "name",
            "date",
        ],
    },
    "license": {
        "keywords": [
            "license",
            "licence",
            "valid",
            "issued",
        ],
        "required_fields": [
            "name",
            "date",
        ],
    },
    "identity_document": {
        "keywords": [
            "identity",
            "id",
            "date of birth",
            "dob",
            "address",
        ],
        "required_fields": [
            "name",
            "address",
        ],
    },
}


def detect_document_type(text: str) -> str:
    normalized = text.lower()

    scores = {}

    for document_type, rules in DOCUMENT_RULES.items():
        score = sum(
            1
            for keyword in rules["keywords"]
            if keyword in normalized
        )
        scores[document_type] = score

    best_type = max(scores, key=scores.get)

    if scores[best_type] == 0:
        return "unknown"

    return best_type


def check_required_fields(text: str, document_type: str) -> list:
    normalized = text.lower()

    if document_type not in DOCUMENT_RULES:
        return []

    issues = []

    for field in DOCUMENT_RULES[document_type]["required_fields"]:
        if field not in normalized:
            issues.append({
                "title": f"Missing field: {field}",
                "severity": "medium",
                "description": (
                    f"The expected field '{field}' "
                    "could not be identified in the extracted text."
                ),
            })

    return issues


def check_basic_anomalies(text: str) -> list:
    issues = []

    # Extremely short OCR output
    if len(text.strip()) < 30:
        issues.append({
            "title": "Insufficient document content",
            "severity": "high",
            "description": (
                "Very little readable text was extracted from the "
                "uploaded document."
            ),
        })

    # Suspicious repeated separators / broken OCR patterns
    if re.search(r"[_]{5,}|[.]{6,}", text):
        issues.append({
            "title": "Unusual text pattern",
            "severity": "low",
            "description": (
                "The extracted text contains an unusual repeated "
                "character pattern that may require review."
            ),
        })

    return issues


def calculate_risk_score(issues: list) -> int:
    severity_points = {
        "low": 8,
        "medium": 15,
        "high": 25,
        "critical": 35,
    }

    score = sum(
        severity_points.get(issue["severity"], 0)
        for issue in issues
    )

    return min(score, 100)


def get_risk_status(risk_score: int) -> str:
    if risk_score <= 20:
        return "low_risk"

    if risk_score <= 50:
        return "medium_risk"

    if risk_score <= 80:
        return "high_risk"

    return "critical_risk"


def analyze_document_text(text: str) -> dict:
    document_type = detect_document_type(text)

    issues = []

    issues.extend(
        check_required_fields(text, document_type)
    )

    issues.extend(
        check_basic_anomalies(text)
    )

    risk_score = calculate_risk_score(issues)
    status = get_risk_status(risk_score)

    if not issues:
        summary = (
            "No major content-level anomalies were detected "
            "by the current verification checks."
        )
        recommendation = (
            "Document passed the initial automated checks. "
            "Additional verification may still be required."
        )
    else:
        summary = (
            f"{len(issues)} potential verification issue(s) "
            "were detected."
        )
        recommendation = (
            "Manual verification is recommended before accepting "
            "this document."
        )

    return {
        "document_type": document_type,
        "status": status,
        "risk_score": risk_score,
        "issue_count": len(issues),
        "issues": issues,
        "summary": summary,
        "recommendation": recommendation,
    }
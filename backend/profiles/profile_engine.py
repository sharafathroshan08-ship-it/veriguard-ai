import re
from datetime import datetime


# ==================================================
# REQUIRED FIELD
# ==================================================

def check_required_field(
    field_name: str,
    value: str | None,
    rules: dict,
) -> dict | None:
    """Check whether a required field is present."""

    if rules.get("required") and not value:
        return {
            "field": field_name,
            "title": f"{field_name.replace('_', ' ').title()} missing",
            "severity": "medium",
            "description": (
                f"The required field '{field_name}' "
                "could not be identified."
            ),
        }

    return None


# ==================================================
# MINIMUM LENGTH
# ==================================================

def check_min_length(
    field_name: str,
    value: str | None,
    rules: dict,
) -> dict | None:
    """Check minimum string length."""

    if not value:
        return None

    minimum = rules.get("min_length")

    if minimum and len(value.strip()) < minimum:
        return {
            "field": field_name,
            "title": f"Unusual {field_name.replace('_', ' ')} value",
            "severity": "low",
            "description": (
                f"The extracted {field_name.replace('_', ' ')} "
                f"is shorter than the expected minimum length "
                f"of {minimum} characters."
            ),
        }

    return None


# ==================================================
# REGEX PATTERN
# ==================================================

def check_pattern(
    field_name: str,
    value: str | None,
    rules: dict,
) -> dict | None:
    """Check a field against a configured regular expression."""

    if not value:
        return None

    pattern = rules.get("pattern")

    if not pattern:
        return None

    if not re.match(
        pattern,
        value.strip(),
        re.IGNORECASE,
    ):
        return {
            "field": field_name,
            "title": f"{field_name.replace('_', ' ').title()} format mismatch",
            "severity": "high",
            "description": (
                f"The extracted {field_name.replace('_', ' ')} "
                "does not match the expected profile format."
            ),
        }

    return None


# ==================================================
# ALLOWED VALUES
# ==================================================

def check_allowed_values(
    field_name: str,
    value: str | None,
    rules: dict,
) -> dict | None:
    """Check whether a field is one of the allowed values."""

    if not value:
        return None

    allowed_values = rules.get(
        "allowed_values",
        [],
    )

    if not allowed_values:
        return None

    normalized_value = value.strip().lower()

    normalized_allowed = {
        str(item).strip().lower()
        for item in allowed_values
    }

    if normalized_value not in normalized_allowed:
        return {
            "field": field_name,
            "title": f"Unrecognized {field_name.replace('_', ' ')}",
            "severity": "low",
            "description": (
                f"The extracted value '{value}' is not listed "
                "among the allowed profile values."
            ),
        }

    return None


# ==================================================
# DATE PARSING
# ==================================================

def parse_profile_date(
    value: str | None,
    formats: list[str],
) -> datetime | None:
    """Parse a date using the formats defined by a profile."""

    if not value:
        return None

    cleaned_value = value.strip()

    for date_format in formats:
        try:
            return datetime.strptime(
                cleaned_value,
                date_format,
            )
        except ValueError:
            continue

    return None


# ==================================================
# DATE FORMAT
# ==================================================

def check_date_format(
    field_name: str,
    value: str | None,
    rules: dict,
) -> dict | None:
    """Validate a date using formats declared by the profile."""

    if not value:
        return None

    formats = rules.get(
        "formats",
        [],
    )

    if not formats:
        return None

    parsed_date = parse_profile_date(
        value,
        formats,
    )

    if parsed_date is not None:
        return None

    return {
        "field": field_name,
        "title": (
            f"{field_name.replace('_', ' ').title()} format invalid"
        ),
        "severity": "medium",
        "description": (
            f"The extracted {field_name.replace('_', ' ')} "
            "does not match any supported profile date format."
        ),
    }


# ==================================================
# FUTURE DATE
# ==================================================

def check_future_date(
    field_name: str,
    value: str | None,
    rules: dict,
) -> dict | None:
    """
    Flag dates that are later than today when the profile
    explicitly enables future-date checking.
    """

    if not value:
        return None

    if not rules.get(
        "reject_future",
        False,
    ):
        return None

    formats = rules.get(
        "formats",
        [],
    )

    parsed_date = parse_profile_date(
        value,
        formats,
    )

    if parsed_date is None:
        return None

    if parsed_date > datetime.now():
        return {
            "field": field_name,
            "title": "Future date detected",
            "severity": "high",
            "description": (
                f"The {field_name.replace('_', ' ')} "
                "is later than the current date."
            ),
        }

    return None


# ==================================================
# CROSS-FIELD: CERTIFICATE YEAR
# ==================================================

def check_certificate_year_matches_issue_year(
    fields: dict,
) -> dict | None:
    """
    Check that the year embedded in a certificate ID
    matches the issue-date year.

    Example:
    CERT-2026-00124 + 28-08-2026 -> valid
    CERT-2025-00124 + 28-08-2026 -> issue
    """

    certificate_id = fields.get(
        "certificate_id"
    )

    issue_date = fields.get(
        "issue_date"
    )

    if not certificate_id or not issue_date:
        return None

    certificate_match = re.search(
        r"\bCERT-(\d{4})-",
        certificate_id.upper(),
    )

    issue_year_match = re.search(
        r"\b(\d{4})\b",
        issue_date,
    )

    if not certificate_match:
        return None

    if not issue_year_match:
        return None

    certificate_year = (
        certificate_match.group(1)
    )

    issue_year = (
        issue_year_match.group(1)
    )

    if certificate_year != issue_year:
        return {
            "field": "certificate_id + issue_date",
            "title": "Certificate year inconsistency",
            "severity": "high",
            "description": (
                f"The certificate ID indicates the year "
                f"{certificate_year}, while the issue date "
                f"indicates {issue_year}."
            ),
        }

    return None


# ==================================================
# CROSS-FIELD: EXPIRY AFTER ISSUE
# ==================================================

def check_expiry_after_issue(
    fields: dict,
    profile: dict,
) -> dict | None:
    """
    Check that expiry_date occurs after issue_date.
    """

    issue_date = fields.get(
        "issue_date"
    )

    expiry_date = fields.get(
        "expiry_date"
    )

    if not issue_date or not expiry_date:
        return None

    field_rules = profile.get(
        "field_rules",
        {},
    )

    issue_rules = field_rules.get(
        "issue_date",
        {},
    )

    expiry_rules = field_rules.get(
        "expiry_date",
        {},
    )

    issue_formats = issue_rules.get(
        "formats",
        [],
    )

    expiry_formats = expiry_rules.get(
        "formats",
        [],
    )

    issue_parsed = parse_profile_date(
        issue_date,
        issue_formats,
    )

    expiry_parsed = parse_profile_date(
        expiry_date,
        expiry_formats,
    )

    if issue_parsed is None:
        return None

    if expiry_parsed is None:
        return None

    if expiry_parsed <= issue_parsed:
        return {
            "field": "issue_date + expiry_date",
            "title": "Expiry date inconsistency",
            "severity": "high",
            "description": (
                "The expiry date is not later than "
                "the issue date."
            ),
        }

    return None


# ==================================================
# CROSS-FIELD RULE ENGINE
# ==================================================

def check_cross_field_rules(
    fields: dict,
    profile: dict,
) -> list[dict]:
    """
    Execute cross-field rules defined in the
    document profile.
    """

    issues = []

    cross_field_rules = profile.get(
        "cross_field_rules",
        [],
    )

    for rule in cross_field_rules:

        # Allow either a string rule name or
        # a dictionary containing a "name".
        if isinstance(rule, str):
            rule_name = rule

        elif isinstance(rule, dict):
            rule_name = rule.get(
                "name",
                "",
            )

        else:
            continue

        # ----------------------------------------------
        # CERTIFICATE YEAR RULE
        # ----------------------------------------------

        if rule_name in {
            "certificate_year_matches_issue_year",
            "certificate_year_match",
            "year_consistency",
        }:

            issue = (
                check_certificate_year_matches_issue_year(
                    fields
                )
            )

            if issue:
                issues.append(issue)

        # ----------------------------------------------
        # LICENSE EXPIRY RULE
        # ----------------------------------------------

        elif rule_name in {
            "expiry_after_issue",
            "expiry_date_after_issue_date",
            "issue_before_expiry",
        }:

            issue = check_expiry_after_issue(
                fields,
                profile,
            )

            if issue:
                issues.append(issue)

        # ----------------------------------------------
        # UNKNOWN RULE
        # ----------------------------------------------

        else:
            # Unknown rules are ignored intentionally.
            # This allows new profile rules to be added
            # later without crashing the application.
            continue

    return issues


# ==================================================
# COMPLETE PROFILE VALIDATION
# ==================================================

def validate_fields(
    fields: dict,
    profile: dict,
) -> list[dict]:
    """
    Validate extracted fields against a document profile,
    including field-level and cross-field rules.
    """

    issues = []

    field_rules = profile.get(
        "field_rules",
        {},
    )

    # ==================================================
    # FIELD-LEVEL RULES
    # ==================================================

    for field_name, rules in field_rules.items():

        value = fields.get(
            field_name
        )

        # Required field
        issue = check_required_field(
            field_name,
            value,
            rules,
        )

        if issue:
            issues.append(issue)
            continue

        # Minimum length
        issue = check_min_length(
            field_name,
            value,
            rules,
        )

        if issue:
            issues.append(issue)

        # Regex pattern
        issue = check_pattern(
            field_name,
            value,
            rules,
        )

        if issue:
            issues.append(issue)

        # Allowed values
        issue = check_allowed_values(
            field_name,
            value,
            rules,
        )

        if issue:
            issues.append(issue)

        # Date format
        issue = check_date_format(
            field_name,
            value,
            rules,
        )

        if issue:
            issues.append(issue)

        # Future-date rule
        issue = check_future_date(
            field_name,
            value,
            rules,
        )

        if issue:
            issues.append(issue)

    # ==================================================
    # CROSS-FIELD RULES
    # ==================================================

    cross_field_issues = check_cross_field_rules(
        fields,
        profile,
    )

    issues.extend(
        cross_field_issues
    )

    return issues


# ==================================================
# EXPECTED FIELDS
# ==================================================

def get_expected_fields(
    profile: dict,
) -> list[str]:
    """Return fields expected by a document profile."""

    return profile.get(
        "expected_fields",
        [],
    )
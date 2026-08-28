from profiles.profile_registry import get_profile
from profiles.profile_engine import validate_fields


def verify_fields(
    fields: dict,
    document_type: str,
) -> list[dict]:
    """
    Verify extracted fields using the profile
    registered for the detected document type.
    """

    profile = get_profile(document_type)

    if not profile:
        return [
            {
                "field": "document_type",
                "title": "Unsupported document type",
                "severity": "medium",
                "description": (
                    f"No verification profile is currently "
                    f"configured for '{document_type}'."
                ),
            }
        ]

    return validate_fields(
        fields,
        profile,
    )
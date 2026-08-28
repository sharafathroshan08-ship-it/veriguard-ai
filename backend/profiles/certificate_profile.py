CERTIFICATE_PROFILE = {
    "document_type": "certificate",

    "display_name": "Certificate",

    "expected_fields": [
        "name",
        "certificate_id",
        "institution",
        "issue_date",
        "status",
    ],

    "field_rules": {
        "name": {
            "required": True,
            "min_length": 3,
        },

        "certificate_id": {
            "required": True,
            "pattern": r"^CERT-\d{4}-\d{4,8}$",
        },

        "institution": {
            "required": True,
            "min_length": 3,
        },

        "issue_date": {
            "required": True,
            "formats": [
                "%d-%m-%Y",
                "%d/%m/%Y",
                "%Y-%m-%d",
                "%Y",
            ],
        },

        "status": {
            "required": False,
            "allowed_values": [
                "valid",
                "active",
                "issued",
                "verified",
            ],
        },
    },

    "cross_field_rules": [
        {
            "name": "certificate_year_matches_issue_year",
            "description": (
                "The year in the certificate ID should "
                "match the issue-date year."
            ),
        }
    ],
}
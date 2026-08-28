LICENSE_PROFILE = {
    "document_type": "license",

    "display_name": "License",

    "expected_fields": [
        "name",
        "license_number",
        "issue_date",
        "expiry_date",
    ],

    "field_rules": {
        "name": {
            "required": True,
            "min_length": 3,
        },

        "license_number": {
            "required": True,
            "min_length": 5,
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

        "expiry_date": {
            "required": True,
            "formats": [
                "%d-%m-%Y",
                "%d/%m/%Y",
                "%Y-%m-%d",
                "%Y",
            ],
        },
    },

    "cross_field_rules": [
        {
            "name": "expiry_after_issue",
            "description": (
                "The expiry date should be later "
                "than the issue date."
            ),
        }
    ],
}
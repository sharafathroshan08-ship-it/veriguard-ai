IDENTITY_PROFILE = {
    "document_type": "identity_document",

    "display_name": "Identity Document",

    "expected_fields": [
        "name",
        "date_of_birth",
        "address",
        "id_number",
    ],

    "field_rules": {
        "name": {
            "required": True,
            "min_length": 3,
        },

        "date_of_birth": {
            "required": True,
            "formats": [
                "%d-%m-%Y",
                "%d/%m/%Y",
                "%Y-%m-%d",
            ],
        },

        "address": {
            "required": True,
            "min_length": 5,
        },

        "id_number": {
            "required": True,
            "min_length": 4,
        },
    },

    "cross_field_rules": [],
}
import re


def clean_value(value: str) -> str:
    """Clean OCR noise from an extracted field value."""
    value = value.strip()
    value = re.sub(r"\s+", " ", value)
    value = value.strip(":|.- ")
    return value


def find_label_value(
    text: str,
    labels: list[str],
) -> str | None:
    """
    Find a value appearing after labels such as:
    Name:, Address:, DOB:, etc.
    """

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    for line in lines:

        for label in labels:

            pattern = rf"{re.escape(label)}\s*[:\-]\s*(.+)"

            match = re.search(
                pattern,
                line,
                re.IGNORECASE,
            )

            if match:
                return clean_value(
                    match.group(1)
                )

    return None


def extract_certificate_id(
    text: str,
) -> str | None:
    """Extract a synthetic certificate ID."""

    match = re.search(
        r"\bCERT-\d{4}-\d{4,8}\b",
        text,
        re.IGNORECASE,
    )

    if match:
        return match.group(0).upper()

    return None


def extract_date(
    text: str,
) -> str | None:
    """Extract common date formats."""

    patterns = [
        r"\b\d{2}-\d{2}-\d{4}\b",
        r"\b\d{2}/\d{2}/\d{4}\b",
        r"\b\d{4}-\d{2}-\d{2}\b",
        r"\b\d{4}\b",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
        )

        if match:
            return match.group(0)

    return None


def extract_fields(
    text: str,
    document_type: str,
) -> dict:
    """
    Convert OCR text into structured fields.
    """

    fields = {}

    # ==================================================
    # CERTIFICATE
    # ==================================================

    if document_type == "certificate":

        fields["name"] = find_label_value(
            text,
            [
                "Name",
                "Candidate Name",
            ],
        )

        fields["certificate_id"] = (
            extract_certificate_id(text)
            or find_label_value(
                text,
                [
                    "Certificate ID",
                    "Certificate No",
                    "Certificate Number",
                ],
            )
        )

        fields["institution"] = find_label_value(
            text,
            [
                "Institution",
                "Institute",
                "Organization",
            ],
        )

        fields["issue_date"] = (
            find_label_value(
                text,
                [
                    "Issue Date",
                    "Issued Date",
                    "Date of Issue",
                ],
            )
            or extract_date(text)
        )

        fields["status"] = find_label_value(
            text,
            [
                "Status",
            ],
        )

    # ==================================================
    # IDENTITY DOCUMENT
    # ==================================================

    elif document_type == "identity_document":

        fields["name"] = find_label_value(
            text,
            [
                "Name",
                "Full Name",
                "Holder Name",
            ],
        )

        fields["date_of_birth"] = find_label_value(
            text,
            [
                "Date of Birth",
                "DOB",
                "Birth Date",
            ],
        )

        fields["address"] = find_label_value(
            text,
            [
                "Address",
                "Residential Address",
                "Permanent Address",
            ],
        )

        fields["id_number"] = find_label_value(
            text,
            [
                "ID Number",
                "ID No",
                "Document Number",
                "Document No",
            ],
        )

    # ==================================================
    # LICENSE
    # ==================================================

    elif document_type == "license":

        fields["name"] = find_label_value(
            text,
            [
                "Name",
                "Holder Name",
                "License Holder",
                "Licence Holder",
            ],
        )

        fields["issue_date"] = find_label_value(
            text,
            [
                "Issue Date",
                "Issued",
                "Date of Issue",
            ],
        )

        fields["expiry_date"] = find_label_value(
            text,
            [
                "Expiry Date",
                "Expiration Date",
                "Valid Until",
            ],
        )

        fields["license_number"] = find_label_value(
            text,
            [
                "License No",
                "Licence No",
                "License Number",
                "Licence Number",
            ],
        )

    # ==================================================
    # REMOVE EMPTY VALUES
    # ==================================================

    return {
        key: value
        for key, value in fields.items()
        if value is not None
    }
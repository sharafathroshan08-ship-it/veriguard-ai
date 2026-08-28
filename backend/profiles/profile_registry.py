from profiles.certificate_profile import CERTIFICATE_PROFILE
from profiles.identity_profile import IDENTITY_PROFILE
from profiles.license_profile import LICENSE_PROFILE


DOCUMENT_PROFILES = {
    "certificate": CERTIFICATE_PROFILE,
    "identity_document": IDENTITY_PROFILE,
    "license": LICENSE_PROFILE,
}


def get_profile(document_type: str) -> dict | None:
    """
    Return the verification profile for a document type.
    """

    return DOCUMENT_PROFILES.get(document_type)
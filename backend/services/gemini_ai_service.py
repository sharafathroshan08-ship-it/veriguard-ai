import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image


# ==================================================
# LOAD ENVIRONMENT
# ==================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# We use a lightweight Flash model for fast demo analysis.
GEMINI_MODEL = "gemini-2.5-flash-lite"


# ==================================================
# CLIENT
# ==================================================

_client = None

if GEMINI_API_KEY:
    _client = genai.Client(
        api_key=GEMINI_API_KEY
    )


# ==================================================
# DEFAULT RESULT
# ==================================================

def default_gemini_result(
    reason: str,
) -> dict[str, Any]:
    """
    Safe fallback when Gemini is unavailable.
    """

    return {
        "available": False,
        "model": GEMINI_MODEL,
        "risk_signal": 0,
        "risk_level": "unknown",
        "confidence": 0,
        "document_type": "unknown",
        "summary": reason,
        "indicators": [],
        "recommendation": (
            "Continue using the deterministic "
            "verification checks."
        ),
    }


# ==================================================
# GEMINI DOCUMENT ANALYSIS
# ==================================================

def analyze_document_with_gemini(
    image_path: str,
    extracted_text: str,
    document_type: str,
    extracted_fields: dict[str, Any],
) -> dict[str, Any]:
    """
    Analyze a document using Gemini multimodal reasoning.

    Gemini receives:
    - the document image
    - OCR text
    - detected document type
    - extracted fields

    The model provides an additional risk signal.
    It does not independently prove authenticity.
    """

    if _client is None:

        return default_gemini_result(
            "Gemini API key is not configured."
        )

    path = Path(image_path)

    if not path.exists():

        return default_gemini_result(
            "Document image was not found."
        )

    try:

        # --------------------------------------------------
        # LOAD IMAGE
        # --------------------------------------------------

        image = Image.open(path)

        # --------------------------------------------------
        # STRUCTURED OUTPUT SCHEMA
        # --------------------------------------------------

        response_schema = {
            "type": "object",
            "properties": {
                "document_type": {
                    "type": "string",
                    "description": (
                        "Likely type of document."
                    ),
                },
                "risk_signal": {
                    "type": "integer",
                    "description": (
                        "Additional risk signal from 0 to 100. "
                        "This is not a probability of fraud."
                    ),
                },
                "risk_level": {
                    "type": "string",
                    "description": (
                        "low, medium, high, or critical"
                    ),
                },
                "confidence": {
                    "type": "integer",
                    "description": (
                        "Confidence in the AI analysis from 0 to 100."
                    ),
                },
                "summary": {
                    "type": "string",
                    "description": (
                        "Concise explanation of the analysis."
                    ),
                },
                "indicators": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string"
                            },
                            "severity": {
                                "type": "string"
                            },
                            "description": {
                                "type": "string"
                            },
                        },
                        "required": [
                            "title",
                            "severity",
                            "description",
                        ],
                    },
                },
                "recommendation": {
                    "type": "string",
                    "description": (
                        "Recommended next action."
                    ),
                },
            },
            "required": [
                "document_type",
                "risk_signal",
                "risk_level",
                "confidence",
                "summary",
                "indicators",
                "recommendation",
            ],
        }

        # --------------------------------------------------
        # PROMPT
        # --------------------------------------------------

        prompt = f"""
You are the AI analysis layer of VeriGuard AI,
a document verification and fraud-risk screening system.

Analyze the supplied document image together with its OCR text.

Important rules:
1. Do NOT claim that a document is definitely genuine or definitely fraudulent.
2. Identify visual, structural, textual, or consistency indicators that may require review.
3. Treat this as risk screening, not legal or government verification.
4. Do not invent missing information.
5. Use the supplied OCR and fields as supporting evidence.
6. Return a conservative risk signal from 0 to 100.
7. Explain the indicators clearly.

Detected document type:
{document_type}

Extracted fields:
{json.dumps(extracted_fields, ensure_ascii=False, indent=2)}

OCR text:
{extracted_text}
"""

        # --------------------------------------------------
        # GEMINI REQUEST
        # --------------------------------------------------

        response = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                prompt,
                image,
            ],
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=1000,
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )

        # --------------------------------------------------
        # PARSE RESPONSE
        # --------------------------------------------------

        raw_text = response.text

        result = json.loads(raw_text)

        risk_signal = int(
            result.get("risk_signal", 0)
        )

        confidence = int(
            result.get("confidence", 0)
        )

        result["risk_signal"] = max(
            0,
            min(risk_signal, 100),
        )

        result["confidence"] = max(
            0,
            min(confidence, 100),
        )

        result["available"] = True
        result["model"] = GEMINI_MODEL

        return result

    except Exception as exc:

        return default_gemini_result(
            f"Gemini analysis unavailable: {exc}"
        )
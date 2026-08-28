from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database.database import (
    initialize_database,
    save_verification,
    get_verification_history,
)

from services.document_service import (
    save_uploaded_document,
    UPLOAD_DIR,
)

from services.ocr_service import extract_text

from services.verification_service import (
    analyze_document_text,
)

from services.visual_analysis_service import (
    analyze_visual_anomalies,
)

from services.field_extraction_service import (
    extract_fields,
)

from services.field_verification_service import (
    verify_fields,
)

from services.risk_engine_service import (
    build_risk_result,
)

from services.fraud_evidence_service import (
    build_fraud_evidence,
)

from services.report_service import (
    build_verification_report,
)

from services.gemini_ai_service import (
    analyze_document_with_gemini,
)


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

initialize_database()


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="VeriGuard AI",
    description=(
        "AI-Based Document Verification "
        "& Fraud Risk Detection Platform"
    ),
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================
# Allows the React/Vite frontend to communicate with
# this FastAPI backend during local development.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",

        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "VeriGuard AI backend is running",
        "status": "online",
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }


# =========================================================
# FIND DOCUMENT
# =========================================================

def find_document(
    document_id: str,
) -> Path | None:

    matching_files = list(
        UPLOAD_DIR.glob(
            f"{document_id}_*"
        )
    )

    if not matching_files:
        return None

    return matching_files[0]


# =========================================================
# UPLOAD
# =========================================================

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...)
):

    allowed_types = {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
    }

    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Upload PDF, PNG, or JPEG."
            ),
        )

    content = await file.read()

    if not content:

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    result = save_uploaded_document(
        filename=file.filename
        or "document",
        content=content,
    )

    return {
        "success": True,
        "message": (
            "Document uploaded successfully."
        ),
        **result,
    }


# =========================================================
# OCR
# =========================================================

@app.post(
    "/api/documents/{document_id}/ocr"
)
async def run_ocr(
    document_id: str,
):

    file_path = find_document(
        document_id
    )

    if file_path is None:

        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    try:

        text = extract_text(
            str(file_path)
        )

        return {
            "success": True,
            "document_id": document_id,
            "extracted_text": text,
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {exc}",
        ) from exc


# =========================================================
# VERIFY
# =========================================================

@app.post(
    "/api/documents/{document_id}/verify"
)
async def verify_document(
    document_id: str,
):

    file_path = find_document(
        document_id
    )

    if file_path is None:

        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    try:

        # --------------------------------------------------
        # 1. OCR
        # --------------------------------------------------

        extracted_text = extract_text(
            str(file_path)
        )

        # --------------------------------------------------
        # 2. CONTENT ANALYSIS
        # --------------------------------------------------

        content_analysis = analyze_document_text(
            extracted_text
        )

        document_type = content_analysis[
            "document_type"
        ]

        content_analysis[
            "extracted_text"
        ] = extracted_text

        # --------------------------------------------------
        # 3. FIELD EXTRACTION
        # --------------------------------------------------

        extracted_fields = extract_fields(
            extracted_text,
            document_type,
        )

        # --------------------------------------------------
        # 4. FIELD VERIFICATION
        # --------------------------------------------------

        field_issues = verify_fields(
            extracted_fields,
            document_type,
        )

        # --------------------------------------------------
        # 5. VISUAL ANALYSIS
        # --------------------------------------------------

        visual_analysis = None

        if file_path.suffix.lower() in {
            ".png",
            ".jpg",
            ".jpeg",
        }:

            visual_analysis = (
                analyze_visual_anomalies(
                    str(file_path)
                )
            )

        # --------------------------------------------------
        # 6. GEMINI AI ANALYSIS
        # --------------------------------------------------

        gemini_analysis = (
            analyze_document_with_gemini(
                image_path=str(file_path),
                extracted_text=extracted_text,
                document_type=document_type,
                extracted_fields=extracted_fields,
            )
        )

        # --------------------------------------------------
        # 7. SMART RISK ENGINE
        # --------------------------------------------------

        risk_result = build_risk_result(
            content_analysis=content_analysis,
            extracted_fields=extracted_fields,
            field_issues=field_issues,
            visual_analysis=visual_analysis,
            gemini_analysis=gemini_analysis,
        )

        # --------------------------------------------------
        # 8. FRAUD EVIDENCE
        # --------------------------------------------------

        content_issues = content_analysis.get(
            "issues",
            [],
        )

        fraud_evidence = (
            build_fraud_evidence(
                field_issues=field_issues,
                visual_analysis=visual_analysis,
                content_issues=content_issues,
            )
        )

        # Add Gemini evidence
        if gemini_analysis.get(
            "available",
            False,
        ):

            for indicator in gemini_analysis.get(
                "indicators",
                [],
            ):

                fraud_evidence.append({
                    "type": "gemini_ai",
                    "field": None,
                    "title": indicator.get(
                        "title"
                    ),
                    "severity": indicator.get(
                        "severity"
                    ),
                    "description": indicator.get(
                        "description"
                    ),
                })

        # --------------------------------------------------
        # 9. REPORT
        # --------------------------------------------------

        report = (
            build_verification_report(
                document_id=document_id,
                document_type=document_type,
                file_name=file_path.name,
                extracted_fields=extracted_fields,
                risk_result=risk_result,
                fraud_evidence=fraud_evidence,
            )
        )

        # --------------------------------------------------
        # 10. DATABASE
        # --------------------------------------------------

        created_at = datetime.now().isoformat()

        history_id = save_verification(
            document_id=document_id,
            file_name=file_path.name,
            document_type=document_type,
            risk_score=risk_result[
                "risk_score"
            ],
            risk_level=risk_result[
                "risk_level"
            ],
            decision=risk_result[
                "decision"
            ],
            confidence=risk_result[
                "confidence"
            ],
            recommendation=risk_result[
                "recommendation"
            ],
            created_at=created_at,
        )

        # --------------------------------------------------
        # 11. FINAL RESPONSE
        # --------------------------------------------------

        return {
            "success": True,
            "document_id": document_id,
            "extracted_text": extracted_text,
            "extracted_fields": extracted_fields,

            "analysis": {
                "document_type": document_type,

                "risk_score": risk_result[
                    "risk_score"
                ],

                "risk_level": risk_result[
                    "risk_level"
                ],

                "decision": risk_result[
                    "decision"
                ],

                "confidence": risk_result[
                    "confidence"
                ],

                "content_risk_score": risk_result[
                    "content_risk_score"
                ],

                "field_risk_score": risk_result[
                    "field_risk_score"
                ],

                "visual_risk_score": risk_result[
                    "visual_risk_score"
                ],

                "gemini_risk_score": risk_result[
                    "gemini_risk_score"
                ],

                "issue_count": len(
                    fraud_evidence
                ),

                "reasons": risk_result[
                    "reasons"
                ],

                "recommendation": risk_result[
                    "recommendation"
                ],

                "field_issues": field_issues,

                "content_issues": content_issues,

                "visual_analysis": visual_analysis,

                "gemini_analysis": gemini_analysis,

                "fraud_evidence": fraud_evidence,

                "report": report,

                "history_id": history_id,

                "created_at": created_at,
            },
        }

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Verification failed: {exc}"
            ),
        ) from exc


# =========================================================
# VERIFICATION HISTORY
# =========================================================

@app.get(
    "/api/verification-history"
)
def verification_history(
    limit: int = 20,
):

    try:

        history = (
            get_verification_history(
                limit=limit
            )
        )

        return {
            "success": True,
            "count": len(history),
            "history": history,
        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Could not load verification "
                f"history: {exc}"
            ),
        )
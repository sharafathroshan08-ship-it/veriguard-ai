from pathlib import Path
from uuid import uuid4


# Always use the backend/uploads folder,
# regardless of where the server was started from.
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_uploaded_document(filename: str, content: bytes) -> dict:
    document_id = str(uuid4())

    safe_filename = Path(filename).name

    file_path = UPLOAD_DIR / f"{document_id}_{safe_filename}"

    file_path.write_bytes(content)

    return {
        "document_id": document_id,
        "file_name": safe_filename,
        "file_size": len(content),
        "file_path": str(file_path),
    }
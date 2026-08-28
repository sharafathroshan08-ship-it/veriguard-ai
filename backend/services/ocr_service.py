from pathlib import Path

import fitz  # PyMuPDF
import pytesseract
from PIL import Image


TESSERACT_PATH = Path(
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

pytesseract.pytesseract.tesseract_cmd = str(
    TESSERACT_PATH
)


IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
}


def extract_text_from_image(
    image_path: str,
) -> str:
    """Extract text from a PNG/JPG image."""

    path = Path(image_path)

    if not path.exists():
        raise FileNotFoundError(
            f"File not found: {path}"
        )

    with Image.open(path) as image:

        text = pytesseract.image_to_string(
            image,
            lang="eng",
        )

    return text.strip()


def extract_text_from_pdf(
    pdf_path: str,
) -> str:
    """Render each PDF page and extract text using Tesseract."""

    path = Path(pdf_path)

    if not path.exists():
        raise FileNotFoundError(
            f"PDF not found: {path}"
        )

    text_parts = []

    with fitz.open(path) as document:

        for page_number, page in enumerate(
            document
        ):

            # Render PDF page at a reasonable resolution
            # for OCR.
            pixmap = page.get_pixmap(
                matrix=fitz.Matrix(2, 2),
                alpha=False,
            )

            image = Image.frombytes(
                "RGB",
                [
                    pixmap.width,
                    pixmap.height,
                ],
                pixmap.samples,
            )

            page_text = pytesseract.image_to_string(
                image,
                lang="eng",
            ).strip()

            if page_text:

                text_parts.append(
                    f"--- Page {page_number + 1} ---\n"
                    f"{page_text}"
                )

    return "\n\n".join(
        text_parts
    ).strip()


def extract_text(
    document_path: str,
) -> str:
    """
    Automatically extract text from either:
    PNG/JPG/JPEG or PDF.
    """

    path = Path(document_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Document not found: {path}"
        )

    extension = path.suffix.lower()

    if extension in IMAGE_EXTENSIONS:

        return extract_text_from_image(
            str(path)
        )

    if extension == ".pdf":

        return extract_text_from_pdf(
            str(path)
        )

    raise ValueError(
        "Unsupported document format. "
        "Supported formats: PNG, JPG, JPEG, PDF."
    )
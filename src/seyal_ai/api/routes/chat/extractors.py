"""Seyal AI — Chat File Content Extractors."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from fastapi import HTTPException, UploadFile


TEXT_EXTENSIONS = {
    ".txt",
    ".md",
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".html",
    ".css",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
    ".csv",
    ".sql",
}


async def extract_file_content(
    upload: UploadFile,
) -> str:
    """Extract readable content from an uploaded file."""

    filename = upload.filename or "uploaded_file"
    extension = Path(filename).suffix.lower()
    content = await upload.read()

    if not content:
        return f"[File: {filename}]\nThe file is empty."

    # --------------------------------------------------
    # TEXT / CODE FILES
    # --------------------------------------------------
    if extension in TEXT_EXTENSIONS:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("utf-8", errors="replace")

        return (
            f"\n--- FILE START: {filename} ---\n"
            f"{text}\n"
            f"--- FILE END: {filename} ---\n"
        )

    # --------------------------------------------------
    # PDF
    # --------------------------------------------------
    if extension == ".pdf":
        try:
            # pyrefly: ignore [missing-import]
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(content))
            pages: list[str] = []

            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    pages.append(page_text)

            extracted = "\n\n".join(pages)
            if not extracted.strip():
                extracted = "[No readable text could be extracted from this PDF.]"

            return (
                f"\n--- PDF START: {filename} ---\n"
                f"{extracted}\n"
                f"--- PDF END: {filename} ---\n"
            )
        except Exception as error:
            raise HTTPException(
                status_code=400,
                detail=f"Unable to read PDF '{filename}': {error}",
            )

    # --------------------------------------------------
    # DOCX
    # --------------------------------------------------
    if extension == ".docx":
        try:
            # pyrefly: ignore [missing-import]
            from docx import Document

            document = Document(BytesIO(content))
            paragraphs = [
                paragraph.text
                for paragraph in document.paragraphs
                if paragraph.text.strip()
            ]
            extracted = "\n".join(paragraphs)

            return (
                f"\n--- DOCX START: {filename} ---\n"
                f"{extracted}\n"
                f"--- DOCX END: {filename} ---\n"
            )
        except Exception as error:
            raise HTTPException(
                status_code=400,
                detail=f"Unable to read DOCX '{filename}': {error}",
            )

    # --------------------------------------------------
    # EXCEL
    # --------------------------------------------------
    if extension in {".xlsx", ".xls"}:
        try:
            # pyrefly: ignore [missing-source-for-stubs]
            import openpyxl

            workbook = openpyxl.load_workbook(
                BytesIO(content),
                data_only=True,
            )
            output: list[str] = []

            for sheet in workbook.worksheets:
                output.append(f"\nSheet: {sheet.title}")
                for row in sheet.iter_rows(values_only=True):
                    values = [
                        "" if value is None else str(value)
                        for value in row
                    ]
                    output.append(" | ".join(values))

            extracted = "\n".join(output)
            return (
                f"\n--- EXCEL START: {filename} ---\n"
                f"{extracted}\n"
                f"--- EXCEL END: {filename} ---\n"
            )
        except Exception as error:
            raise HTTPException(
                status_code=400,
                detail=f"Unable to read Excel file '{filename}': {error}",
            )

    # --------------------------------------------------
    # IMAGE
    # --------------------------------------------------
    if upload.content_type and upload.content_type.startswith("image/"):
        try:
            from PIL import Image
            # pyrefly: ignore [missing-import]
            import pytesseract

            image = Image.open(BytesIO(content))
            extracted = pytesseract.image_to_string(image)
            extracted = pytesseract.image_to_string(image)

            if not extracted.strip():
                extracted = "[No readable text was detected in this image.]"

            return (
                f"\n--- IMAGE OCR START: {filename} ---\n"
                f"{extracted}\n"
                f"--- IMAGE OCR END: {filename} ---\n"
            )
        except Exception as error:
            raise HTTPException(
                status_code=400,
                detail=f"Unable to analyze image '{filename}': {error}",
            )

    # --------------------------------------------------
    # UNSUPPORTED
    # --------------------------------------------------
    return (
        f"\n--- FILE: {filename} ---\n"
        f"This file type ({extension or 'unknown'}) "
        f"is not supported for content extraction.\n"
        f"--- END FILE ---\n"
    )

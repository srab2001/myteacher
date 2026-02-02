"""
PDF processing service for Maryland Special Education Tools.

Uses a tiered extraction approach:
1. PyPDF2 for digital PDFs (fastest)
2. pdfplumber fallback if PyPDF2 yields <100 chars
3. Tesseract OCR for scanned documents
"""

import io
import re
import uuid
from typing import Dict, Any, Optional, Tuple
from enum import Enum
import httpx


class DocumentType(str, Enum):
    """Document types for special education documents."""
    IEP = "iep"
    EVALUATION = "evaluation"
    PLAN_504 = "504_plan"
    NOTICE = "notice"
    UNKNOWN = "unknown"


# Keywords for document type identification
DOCUMENT_TYPE_KEYWORDS = {
    DocumentType.IEP: [
        "individualized education program",
        "iep",
        "present levels",
        "present level of performance",
        "annual goals",
        "special education services",
        "related services",
        "least restrictive environment",
    ],
    DocumentType.EVALUATION: [
        "educational evaluation",
        "psychological evaluation",
        "assessment results",
        "cognitive assessment",
        "achievement testing",
        "evaluation report",
        "psychoeducational",
        "eligibility determination",
    ],
    DocumentType.PLAN_504: [
        "section 504",
        "504 plan",
        "accommodation plan",
        "504 accommodation",
        "rehabilitation act",
        "504 eligibility",
    ],
    DocumentType.NOTICE: [
        "notice of",
        "prior written notice",
        "procedural safeguards",
        "parental rights",
        "notice of meeting",
        "notice of action",
        "consent form",
    ],
}


def identify_document_type(text: str) -> DocumentType:
    """
    Identify document type using keyword matching.

    Args:
        text: Extracted text from the document

    Returns:
        DocumentType enum value
    """
    if not text:
        return DocumentType.UNKNOWN

    text_lower = text.lower()
    scores: Dict[DocumentType, int] = {doc_type: 0 for doc_type in DocumentType}

    for doc_type, keywords in DOCUMENT_TYPE_KEYWORDS.items():
        for keyword in keywords:
            # Count occurrences of each keyword
            count = len(re.findall(re.escape(keyword), text_lower))
            scores[doc_type] += count

    # Find the document type with the highest score
    max_score = 0
    best_match = DocumentType.UNKNOWN

    for doc_type, score in scores.items():
        if score > max_score:
            max_score = score
            best_match = doc_type

    # Require at least 2 keyword matches to identify a document type
    if max_score < 2:
        return DocumentType.UNKNOWN

    return best_match


def _extract_with_pypdf2(content: bytes) -> Tuple[str, int]:
    """
    Extract text using PyPDF2 (fastest for digital PDFs).

    Args:
        content: PDF file content as bytes

    Returns:
        Tuple of (extracted_text, page_count)
    """
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(content))
    page_count = len(reader.pages)
    text_parts = []

    for page in reader.pages:
        text = page.extract_text()
        if text:
            text_parts.append(text.strip())

    return "\n\n".join(text_parts), page_count


def _extract_with_pdfplumber(content: bytes) -> Tuple[str, int]:
    """
    Extract text using pdfplumber (better for complex layouts).

    Args:
        content: PDF file content as bytes

    Returns:
        Tuple of (extracted_text, page_count)
    """
    import pdfplumber

    text_parts = []
    page_count = 0

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text.strip())

    return "\n\n".join(text_parts), page_count


def _extract_with_ocr(content: bytes) -> Tuple[str, int]:
    """
    Extract text using Tesseract OCR (for scanned documents).

    Args:
        content: PDF file content as bytes

    Returns:
        Tuple of (extracted_text, page_count)
    """
    import pytesseract
    from pdf2image import convert_from_bytes
    from PIL import Image

    # Convert PDF pages to images
    images = convert_from_bytes(content, dpi=300)
    page_count = len(images)
    text_parts = []

    for image in images:
        # Preprocess image for better OCR
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')

        # Extract text using Tesseract
        text = pytesseract.image_to_string(image, lang='eng')
        if text:
            text_parts.append(text.strip())

    return "\n\n".join(text_parts), page_count


async def extract_text_from_pdf_blob(blob_url: str) -> Dict[str, Any]:
    """
    Download PDF from Vercel Blob and extract text using tiered approach.

    Extraction strategy:
    1. Try PyPDF2 first (fastest for digital PDFs)
    2. If result < 100 chars, try pdfplumber
    3. If still poor quality, use Tesseract OCR

    Args:
        blob_url: URL of the PDF in Vercel Blob storage

    Returns:
        Dictionary with extracted text, page count, extraction method, and document type
    """
    # Download PDF from blob URL
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(blob_url)
        response.raise_for_status()
        content = response.content

    extracted_text = ""
    page_count = 0
    extraction_method = "unknown"

    # Step 1: Try PyPDF2 first
    try:
        extracted_text, page_count = _extract_with_pypdf2(content)
        extraction_method = "pypdf2"
    except Exception as e:
        print(f"PyPDF2 extraction failed: {e}")
        extracted_text = ""

    # Step 2: If PyPDF2 yields < 100 chars, try pdfplumber
    if len(extracted_text.strip()) < 100:
        try:
            extracted_text, page_count = _extract_with_pdfplumber(content)
            extraction_method = "pdfplumber"
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}")

    # Step 3: If still poor quality (< 100 chars), use OCR
    if len(extracted_text.strip()) < 100:
        try:
            extracted_text, page_count = _extract_with_ocr(content)
            extraction_method = "ocr"
        except Exception as e:
            print(f"OCR extraction failed: {e}")
            # Return what we have
            pass

    # Identify document type
    document_type = identify_document_type(extracted_text)

    return {
        "text": extracted_text,
        "page_count": page_count,
        "extraction_method": extraction_method,
        "document_type": document_type.value,
        "text_length": len(extracted_text),
    }


async def extract_text_from_pdf(content: bytes, filename: str) -> Dict[str, Any]:
    """
    Extract text content from a PDF file using tiered approach.

    Args:
        content: PDF file content as bytes
        filename: Original filename

    Returns:
        Dictionary with extracted text, page count, and metadata
    """
    extracted_text = ""
    page_count = 0
    extraction_method = "unknown"

    # Step 1: Try PyPDF2 first
    try:
        extracted_text, page_count = _extract_with_pypdf2(content)
        extraction_method = "pypdf2"
    except Exception:
        extracted_text = ""

    # Step 2: If PyPDF2 yields < 100 chars, try pdfplumber
    if len(extracted_text.strip()) < 100:
        try:
            extracted_text, page_count = _extract_with_pdfplumber(content)
            extraction_method = "pdfplumber"
        except Exception:
            pass

    # Step 3: If still poor quality, use OCR
    if len(extracted_text.strip()) < 100:
        try:
            extracted_text, page_count = _extract_with_ocr(content)
            extraction_method = "ocr"
        except Exception:
            pass

    document_type = identify_document_type(extracted_text)

    return {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "text": extracted_text,
        "page_count": page_count,
        "extraction_method": extraction_method,
        "document_type": document_type.value,
    }


async def extract_text_from_url(
    url: str, extract_tables: bool = False
) -> Dict[str, Any]:
    """
    Extract text from a PDF at the given URL.

    Args:
        url: URL of the PDF document
        extract_tables: Whether to extract tables separately

    Returns:
        Dictionary with extracted text and optional tables
    """
    import pdfplumber

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        content = response.content

    text_content = []
    tables = []

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_content.append(text)

            if extract_tables:
                page_tables = page.extract_tables()
                if page_tables:
                    tables.extend(page_tables)

    result = {
        "text": "\n\n".join(text_content),
        "page_count": len(text_content),
    }

    if extract_tables:
        result["tables"] = tables

    return result


async def extract_tables_from_pdf(content: bytes) -> list:
    """
    Extract tables from a PDF document.

    Args:
        content: PDF file content as bytes

    Returns:
        List of extracted tables
    """
    import pdfplumber

    tables = []

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables()
            if page_tables:
                tables.extend(page_tables)

    return tables

"""
PDF processing service using pypdf2 and pdfplumber.
"""

import io
import uuid
from typing import Dict, Any, Optional
import httpx


async def extract_text_from_pdf(content: bytes, filename: str) -> Dict[str, Any]:
    """
    Extract text content from a PDF file.

    Args:
        content: PDF file content as bytes
        filename: Original filename

    Returns:
        Dictionary with extracted text, page count, and metadata
    """
    import pdfplumber

    text_content = []
    page_count = 0

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_content.append(text)

    return {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "text": "\n\n".join(text_content),
        "page_count": page_count,
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

    async with httpx.AsyncClient() as client:
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

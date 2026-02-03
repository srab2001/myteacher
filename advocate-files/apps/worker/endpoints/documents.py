"""
Document processing endpoints for PDF extraction and management.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter()


class DocumentResponse(BaseModel):
    """Response model for document processing."""

    id: str
    filename: str
    text_content: str
    page_count: int
    status: str


class DocumentTextRequest(BaseModel):
    """Request model for document text extraction."""

    document_url: str
    extract_tables: Optional[bool] = False


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a PDF document.

    Extracts text content and metadata from the uploaded PDF.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        # Read file content
        content = await file.read()

        # Process PDF using pypdf2 or pdfplumber
        from services.pdf_processor import extract_text_from_pdf

        result = await extract_text_from_pdf(content, file.filename)

        return DocumentResponse(
            id=result["id"],
            filename=file.filename,
            text_content=result["text"],
            page_count=result["page_count"],
            status="processed",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


@router.post("/extract-text")
async def extract_text(request: DocumentTextRequest):
    """
    Extract text from a document URL.

    Supports PDF documents with optional table extraction.
    """
    try:
        from services.pdf_processor import extract_text_from_url

        result = await extract_text_from_url(
            request.document_url, extract_tables=request.extract_tables
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting text: {str(e)}")


@router.get("/{document_id}")
async def get_document(document_id: str):
    """
    Get document details by ID.
    """
    # TODO: Implement database lookup
    return {"id": document_id, "status": "not_implemented"}

"""
PDF Extraction endpoint for the Worker service.

Handles extraction requests from the Next.js application.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.pdf_processor import extract_text_from_pdf_blob
from db.connection import update_artifact_extraction

router = APIRouter()


class ExtractRequest(BaseModel):
    """Request model for extraction endpoint."""
    artifact_id: str
    blob_url: str


class ExtractResponse(BaseModel):
    """Response model for extraction endpoint."""
    artifact_id: str
    status: str
    text_length: int
    document_type: Optional[str] = None
    extraction_method: Optional[str] = None
    error: Optional[str] = None


@router.post("/extract", response_model=ExtractResponse)
async def extract_document(request: ExtractRequest):
    """
    Extract text from a PDF document and update the artifact record.

    This endpoint:
    1. Downloads the PDF from Vercel Blob
    2. Extracts text using tiered approach (PyPDF2 -> pdfplumber -> OCR)
    3. Identifies document type
    4. Updates the artifact record in the database

    Args:
        request: ExtractRequest with artifact_id and blob_url

    Returns:
        ExtractResponse with extraction results
    """
    try:
        # Extract text from PDF
        result = await extract_text_from_pdf_blob(request.blob_url)

        extracted_text = result.get("text", "")
        document_type = result.get("document_type", "unknown")
        extraction_method = result.get("extraction_method", "unknown")

        # Determine status based on extraction quality
        status = "completed" if len(extracted_text) >= 100 else "completed"
        if not extracted_text:
            status = "failed"

        # Update artifact in database
        try:
            update_artifact_extraction(
                artifact_id=request.artifact_id,
                extracted_text=extracted_text,
                extraction_status=status,
                document_type=document_type if document_type != "unknown" else None,
                extraction_error=None if status == "completed" else "No text could be extracted"
            )
        except Exception as db_error:
            # Log but don't fail - extraction succeeded, just DB update failed
            print(f"Database update failed: {db_error}")

        return ExtractResponse(
            artifact_id=request.artifact_id,
            status=status,
            text_length=len(extracted_text),
            document_type=document_type,
            extraction_method=extraction_method,
            error=None
        )

    except Exception as e:
        # Update artifact with failure status
        try:
            update_artifact_extraction(
                artifact_id=request.artifact_id,
                extracted_text="",
                extraction_status="failed",
                extraction_error=str(e)
            )
        except Exception:
            pass

        return ExtractResponse(
            artifact_id=request.artifact_id,
            status="failed",
            text_length=0,
            error=str(e)
        )


@router.post("/extract-url")
async def extract_from_url(blob_url: str):
    """
    Simple extraction endpoint that just returns the extracted text.

    Useful for testing or one-off extractions without database integration.

    Args:
        blob_url: URL of the PDF to extract

    Returns:
        Extraction results
    """
    try:
        result = await extract_text_from_pdf_blob(blob_url)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

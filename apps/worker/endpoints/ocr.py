"""
OCR (Optical Character Recognition) endpoints for image and scanned document processing.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


class OCRResponse(BaseModel):
    """Response model for OCR processing."""

    text: str
    confidence: float
    language: str
    page_count: int


class OCRBatchRequest(BaseModel):
    """Request model for batch OCR processing."""

    image_urls: List[str]
    language: Optional[str] = "eng"


@router.post("/process", response_model=OCRResponse)
async def process_image(
    file: UploadFile = File(...),
    language: str = "eng",
):
    """
    Process an image file using OCR to extract text.

    Supports common image formats: PNG, JPG, JPEG, TIFF, BMP.
    """
    allowed_extensions = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"}
    file_ext = "." + file.filename.split(".")[-1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}",
        )

    try:
        content = await file.read()
        from services.ocr_processor import process_image_ocr

        result = await process_image_ocr(content, language)

        return OCRResponse(
            text=result["text"],
            confidence=result["confidence"],
            language=language,
            page_count=1,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@router.post("/process-pdf")
async def process_scanned_pdf(
    file: UploadFile = File(...),
    language: str = "eng",
):
    """
    Process a scanned PDF document using OCR.

    Converts PDF pages to images and extracts text using OCR.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        content = await file.read()
        from services.ocr_processor import process_scanned_pdf

        result = await process_scanned_pdf(content, language)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@router.post("/batch")
async def batch_process(request: OCRBatchRequest):
    """
    Process multiple images using OCR in batch.
    """
    try:
        from services.ocr_processor import batch_process_images

        results = await batch_process_images(request.image_urls, request.language)
        return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch OCR failed: {str(e)}")

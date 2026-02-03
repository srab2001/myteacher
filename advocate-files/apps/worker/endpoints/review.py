"""
Document Review endpoints for the Worker service.

Provides endpoints for AI-powered IEP and evaluation document review.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

from services.document_reviewer import run_review, review_iep, generate_questions_and_requests
from db.connection import get_review, get_artifact

router = APIRouter()


class ReviewRequest(BaseModel):
    """Request model for document review."""
    artifact_id: str


class ReviewResponse(BaseModel):
    """Response model for document review."""
    status: str
    review_id: Optional[str] = None
    review_type: Optional[str] = None
    summary: Optional[str] = None
    overall_score: Optional[int] = None
    findings_count: Optional[int] = None
    questions_count: Optional[int] = None
    error: Optional[str] = None


class ReviewDetailResponse(BaseModel):
    """Full review details response."""
    review_id: str
    artifact_id: str
    review_type: str
    findings: Dict[str, Any]
    summary: Optional[str] = None
    score: Optional[float] = None
    created_at: str


@router.post("", response_model=ReviewResponse)
async def create_review(request: ReviewRequest):
    """
    Run AI-powered review on an uploaded document.

    This endpoint:
    1. Retrieves the artifact and its extracted text
    2. Determines document type (IEP, evaluation, etc.)
    3. Runs appropriate review using GPT-4o
    4. Stores findings in the database
    5. Returns review summary

    Args:
        request: ReviewRequest with artifact_id

    Returns:
        ReviewResponse with review results
    """
    try:
        result = await run_review(request.artifact_id)

        if result.get("error"):
            return ReviewResponse(
                status="failed",
                error=result["error"]
            )

        return ReviewResponse(
            status=result["status"],
            review_id=result.get("review_id"),
            review_type=result.get("review_type"),
            summary=result.get("summary"),
            overall_score=result.get("overall_score"),
            findings_count=result.get("findings_count"),
            questions_count=result.get("questions_count")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{review_id}", response_model=ReviewDetailResponse)
async def get_review_detail(review_id: str):
    """
    Get full review details by ID.

    Args:
        review_id: UUID of the review

    Returns:
        Full review details including all findings
    """
    try:
        review = get_review(review_id)

        if not review:
            raise HTTPException(status_code=404, detail="Review not found")

        return ReviewDetailResponse(
            review_id=str(review["id"]),
            artifact_id=str(review["artifact_id"]),
            review_type=review["review_type"],
            findings=review["findings"],
            summary=review.get("summary"),
            score=review.get("score"),
            created_at=str(review["created_at"])
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview")
async def preview_review(text: str):
    """
    Preview a review without storing it.

    Useful for testing or one-off reviews.

    Args:
        text: Document text to review

    Returns:
        Review findings (not stored in database)
    """
    try:
        findings = review_iep(text)
        questions_data = generate_questions_and_requests(findings)
        findings["questions_and_requests"] = questions_data
        return findings

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

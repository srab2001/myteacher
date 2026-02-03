"""
Health check endpoints for the Worker service.
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health_check():
    """Check if the service is healthy."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "md-sped-worker",
    }


@router.get("/ready")
async def readiness_check():
    """Check if the service is ready to accept requests."""
    # Add checks for database connection, external services, etc.
    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat(),
    }

"""
Maryland Special Education Tools - Worker Service

FastAPI application for PDF processing, OCR, and document embeddings.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Import routers
from endpoints import documents, ocr, embeddings, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup
    print("Starting Maryland SPED Tools Worker Service...")
    yield
    # Shutdown
    print("Shutting down Worker Service...")


app = FastAPI(
    title="MD SPED Tools Worker",
    description="Worker service for PDF processing, OCR, and document embeddings for Maryland Special Education Tools",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
app.include_router(embeddings.router, prefix="/api/embeddings", tags=["Embeddings"])


@app.get("/")
async def root():
    """Root endpoint returning service info."""
    return {
        "service": "MD SPED Tools Worker",
        "version": "1.0.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENV", "development") == "development",
    )

"""
Knowledge Base Ingestion endpoints for the Worker service.

Provides endpoints for ingesting Maryland legal documents and searching
the knowledge base.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from services.knowledge_base import (
    ingest_document,
    search_knowledge_base
)

router = APIRouter()


class IngestRequest(BaseModel):
    """Request model for document ingestion."""
    title: str
    source_type: str
    content: str
    url: Optional[str] = None
    county: Optional[str] = None


class IngestResponse(BaseModel):
    """Response model for document ingestion."""
    status: str
    document_id: Optional[str] = None
    chunks_created: Optional[int] = None
    embeddings_stored: Optional[int] = None
    reason: Optional[str] = None


class SearchRequest(BaseModel):
    """Request model for knowledge base search."""
    query: str
    limit: int = 5
    source_type: Optional[str] = None


class SearchResult(BaseModel):
    """Single search result."""
    chunk_id: str
    content: str
    document_title: Optional[str] = None
    source_type: Optional[str] = None
    url: Optional[str] = None
    similarity: float


class SearchResponse(BaseModel):
    """Response model for knowledge base search."""
    results: List[SearchResult]
    query: str


@router.post("/source", response_model=IngestResponse)
async def ingest_source(request: IngestRequest):
    """
    Ingest a document into the knowledge base.

    This endpoint:
    1. Checks for duplicate documents by content hash
    2. Splits content into overlapping chunks
    3. Generates vector embeddings using OpenAI
    4. Stores everything in the database

    Args:
        request: IngestRequest with document details

    Returns:
        IngestResponse with ingestion results
    """
    try:
        result = ingest_document(
            title=request.title,
            source_type=request.source_type,
            content=request.content,
            url=request.url,
            county=request.county
        )

        return IngestResponse(
            status=result["status"],
            document_id=result.get("document_id"),
            chunks_created=result.get("chunks_created"),
            embeddings_stored=result.get("embeddings_stored"),
            reason=result.get("reason")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Search the knowledge base using semantic similarity.

    Uses pgvector cosine similarity search to find relevant chunks.

    Args:
        request: SearchRequest with query and filters

    Returns:
        SearchResponse with matching chunks
    """
    try:
        results = search_knowledge_base(
            query=request.query,
            limit=request.limit,
            source_type=request.source_type
        )

        return SearchResponse(
            results=[SearchResult(**r) for r in results],
            query=request.query
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def ingest_health():
    """Health check for the ingestion service."""
    return {"status": "healthy", "service": "knowledge_base"}

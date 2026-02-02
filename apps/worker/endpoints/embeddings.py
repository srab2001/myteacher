"""
Embeddings endpoints for document vectorization and semantic search.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class EmbeddingRequest(BaseModel):
    """Request model for generating embeddings."""

    text: str
    model: Optional[str] = "text-embedding-3-small"


class EmbeddingResponse(BaseModel):
    """Response model for embeddings."""

    embedding: List[float]
    model: str
    dimensions: int
    token_count: int


class BatchEmbeddingRequest(BaseModel):
    """Request model for batch embedding generation."""

    texts: List[str]
    model: Optional[str] = "text-embedding-3-small"


class SemanticSearchRequest(BaseModel):
    """Request model for semantic search."""

    query: str
    collection: str
    top_k: Optional[int] = 10
    threshold: Optional[float] = 0.7


class DocumentEmbeddingRequest(BaseModel):
    """Request model for document embedding and storage."""

    document_id: str
    text_content: str
    metadata: Optional[dict] = None
    chunk_size: Optional[int] = 1000
    chunk_overlap: Optional[int] = 200


@router.post("/generate", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest):
    """
    Generate an embedding vector for the provided text.

    Uses OpenAI's embedding models.
    """
    try:
        from services.embedding_processor import generate_embedding

        result = await generate_embedding(request.text, request.model)

        return EmbeddingResponse(
            embedding=result["embedding"],
            model=request.model,
            dimensions=len(result["embedding"]),
            token_count=result["token_count"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


@router.post("/batch")
async def batch_generate_embeddings(request: BatchEmbeddingRequest):
    """
    Generate embeddings for multiple texts in batch.
    """
    try:
        from services.embedding_processor import batch_generate_embeddings

        results = await batch_generate_embeddings(request.texts, request.model)
        return {
            "embeddings": results,
            "count": len(results),
            "model": request.model,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch embedding failed: {str(e)}")


@router.post("/store")
async def store_document_embedding(request: DocumentEmbeddingRequest):
    """
    Generate embeddings for a document and store in vector database.

    Chunks the document, generates embeddings, and stores in pgvector.
    """
    try:
        from services.embedding_processor import store_document_embeddings

        result = await store_document_embeddings(
            document_id=request.document_id,
            text_content=request.text_content,
            metadata=request.metadata,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document embedding storage failed: {str(e)}")


@router.post("/search")
async def semantic_search(request: SemanticSearchRequest):
    """
    Perform semantic search across stored document embeddings.
    """
    try:
        from services.embedding_processor import semantic_search

        results = await semantic_search(
            query=request.query,
            collection=request.collection,
            top_k=request.top_k,
            threshold=request.threshold,
        )
        return {"results": results, "query": request.query}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Semantic search failed: {str(e)}")

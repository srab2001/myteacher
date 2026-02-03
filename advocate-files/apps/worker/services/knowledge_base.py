"""
Knowledge Base Service for Maryland Special Education Tools.

Handles ingestion of legal documents (COMAR, IDEA, MSDE bulletins)
and vector embeddings for RAG-based Q&A.
"""

import hashlib
import os
from typing import List, Dict, Any, Optional
import openai
from dotenv import load_dotenv

from db.connection import (
    create_document,
    create_chunk,
    update_chunk_embedding,
    search_similar_chunks
)

load_dotenv()

# Initialize OpenAI client
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200
) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks while preserving sentence boundaries.

    Args:
        text: Text content to chunk
        chunk_size: Target size for each chunk (characters)
        overlap: Overlap between consecutive chunks

    Returns:
        List of chunk dictionaries with content and metadata
    """
    if not text:
        return []

    # Normalize whitespace
    text = " ".join(text.split())

    # Split into sentences (simple approach)
    sentences = []
    current = ""
    for char in text:
        current += char
        if char in ".!?" and len(current) > 10:
            sentences.append(current.strip())
            current = ""
    if current.strip():
        sentences.append(current.strip())

    chunks = []
    current_chunk = ""
    chunk_start = 0

    for i, sentence in enumerate(sentences):
        # If adding this sentence would exceed chunk_size, save current chunk
        if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
            chunks.append({
                "content": current_chunk.strip(),
                "start_sentence": chunk_start,
                "end_sentence": i - 1,
            })

            # Start new chunk with overlap
            overlap_text = ""
            overlap_start = max(0, i - 3)  # Include last few sentences for overlap
            for j in range(overlap_start, i):
                overlap_text += sentences[j] + " "

            current_chunk = overlap_text
            chunk_start = overlap_start

        current_chunk += sentence + " "

    # Add final chunk
    if current_chunk.strip():
        chunks.append({
            "content": current_chunk.strip(),
            "start_sentence": chunk_start,
            "end_sentence": len(sentences) - 1,
        })

    return chunks


def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding for text using OpenAI's text-embedding-3-small model.

    Args:
        text: Text to embed

    Returns:
        List of floats representing the embedding vector
    """
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
        encoding_format="float"
    )
    return response.data[0].embedding


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple texts in a single API call.

    Args:
        texts: List of texts to embed

    Returns:
        List of embedding vectors
    """
    if not texts:
        return []

    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
        encoding_format="float"
    )

    # Sort by index to maintain order
    sorted_data = sorted(response.data, key=lambda x: x.index)
    return [item.embedding for item in sorted_data]


def ingest_document(
    title: str,
    source_type: str,
    content: str,
    url: Optional[str] = None,
    county: Optional[str] = None
) -> Dict[str, Any]:
    """
    Ingest a document into the knowledge base.

    Steps:
    1. Calculate content hash
    2. Check if document already exists
    3. Create document record
    4. Split content into chunks
    5. Store chunks
    6. Generate and store embeddings

    Args:
        title: Document title
        source_type: Type (comar, msde, county_policy, idea, etc.)
        content: Full text content
        url: Source URL (optional)
        county: County name if county-specific (optional)

    Returns:
        Dictionary with ingestion results
    """
    # Calculate content hash
    content_hash = hashlib.sha256(content.encode()).hexdigest()

    # Create document record (returns None if already exists)
    document_id = create_document(
        source_type=source_type,
        title=title,
        content=content,
        content_hash=content_hash,
        county=county,
        url=url
    )

    if document_id is None:
        return {
            "status": "skipped",
            "reason": "Document already exists",
            "content_hash": content_hash
        }

    # Split content into chunks
    chunks = chunk_text(content)

    if not chunks:
        return {
            "status": "error",
            "reason": "No chunks generated",
            "document_id": document_id
        }

    # Store chunks
    chunk_ids = []
    chunk_contents = []

    for i, chunk in enumerate(chunks):
        chunk_id = create_chunk(
            document_id=document_id,
            chunk_index=i,
            content=chunk["content"],
            metadata={
                "start_sentence": chunk.get("start_sentence"),
                "end_sentence": chunk.get("end_sentence"),
            }
        )
        chunk_ids.append(chunk_id)
        chunk_contents.append(chunk["content"])

    # Generate embeddings in batches
    batch_size = 100
    embeddings_stored = 0

    for i in range(0, len(chunk_contents), batch_size):
        batch_contents = chunk_contents[i:i + batch_size]
        batch_ids = chunk_ids[i:i + batch_size]

        try:
            embeddings = generate_embeddings_batch(batch_contents)

            for chunk_id, embedding in zip(batch_ids, embeddings):
                if update_chunk_embedding(chunk_id, embedding):
                    embeddings_stored += 1
        except Exception as e:
            print(f"Error generating embeddings for batch {i}: {e}")

    return {
        "status": "success",
        "document_id": document_id,
        "chunks_created": len(chunk_ids),
        "embeddings_stored": embeddings_stored,
        "content_hash": content_hash
    }


def search_knowledge_base(
    query: str,
    limit: int = 5,
    source_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Search the knowledge base using semantic similarity.

    Args:
        query: Search query
        limit: Maximum number of results
        source_type: Filter by source type (optional)

    Returns:
        List of relevant chunks with metadata
    """
    # Generate embedding for query
    query_embedding = generate_embedding(query)

    # Search similar chunks
    results = search_similar_chunks(
        query_embedding=query_embedding,
        limit=limit,
        source_type=source_type
    )

    # Format results
    formatted_results = []
    for result in results:
        formatted_results.append({
            "chunk_id": str(result["id"]),
            "content": result["content"],
            "document_title": result.get("document_title"),
            "source_type": result.get("source_type"),
            "url": result.get("url"),
            "similarity": result.get("similarity", 0),
        })

    return formatted_results

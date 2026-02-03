"""
Database connection module for the Worker service.

Provides PostgreSQL connection to Neon database with pgvector support.
"""

import os
from typing import Any, Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    """Get a database connection to Neon."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)


def execute_query(
    query: str,
    params: Optional[tuple] = None,
    fetch: bool = True
) -> List[Dict[str, Any]]:
    """
    Execute a SQL query and return results.

    Args:
        query: SQL query string
        params: Query parameters
        fetch: Whether to fetch results

    Returns:
        List of dictionaries representing rows
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            if fetch:
                results = cur.fetchall()
                conn.commit()
                return [dict(row) for row in results]
            conn.commit()
            return []
    finally:
        conn.close()


def execute_update(query: str, params: Optional[tuple] = None) -> int:
    """
    Execute an update/insert query and return affected row count.

    Args:
        query: SQL query string
        params: Query parameters

    Returns:
        Number of affected rows
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()


# Artifact-specific functions

def update_artifact_extraction(
    artifact_id: str,
    extracted_text: str,
    extraction_status: str,
    document_type: Optional[str] = None,
    extraction_error: Optional[str] = None
) -> bool:
    """
    Update an artifact with extraction results.

    Args:
        artifact_id: UUID of the artifact
        extracted_text: Extracted text content
        extraction_status: Status (completed, failed)
        document_type: Identified document type
        extraction_error: Error message if failed

    Returns:
        True if update succeeded
    """
    if document_type:
        query = """
            UPDATE artifacts SET
                extracted_text = %s,
                extraction_status = %s,
                artifact_type = %s,
                extraction_error = %s,
                updated_at = NOW()
            WHERE id = %s
        """
        params = (extracted_text, extraction_status, document_type, extraction_error, artifact_id)
    else:
        query = """
            UPDATE artifacts SET
                extracted_text = %s,
                extraction_status = %s,
                extraction_error = %s,
                updated_at = NOW()
            WHERE id = %s
        """
        params = (extracted_text, extraction_status, extraction_error, artifact_id)

    return execute_update(query, params) > 0


def get_artifact(artifact_id: str) -> Optional[Dict[str, Any]]:
    """Get an artifact by ID."""
    query = "SELECT * FROM artifacts WHERE id = %s"
    results = execute_query(query, (artifact_id,))
    return results[0] if results else None


# Document/Chunk functions for knowledge base

def create_document(
    source_type: str,
    title: str,
    content: str,
    content_hash: str,
    county: Optional[str] = None,
    url: Optional[str] = None
) -> Optional[str]:
    """
    Create a new document in the knowledge base.

    Returns:
        Document ID if created, None if hash already exists
    """
    # Check if document already exists by hash
    existing = execute_query(
        "SELECT id FROM documents WHERE content_hash = %s",
        (content_hash,)
    )
    if existing:
        return None

    query = """
        INSERT INTO documents (source_type, title, content, content_hash, county, url)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    result = execute_query(
        query,
        (source_type, title, content, content_hash, county, url),
        fetch=True
    )
    return str(result[0]["id"]) if result else None


def create_chunk(
    document_id: str,
    chunk_index: int,
    content: str,
    metadata: Optional[Dict] = None
) -> str:
    """
    Create a new chunk for a document.

    Returns:
        Chunk ID
    """
    import json

    query = """
        INSERT INTO chunks (document_id, chunk_index, content, metadata)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """
    result = execute_query(
        query,
        (document_id, chunk_index, content, json.dumps(metadata) if metadata else None)
    )
    return str(result[0]["id"])


def update_chunk_embedding(chunk_id: str, embedding: List[float]) -> bool:
    """Update a chunk with its vector embedding."""
    # Convert list to pgvector format
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

    query = """
        UPDATE chunks SET embedding = %s::vector WHERE id = %s
    """
    return execute_update(query, (embedding_str, chunk_id)) > 0


def search_similar_chunks(
    query_embedding: List[float],
    limit: int = 5,
    source_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Search for similar chunks using cosine similarity.

    Args:
        query_embedding: Query vector embedding
        limit: Maximum number of results
        source_type: Filter by document source type

    Returns:
        List of chunks with similarity scores
    """
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    if source_type:
        query = """
            SELECT c.*, d.title as document_title, d.source_type, d.url,
                   1 - (c.embedding <=> %s::vector) as similarity
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE d.source_type = %s
            ORDER BY c.embedding <=> %s::vector
            LIMIT %s
        """
        params = (embedding_str, source_type, embedding_str, limit)
    else:
        query = """
            SELECT c.*, d.title as document_title, d.source_type, d.url,
                   1 - (c.embedding <=> %s::vector) as similarity
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            ORDER BY c.embedding <=> %s::vector
            LIMIT %s
        """
        params = (embedding_str, embedding_str, limit)

    return execute_query(query, params)


# Review functions

def create_review(
    artifact_id: str,
    review_type: str,
    findings: Dict[str, Any],
    summary: Optional[str] = None,
    score: Optional[float] = None
) -> str:
    """
    Create a new review record.

    Returns:
        Review ID
    """
    import json

    query = """
        INSERT INTO reviews (artifact_id, review_type, findings, summary, score)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """
    result = execute_query(
        query,
        (artifact_id, review_type, json.dumps(findings), summary, score)
    )
    return str(result[0]["id"])


def get_review(review_id: str) -> Optional[Dict[str, Any]]:
    """Get a review by ID."""
    query = "SELECT * FROM reviews WHERE id = %s"
    results = execute_query(query, (review_id,))
    return results[0] if results else None

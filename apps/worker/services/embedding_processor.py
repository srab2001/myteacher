"""
Embedding processing service using OpenAI and pgvector.
"""

import os
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI


# Initialize OpenAI client
def get_openai_client():
    return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def generate_embedding(
    text: str, model: str = "text-embedding-3-small"
) -> Dict[str, Any]:
    """
    Generate an embedding vector for the provided text.

    Args:
        text: Text to embed
        model: OpenAI embedding model to use

    Returns:
        Dictionary with embedding vector and token count
    """
    client = get_openai_client()

    response = await client.embeddings.create(input=text, model=model)

    return {
        "embedding": response.data[0].embedding,
        "token_count": response.usage.total_tokens,
    }


async def batch_generate_embeddings(
    texts: List[str], model: str = "text-embedding-3-small"
) -> List[Dict[str, Any]]:
    """
    Generate embeddings for multiple texts in batch.

    Args:
        texts: List of texts to embed
        model: OpenAI embedding model to use

    Returns:
        List of embedding results
    """
    client = get_openai_client()

    response = await client.embeddings.create(input=texts, model=model)

    return [
        {
            "embedding": data.embedding,
            "index": data.index,
        }
        for data in response.data
    ]


def chunk_text(
    text: str, chunk_size: int = 1000, chunk_overlap: int = 200
) -> List[str]:
    """
    Split text into overlapping chunks for embedding.

    Args:
        text: Text to chunk
        chunk_size: Maximum size of each chunk
        chunk_overlap: Number of characters to overlap between chunks

    Returns:
        List of text chunks
    """
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        # Try to break at a sentence or word boundary
        if end < len(text):
            # Look for a period, newline, or space near the end
            for delimiter in [".\n", "\n", ". ", " "]:
                last_delimiter = text.rfind(delimiter, start + chunk_size // 2, end)
                if last_delimiter != -1:
                    end = last_delimiter + len(delimiter)
                    break

        chunks.append(text[start:end].strip())
        start = end - chunk_overlap

    return chunks


async def store_document_embeddings(
    document_id: str,
    text_content: str,
    metadata: Optional[dict] = None,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> Dict[str, Any]:
    """
    Generate embeddings for a document and store in vector database.

    Args:
        document_id: Unique identifier for the document
        text_content: Full text content of the document
        metadata: Optional metadata to store with embeddings
        chunk_size: Size of text chunks
        chunk_overlap: Overlap between chunks

    Returns:
        Dictionary with storage results
    """
    import psycopg2
    from pgvector.psycopg2 import register_vector

    # Chunk the document
    chunks = chunk_text(text_content, chunk_size, chunk_overlap)

    # Generate embeddings for all chunks
    embeddings = await batch_generate_embeddings(chunks)

    # Store in database
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    register_vector(conn)

    try:
        with conn.cursor() as cur:
            for i, (chunk, emb_data) in enumerate(zip(chunks, embeddings)):
                cur.execute(
                    """
                    INSERT INTO document_embeddings
                    (document_id, chunk_index, chunk_text, embedding, metadata)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        document_id,
                        i,
                        chunk,
                        emb_data["embedding"],
                        metadata,
                    ),
                )
            conn.commit()
    finally:
        conn.close()

    return {
        "document_id": document_id,
        "chunks_stored": len(chunks),
        "status": "success",
    }


async def semantic_search(
    query: str,
    collection: str,
    top_k: int = 10,
    threshold: float = 0.7,
) -> List[Dict[str, Any]]:
    """
    Perform semantic search across stored document embeddings.

    Args:
        query: Search query text
        collection: Collection/table to search
        top_k: Number of results to return
        threshold: Minimum similarity threshold

    Returns:
        List of matching documents with similarity scores
    """
    import psycopg2
    from pgvector.psycopg2 import register_vector

    # Generate embedding for query
    query_embedding = await generate_embedding(query)

    # Search in database
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    register_vector(conn)

    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    document_id,
                    chunk_index,
                    chunk_text,
                    1 - (embedding <=> %s) as similarity
                FROM document_embeddings
                WHERE 1 - (embedding <=> %s) > %s
                ORDER BY embedding <=> %s
                LIMIT %s
                """,
                (
                    query_embedding["embedding"],
                    query_embedding["embedding"],
                    threshold,
                    query_embedding["embedding"],
                    top_k,
                ),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {
            "document_id": row[0],
            "chunk_index": row[1],
            "text": row[2],
            "similarity": float(row[3]),
        }
        for row in rows
    ]

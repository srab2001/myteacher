/**
 * Admin Documents API
 * GET /api/admin/documents - List all knowledge base documents
 * POST /api/admin/documents - Create document from text content
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { Document, DocumentSourceType } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get('source_type');

    let queryText: string;
    let params: unknown[];

    if (sourceType) {
      queryText = `
        SELECT d.*,
               COUNT(c.id) as chunk_count,
               COUNT(c.embedding) as embedding_count
        FROM documents d
        LEFT JOIN chunks c ON c.document_id = d.id
        WHERE d.source_type = $1
        GROUP BY d.id
        ORDER BY d.created_at DESC
      `;
      params = [sourceType];
    } else {
      queryText = `
        SELECT d.*,
               COUNT(c.id) as chunk_count,
               COUNT(c.embedding) as embedding_count
        FROM documents d
        LEFT JOIN chunks c ON c.document_id = d.id
        GROUP BY d.id
        ORDER BY d.created_at DESC
      `;
      params = [];
    }

    const documents = await query<Document & { chunk_count: number; embedding_count: number }>(
      queryText,
      params
    );

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}

interface CreateDocumentRequest {
  title: string;
  source_type: DocumentSourceType;
  content: string;
  url?: string;
  county?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateDocumentRequest = await request.json();

    if (!body.title || !body.source_type || !body.content) {
      return NextResponse.json(
        { error: 'title, source_type, and content are required' },
        { status: 400 }
      );
    }

    const workerUrl = process.env.WORKER_API_URL || 'http://localhost:8000';

    // Send to worker for chunking and embedding
    const response = await fetch(`${workerUrl}/api/ingest/source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: body.title,
        source_type: body.source_type,
        content: body.content,
        url: body.url || null,
        county: body.county || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Worker returned ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create document' },
      { status: 500 }
    );
  }
}

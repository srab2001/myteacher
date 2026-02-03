/**
 * Admin Document Detail API
 * GET /api/admin/documents/[id] - Get document with chunks
 * DELETE /api/admin/documents/[id] - Delete document and its chunks
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const documents = await query<Record<string, unknown>>(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const chunks = await query<Record<string, unknown>>(
      `SELECT id, chunk_index, content, metadata,
              CASE WHEN embedding IS NOT NULL THEN true ELSE false END as has_embedding,
              created_at
       FROM chunks
       WHERE document_id = $1
       ORDER BY chunk_index`,
      [id]
    );

    return NextResponse.json({
      document: documents[0],
      chunks,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Delete chunks first (FK constraint)
    await query('DELETE FROM chunks WHERE document_id = $1', [id]);

    // Delete document
    const result = await query<{ id: string }>(
      'DELETE FROM documents WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

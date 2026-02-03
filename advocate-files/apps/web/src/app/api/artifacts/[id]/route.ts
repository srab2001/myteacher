/**
 * Single Artifact API Routes
 * GET /api/artifacts/[id] - Get artifact details
 * DELETE /api/artifacts/[id] - Delete artifact
 */

import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { query } from '@/lib/db/client';
import { Artifact } from '@/lib/db/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await query<Artifact>(
      'SELECT * FROM artifacts WHERE id = $1',
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching artifact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artifact' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get artifact to get blob URL
    const result = await query<Artifact>(
      'SELECT * FROM artifacts WHERE id = $1',
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    const artifact = result[0];

    // Delete from Vercel Blob
    try {
      await del(artifact.blob_url);
    } catch (blobError) {
      console.error('Error deleting blob:', blobError);
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from database
    await query('DELETE FROM artifacts WHERE id = $1', [id]);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting artifact:', error);
    return NextResponse.json(
      { error: 'Failed to delete artifact' },
      { status: 500 }
    );
  }
}

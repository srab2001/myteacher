/**
 * Single Review API Route
 * GET /api/reviews/[id] - Get review details
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const reviews = await query<{
      id: string;
      artifact_id: string;
      review_type: string;
      findings: Record<string, unknown>;
      summary: string | null;
      score: number | null;
      created_at: Date;
    }>(
      `SELECT r.*, a.file_name, a.artifact_type
       FROM reviews r
       JOIN artifacts a ON r.artifact_id = a.id
       WHERE r.id = $1`,
      [id]
    );

    if (reviews.length === 0) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(reviews[0]);
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

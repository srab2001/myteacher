/**
 * Case Artifacts API Routes
 * GET /api/cases/[id]/artifacts - List all artifacts for a case
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { Artifact } from '@/lib/db/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: caseId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const artifactType = searchParams.get('type');

    let queryText = `
      SELECT * FROM artifacts
      WHERE case_id = $1
    `;
    const queryParams: unknown[] = [caseId];

    if (artifactType) {
      queryText += ' AND artifact_type = $2';
      queryParams.push(artifactType);
    }

    queryText += ' ORDER BY uploaded_at DESC';

    const artifacts = await query<Artifact>(queryText, queryParams);

    // Group by type for summary
    const summary = {
      total: artifacts.length,
      by_type: artifacts.reduce((acc, a) => {
        acc[a.artifact_type] = (acc[a.artifact_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      pending_extraction: artifacts.filter(a => a.extraction_status === 'pending').length,
      processing: artifacts.filter(a => a.extraction_status === 'processing').length,
      completed: artifacts.filter(a => a.extraction_status === 'completed').length,
      failed: artifacts.filter(a => a.extraction_status === 'failed').length,
    };

    return NextResponse.json({ artifacts, summary });
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artifacts' },
      { status: 500 }
    );
  }
}

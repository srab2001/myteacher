/**
 * Review Run API Route
 * POST /api/reviews/run - Trigger AI review on an artifact
 */

import { NextRequest, NextResponse } from 'next/server';

interface ReviewRunRequest {
  artifact_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReviewRunRequest = await request.json();

    if (!body.artifact_id) {
      return NextResponse.json(
        { error: 'artifact_id is required' },
        { status: 400 }
      );
    }

    const workerUrl = process.env.WORKER_API_URL || 'http://localhost:8000';

    const response = await fetch(`${workerUrl}/api/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artifact_id: body.artifact_id }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Worker review failed');
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run review' },
      { status: 500 }
    );
  }
}

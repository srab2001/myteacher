/**
 * Artifact Upload API
 * POST /api/artifacts/upload - Initialize upload and get presigned URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { query } from '@/lib/db/client';
import { Artifact, ArtifactType } from '@/lib/db/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caseId = formData.get('case_id') as string;
    const artifactType = (formData.get('artifact_type') as ArtifactType) || 'other';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!caseId) {
      return NextResponse.json(
        { error: 'case_id is required' },
        { status: 400 }
      );
    }

    // Validate file type (only PDFs for now)
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and image files are allowed' },
        { status: 400 }
      );
    }

    // Max file size: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `artifacts/${caseId}/${timestamp}-${safeName}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Create artifact record in database
    const result = await query<Artifact>(
      `INSERT INTO artifacts (
        case_id, artifact_type, file_name, blob_url,
        mime_type, file_size_bytes, extraction_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        caseId,
        artifactType,
        file.name,
        blob.url,
        file.type,
        file.size,
        'pending',
      ]
    );

    const artifact = result[0];

    // Trigger extraction worker (async)
    triggerExtraction(artifact.id, blob.url).catch(console.error);

    return NextResponse.json({
      artifact,
      blob_url: blob.url,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading artifact:', error);
    return NextResponse.json(
      { error: 'Failed to upload artifact' },
      { status: 500 }
    );
  }
}

async function triggerExtraction(artifactId: string, blobUrl: string) {
  const workerUrl = process.env.WORKER_API_URL || 'http://localhost:8000';

  try {
    // Update status to processing
    await query(
      `UPDATE artifacts SET extraction_status = 'processing' WHERE id = $1`,
      [artifactId]
    );

    const response = await fetch(`${workerUrl}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifact_id: artifactId,
        blob_url: blobUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }

    const result = await response.json();

    // Update artifact with extraction results
    await query(
      `UPDATE artifacts SET
        extracted_text = $1,
        extraction_status = $2,
        artifact_type = COALESCE($3, artifact_type)
      WHERE id = $4`,
      [
        result.text || '',
        result.status || 'completed',
        result.document_type,
        artifactId,
      ]
    );
  } catch (error) {
    console.error('Extraction failed:', error);
    await query(
      `UPDATE artifacts SET
        extraction_status = 'failed',
        extraction_error = $1
      WHERE id = $2`,
      [error instanceof Error ? error.message : 'Unknown error', artifactId]
    );
  }
}

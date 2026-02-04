/**
 * Admin Document Parse API
 * POST /api/admin/documents/parse - Upload a PDF, extract text, return preview (no ingestion)
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, TXT, and MD files are supported for parsing' },
        { status: 400 }
      );
    }

    // Max file size: 25MB
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 25MB' },
        { status: 400 }
      );
    }

    // For text files, just read and return the content directly
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      const content = await file.text();
      return NextResponse.json({
        status: 'success',
        file_name: file.name,
        file_size: file.size,
        extracted_text: content,
        page_count: 1,
        text_length: content.length,
        extraction_method: 'direct_text',
        document_type: 'unknown',
      });
    }

    // For PDFs: upload to Vercel Blob, then send to worker for extraction
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `parse-temp/${timestamp}-${safeName}`;

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    const workerUrl = process.env.WORKER_API_URL || 'http://localhost:8000';

    // Use the /extract-url endpoint which doesn't require artifact_id
    const extractResponse = await fetch(
      `${workerUrl}/extract-url?blob_url=${encodeURIComponent(blob.url)}`,
      { method: 'POST' }
    );

    if (!extractResponse.ok) {
      const errorData = await extractResponse.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Worker extraction failed: ${extractResponse.status}`
      );
    }

    const extractResult = await extractResponse.json();

    return NextResponse.json({
      status: 'success',
      file_name: file.name,
      file_size: file.size,
      blob_url: blob.url,
      extracted_text: extractResult.text || '',
      page_count: extractResult.page_count || 0,
      text_length: extractResult.text_length || (extractResult.text || '').length,
      extraction_method: extractResult.extraction_method || 'unknown',
      document_type: extractResult.document_type || 'unknown',
    });
  } catch (error) {
    console.error('Error parsing document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse document' },
      { status: 500 }
    );
  }
}

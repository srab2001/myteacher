/**
 * Admin Document Upload API
 * POST /api/admin/documents/upload - Upload a PDF/text file, extract text, and ingest into knowledge base
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { DocumentSourceType } from '@/lib/db/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const sourceType = formData.get('source_type') as DocumentSourceType;
    const url = formData.get('url') as string | null;
    const county = formData.get('county') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!title || !sourceType) {
      return NextResponse.json(
        { error: 'title and source_type are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, TXT, MD, and DOCX files are allowed' },
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

    const workerUrl = process.env.WORKER_API_URL || 'http://localhost:8000';

    // For text files, read content directly and ingest
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      const content = await file.text();

      const ingestResponse = await fetch(`${workerUrl}/api/ingest/source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          source_type: sourceType,
          content,
          url: url || null,
          county: county || null,
        }),
      });

      if (!ingestResponse.ok) {
        const errorData = await ingestResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Worker returned ${ingestResponse.status}`);
      }

      const result = await ingestResponse.json();
      return NextResponse.json({
        ...result,
        file_name: file.name,
        extraction_method: 'direct_text',
      }, { status: 201 });
    }

    // For PDF/DOCX files, upload to blob storage and send to worker for extraction
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `knowledge-base/${sourceType}/${timestamp}-${safeName}`;

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Send to worker for PDF extraction
    const extractResponse = await fetch(`${workerUrl}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blob_url: blob.url,
        file_name: file.name,
      }),
    });

    if (!extractResponse.ok) {
      const errorData = await extractResponse.json().catch(() => ({}));
      throw new Error(errorData.detail || `Extraction failed: ${extractResponse.status}`);
    }

    const extractResult = await extractResponse.json();
    const extractedText = extractResult.text || extractResult.extracted_text || '';

    if (!extractedText) {
      return NextResponse.json({
        status: 'error',
        reason: 'No text could be extracted from the file',
        blob_url: blob.url,
        file_name: file.name,
      }, { status: 422 });
    }

    // Ingest extracted text into knowledge base
    const ingestResponse = await fetch(`${workerUrl}/api/ingest/source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        source_type: sourceType,
        content: extractedText,
        url: url || blob.url,
        county: county || null,
      }),
    });

    if (!ingestResponse.ok) {
      const errorData = await ingestResponse.json().catch(() => ({}));
      throw new Error(errorData.detail || `Ingestion failed: ${ingestResponse.status}`);
    }

    const ingestResult = await ingestResponse.json();

    return NextResponse.json({
      ...ingestResult,
      file_name: file.name,
      blob_url: blob.url,
      extraction_method: 'worker_extraction',
      extracted_length: extractedText.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  }
}

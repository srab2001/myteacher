import fs from 'fs';
import path from 'path';
import { prisma, PlanTypeCode, IngestionStatus } from '../lib/db.js';

// Section tag patterns for different plan types
const SECTION_PATTERNS: Record<string, { pattern: RegExp; tag: string }[]> = {
  IEP: [
    { pattern: /present\s*level/i, tag: 'present_levels' },
    { pattern: /academic\s*(achievement|performance)/i, tag: 'present_levels_academic' },
    { pattern: /functional\s*performance/i, tag: 'present_levels_functional' },
    { pattern: /annual\s*goal/i, tag: 'goals' },
    { pattern: /reading\s*(goal|objective)/i, tag: 'goals_reading' },
    { pattern: /math\s*(goal|objective)/i, tag: 'goals_math' },
    { pattern: /writing\s*(goal|objective)/i, tag: 'goals_writing' },
    { pattern: /communication\s*(goal|objective)/i, tag: 'goals_communication' },
    { pattern: /social[\s-]*emotional/i, tag: 'goals_social_emotional' },
    { pattern: /behavior\s*(goal|objective)/i, tag: 'goals_behavior' },
    { pattern: /short[\s-]*term\s*objective/i, tag: 'objectives' },
    { pattern: /benchmark/i, tag: 'objectives' },
    { pattern: /accommodation/i, tag: 'accommodations' },
    { pattern: /modification/i, tag: 'modifications' },
    { pattern: /special\s*education\s*service/i, tag: 'services' },
    { pattern: /related\s*service/i, tag: 'services_related' },
    { pattern: /supplementary\s*aid/i, tag: 'supplementary_aids' },
    { pattern: /least\s*restrictive/i, tag: 'placement_lre' },
    { pattern: /educational\s*placement/i, tag: 'placement' },
    { pattern: /transition/i, tag: 'transition' },
    { pattern: /extended\s*school\s*year/i, tag: 'esy' },
    { pattern: /parent\s*concern/i, tag: 'parent_concerns' },
  ],
  FIVE_OH_FOUR: [
    { pattern: /disability\s*description/i, tag: 'disability' },
    { pattern: /major\s*life\s*activit/i, tag: 'major_life_activities' },
    { pattern: /accommodation/i, tag: 'accommodations' },
    { pattern: /classroom\s*accommodation/i, tag: 'accommodations_classroom' },
    { pattern: /testing\s*accommodation/i, tag: 'accommodations_testing' },
    { pattern: /physical\s*accommodation/i, tag: 'accommodations_physical' },
    { pattern: /health\s*plan/i, tag: 'health_plan' },
    { pattern: /emergency/i, tag: 'emergency_plan' },
    { pattern: /medication/i, tag: 'medication' },
    { pattern: /review\s*date/i, tag: 'review' },
  ],
  BEHAVIOR_PLAN: [
    { pattern: /target\s*behavior/i, tag: 'target_behavior' },
    { pattern: /problem\s*behavior/i, tag: 'target_behavior' },
    { pattern: /behavior\s*description/i, tag: 'target_behavior' },
    { pattern: /function\s*(of|analysis)/i, tag: 'function_analysis' },
    { pattern: /antecedent/i, tag: 'antecedents' },
    { pattern: /trigger/i, tag: 'antecedents' },
    { pattern: /consequence/i, tag: 'consequences' },
    { pattern: /replacement\s*behavior/i, tag: 'replacement_behavior' },
    { pattern: /alternative\s*behavior/i, tag: 'replacement_behavior' },
    { pattern: /prevention\s*strateg/i, tag: 'prevention_strategies' },
    { pattern: /teaching\s*strateg/i, tag: 'teaching_strategies' },
    { pattern: /response\s*(plan|strateg)/i, tag: 'response_strategies' },
    { pattern: /reinforcement/i, tag: 'reinforcement' },
    { pattern: /crisis/i, tag: 'crisis_plan' },
    { pattern: /de-?escalation/i, tag: 'deescalation' },
    { pattern: /data\s*collection/i, tag: 'data_collection' },
    { pattern: /progress\s*monitor/i, tag: 'progress_monitoring' },
  ],
};

// Chunk size configuration
const CHUNK_SIZE = 1500; // Target characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks

/**
 * Extract text from a file based on its type
 */
async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8');
  }

  if (ext === '.pdf') {
    // Dynamic import for pdf-parse
    try {
      const pdfModule = await import('pdf-parse') as any;
      const pdfParse = (pdfModule.default || pdfModule) as (buffer: Buffer) => Promise<{ text: string }>;
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file. Ensure pdf-parse is installed.');
    }
  }

  if (ext === '.docx' || ext === '.doc') {
    // Dynamic import for mammoth
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error('Failed to parse DOCX file. Ensure mammoth is installed.');
    }
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Split text into overlapping chunks
 */
function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Start new chunk with overlap from end of previous
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 7)); // Approximate word count
      currentChunk = overlapWords.join(' ') + '\n\n' + trimmed;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Detect section tag for a chunk based on its content
 */
function detectSectionTag(text: string, planTypeCode: string): string | null {
  const patterns = SECTION_PATTERNS[planTypeCode] ?? SECTION_PATTERNS.IEP ?? [];

  for (const { pattern, tag } of patterns) {
    if (pattern.test(text)) {
      return tag;
    }
  }

  return null;
}

/**
 * Process a best practice document: extract text, chunk, tag, and store
 */
export async function ingestBestPracticeDocument(documentId: string): Promise<void> {
  // Get document details
  const doc = await prisma.bestPracticeDocument.findUnique({
    where: { id: documentId },
    include: {
      planType: true,
    },
  });

  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }

  // Update status to processing
  await prisma.bestPracticeDocument.update({
    where: { id: documentId },
    data: {
      ingestionStatus: 'PROCESSING',
      ingestionMessage: null,
    },
  });

  try {
    // Build file path
    const uploadDir = process.env.UPLOAD_DIR
      ? `${process.env.UPLOAD_DIR}/best-practices`
      : './uploads/best-practices';
    const filePath = path.join(uploadDir, doc.fileUrl);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Extract text from document
    const text = await extractText(filePath);

    if (!text || text.trim().length === 0) {
      throw new Error('No text content extracted from document');
    }

    // Delete existing chunks for this document
    await prisma.bestPracticeChunk.deleteMany({
      where: { bestPracticeDocumentId: documentId },
    });

    // Split into chunks
    const chunks = splitIntoChunks(text);

    // Create chunk records
    const chunkRecords = chunks.map((chunkText, index) => ({
      bestPracticeDocumentId: documentId,
      sequence: index,
      text: chunkText,
      sectionTag: detectSectionTag(chunkText, doc.planType.code),
      planTypeCode: doc.planType.code,
      jurisdictionId: doc.jurisdictionId,
      gradeBand: doc.gradeBand,
    }));

    // Insert chunks in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE);
      await prisma.bestPracticeChunk.createMany({
        data: batch,
      });
    }

    // Update document with success status
    await prisma.bestPracticeDocument.update({
      where: { id: documentId },
      data: {
        ingestionStatus: 'COMPLETE',
        ingestionMessage: `Successfully extracted ${chunks.length} chunks`,
        ingestionAt: new Date(),
      },
    });

    console.log(`Ingestion complete for document ${documentId}: ${chunks.length} chunks created`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Update document with error status
    await prisma.bestPracticeDocument.update({
      where: { id: documentId },
      data: {
        ingestionStatus: 'ERROR',
        ingestionMessage: message,
        ingestionAt: new Date(),
      },
    });

    console.error(`Ingestion failed for document ${documentId}:`, message);
    throw error;
  }
}

/**
 * Get chunk statistics for a document
 */
export async function getDocumentChunkStats(documentId: string): Promise<{
  totalChunks: number;
  bySection: Record<string, number>;
}> {
  const chunks = await prisma.bestPracticeChunk.groupBy({
    by: ['sectionTag'],
    where: { bestPracticeDocumentId: documentId },
    _count: true,
  });

  const bySection: Record<string, number> = {};
  let totalChunks = 0;

  for (const chunk of chunks) {
    const tag = chunk.sectionTag || 'untagged';
    bySection[tag] = chunk._count;
    totalChunks += chunk._count;
  }

  return { totalChunks, bySection };
}

/**
 * Query chunks for content generation
 */
export async function queryChunksForGeneration(params: {
  planTypeCode: string;
  sectionTag: string;
  jurisdictionId?: string;
  gradeBand?: string;
  limit?: number;
}): Promise<Array<{ id: string; text: string; sectionTag: string | null; gradeBand: string | null }>> {
  const { planTypeCode, sectionTag, jurisdictionId, gradeBand, limit = 5 } = params;

  // Try to find chunks matching all criteria
  let chunks = await prisma.bestPracticeChunk.findMany({
    where: {
      planTypeCode,
      sectionTag,
      jurisdictionId: jurisdictionId || undefined,
      gradeBand: gradeBand || undefined,
      document: {
        isActive: true,
        ingestionStatus: 'COMPLETE',
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      text: true,
      sectionTag: true,
      gradeBand: true,
    },
  });

  // Fallback: if no exact match, try without jurisdiction filter
  if (chunks.length === 0 && jurisdictionId) {
    chunks = await prisma.bestPracticeChunk.findMany({
      where: {
        planTypeCode,
        sectionTag,
        gradeBand: gradeBand || undefined,
        document: {
          isActive: true,
          ingestionStatus: 'COMPLETE',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        text: true,
        sectionTag: true,
        gradeBand: true,
      },
    });
  }

  // Fallback: if still no match, try without grade band filter
  if (chunks.length === 0 && gradeBand) {
    chunks = await prisma.bestPracticeChunk.findMany({
      where: {
        planTypeCode,
        sectionTag,
        document: {
          isActive: true,
          ingestionStatus: 'COMPLETE',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        text: true,
        sectionTag: true,
        gradeBand: true,
      },
    });
  }

  return chunks;
}

/**
 * Get available section tags for a plan type
 */
export function getSectionTagsForPlanType(planTypeCode: string): string[] {
  const patterns = SECTION_PATTERNS[planTypeCode] ?? SECTION_PATTERNS.IEP ?? [];
  const tags = new Set<string>();

  for (const { tag } of patterns) {
    tags.add(tag);
  }

  return Array.from(tags).sort();
}

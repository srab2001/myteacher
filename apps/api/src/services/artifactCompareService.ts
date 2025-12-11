// Artifact Compare Service
// Handles ChatGPT-based comparison of baseline and student artifacts

import OpenAI from 'openai';
import mammoth from 'mammoth';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Lazy-load PDF parser to avoid initialization issues in serverless
async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  // Use pdf-parse with custom options to avoid DOM requirements
  const pdfParse = (await import('pdf-parse')).default;

  // Custom page render function that doesn't require canvas
  const options = {
    // Return raw text content
    pagerender: function(pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) {
      return pageData.getTextContent().then(function(textContent) {
        let text = '';
        for (const item of textContent.items) {
          text += item.str + ' ';
        }
        return text;
      });
    }
  };

  try {
    const data = await pdfParse(buffer, options);
    return data.text || '';
  } catch (error) {
    console.error('pdf-parse error:', error);
    throw error;
  }
}

// Supported image MIME types for GPT-4 Vision
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Check if a MIME type is an image that can be sent to GPT-4 Vision
 */
export function isImageMimeType(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Convert image buffer to base64 data URL for GPT-4 Vision
 */
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

interface CompareArtifactsParams {
  studentName: string;
  planTypeCode: string;
  artifactDate: string;
  description?: string | null;
  baselineText: string;
  compareText: string;
}

interface CompareArtifactsWithImagesParams {
  studentName: string;
  planTypeCode: string;
  artifactDate: string;
  description?: string | null;
  baselineContent: { type: 'text'; text: string } | { type: 'image'; buffer: Buffer; mimeType: string };
  compareContent: { type: 'text'; text: string } | { type: 'image'; buffer: Buffer; mimeType: string };
}

/**
 * Compare two artifacts using ChatGPT API
 */
export async function compareArtifacts({
  studentName,
  planTypeCode,
  artifactDate,
  description,
  baselineText,
  compareText,
}: CompareArtifactsParams): Promise<string> {
  const systemPrompt = `
You compare two artifacts for a student.

Baseline artifact: what the work should look like.
Compare artifact: what the student produced.

Produce a clear comparison that covers:
- where the student work matches the baseline
- where the student work does not match the baseline
- specific strengths in the student work
- specific gaps or errors in the student work
- short, concrete suggestions for next steps.

Use only information from the two artifacts.
Do not invent content that is not present in the artifacts.
Format your response with clear sections and bullet points for readability.
`;

  const userPrompt = `
Student: ${studentName}
Plan type: ${planTypeCode}
Artifact date: ${artifactDate}
Description: ${description ?? 'No description provided'}

=== BASELINE ARTIFACT ===
${baselineText}

=== STUDENT ARTIFACT ===
${compareText}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const analysis = response.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error('No response from ChatGPT');
    }

    return analysis;
  } catch (error) {
    console.error('ChatGPT API error:', error);
    throw new Error('Failed to compare artifacts using AI');
  }
}

/**
 * Compare two artifacts using GPT-4 Vision (supports both text and images)
 */
export async function compareArtifactsWithImages({
  studentName,
  planTypeCode,
  artifactDate,
  description,
  baselineContent,
  compareContent,
}: CompareArtifactsWithImagesParams): Promise<string> {
  const systemPrompt = `
You compare two artifacts for a student.

Baseline artifact: what the work should look like.
Compare artifact: what the student produced.

Produce a clear comparison that covers:
- where the student work matches the baseline
- where the student work does not match the baseline
- specific strengths in the student work
- specific gaps or errors in the student work
- short, concrete suggestions for next steps.

Use only information from the two artifacts.
Do not invent content that is not present in the artifacts.
Format your response with clear sections and bullet points for readability.
`;

  // Build the user message content array for GPT-4 Vision
  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

  const userContent: ContentPart[] = [
    {
      type: 'text',
      text: `Student: ${studentName}
Plan type: ${planTypeCode}
Artifact date: ${artifactDate}
Description: ${description ?? 'No description provided'}

=== BASELINE ARTIFACT ===`
    }
  ];

  // Add baseline content
  if (baselineContent.type === 'text') {
    userContent.push({ type: 'text', text: baselineContent.text });
  } else {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: bufferToDataUrl(baselineContent.buffer, baselineContent.mimeType),
        detail: 'high'
      }
    });
  }

  userContent.push({ type: 'text', text: '\n=== STUDENT ARTIFACT ===' });

  // Add compare content
  if (compareContent.type === 'text') {
    userContent.push({ type: 'text', text: compareContent.text });
  } else {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: bufferToDataUrl(compareContent.buffer, compareContent.mimeType),
        detail: 'high'
      }
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Use gpt-4o for vision capabilities
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const analysis = response.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error('No response from ChatGPT');
    }

    return analysis;
  } catch (error) {
    console.error('ChatGPT Vision API error:', error);
    throw new Error('Failed to compare artifacts using AI');
  }
}

/**
 * Extract text from a file buffer based on its MIME type
 */
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const lowerMime = mimeType.toLowerCase();
  const lowerName = fileName.toLowerCase();

  // PDF files
  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    try {
      const text = await parsePdfBuffer(buffer);
      return text || '';
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  // DOCX files
  if (
    lowerMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  // DOC files (older Word format)
  if (lowerMime === 'application/msword' || lowerName.endsWith('.doc')) {
    // mammoth doesn't support .doc, but we'll try anyway
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error) {
      console.error('DOC parsing error:', error);
      throw new Error('Failed to extract text from DOC file. Please convert to DOCX.');
    }
  }

  // Plain text files
  if (
    lowerMime.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md')
  ) {
    return buffer.toString('utf-8');
  }

  // RTF files
  if (lowerMime === 'application/rtf' || lowerName.endsWith('.rtf')) {
    // Basic RTF to text conversion - remove RTF commands
    const rtfText = buffer.toString('utf-8');
    // Simple RTF stripping (not perfect but handles basic cases)
    const stripped = rtfText
      .replace(/\\[a-z]+\d* ?/gi, '')
      .replace(/[{}]/g, '')
      .replace(/\\'[0-9a-f]{2}/gi, '')
      .trim();
    return stripped;
  }

  // Unsupported format - return raw text attempt
  console.warn(`Unsupported file type: ${mimeType} (${fileName}). Attempting raw text extraction.`);
  return buffer.toString('utf-8');
}

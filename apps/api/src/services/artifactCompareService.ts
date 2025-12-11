// Artifact Compare Service
// Handles ChatGPT-based comparison of baseline and student artifacts

import OpenAI from 'openai';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface CompareArtifactsParams {
  studentName: string;
  planTypeCode: string;
  artifactDate: string;
  description?: string | null;
  baselineText: string;
  compareText: string;
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
      const text = await new Promise<string>((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on('pdfParser_dataReady', (pdfData) => {
          // Extract text from all pages
          const pages = pdfData.Pages || [];
          const textParts: string[] = [];

          for (const page of pages) {
            const texts = page.Texts || [];
            for (const textItem of texts) {
              const runs = textItem.R || [];
              for (const run of runs) {
                if (run.T) {
                  // Decode URI-encoded text
                  textParts.push(decodeURIComponent(run.T));
                }
              }
            }
            textParts.push('\n'); // Page break
          }

          resolve(textParts.join(' ').trim());
        });

        pdfParser.on('pdfParser_dataError', (errData) => {
          reject(new Error(errData.parserError?.toString() || 'PDF parsing failed'));
        });

        pdfParser.parseBuffer(buffer);
      });

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

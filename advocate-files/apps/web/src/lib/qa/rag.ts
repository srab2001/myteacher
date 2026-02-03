/**
 * RAG (Retrieval-Augmented Generation) utilities for Maryland Q&A
 */

export interface SearchContext {
  chunk_id: string;
  content: string;
  document_title: string | null;
  source_type: string | null;
  url: string | null;
  similarity: number;
}

export interface Citation {
  id: number;
  title: string;
  source_type: string;
  url?: string;
  excerpt: string;
}

/**
 * Build the prompt for the Q&A system with context and citations
 */
export function buildPrompt(question: string, contexts: SearchContext[]): string {
  const sourcesSection = contexts
    .map((ctx, i) => {
      const title = ctx.document_title || 'Unknown Source';
      const sourceType = ctx.source_type?.toUpperCase() || 'DOCUMENT';
      return `[${i + 1}] ${title} (${sourceType})\n"${ctx.content.slice(0, 500)}..."`;
    })
    .join('\n\n');

  return `You are a Maryland special education law expert. Answer the question based ONLY on the provided sources. If the answer cannot be found in the sources, say so clearly.

IMPORTANT INSTRUCTIONS:
- Cite your sources using [1], [2], etc. when referencing information
- Be specific about Maryland regulations (COMAR) when applicable
- Include relevant timelines and deadlines when mentioned
- If discussing county-specific policies, clearly indicate the county
- Do not make up information that is not in the sources

Sources:
${sourcesSection}

Question: ${question}

Provide an accurate, helpful answer with citations:`;
}

/**
 * Format search contexts into citation objects
 */
export function formatCitations(contexts: SearchContext[]): Citation[] {
  return contexts.map((ctx, i) => ({
    id: i + 1,
    title: ctx.document_title || 'Unknown Document',
    source_type: ctx.source_type || 'document',
    url: ctx.url || undefined,
    excerpt: ctx.content.slice(0, 300) + (ctx.content.length > 300 ? '...' : ''),
  }));
}

/**
 * Extract citations from the AI response
 * Returns an array of citation numbers referenced in the response
 */
export function extractCitationsFromResponse(response: string): number[] {
  const citationPattern = /\[(\d+)\]/g;
  const matches = response.matchAll(citationPattern);
  const citedNumbers = new Set<number>();

  for (const match of matches) {
    citedNumbers.add(parseInt(match[1], 10));
  }

  return Array.from(citedNumbers).sort((a, b) => a - b);
}

/**
 * Filter citations to only include those referenced in the response
 */
export function filterUsedCitations(
  allCitations: Citation[],
  response: string
): Citation[] {
  const usedNumbers = extractCitationsFromResponse(response);
  return allCitations.filter(citation => usedNumbers.includes(citation.id));
}

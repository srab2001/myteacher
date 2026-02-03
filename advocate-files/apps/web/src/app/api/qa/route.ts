/**
 * Q&A API Route
 * POST /api/qa - Ask a question and get an answer with citations
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { query } from '@/lib/db/client';
import { buildPrompt, formatCitations, filterUsedCitations, SearchContext } from '@/lib/qa/rag';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QARequest {
  question: string;
  conversation_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: QARequest = await request.json();

    if (!body.question) {
      return NextResponse.json(
        { error: 'question is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the question
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: body.question,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;
    const embeddingStr = '[' + queryEmbedding.join(',') + ']';

    // Search for relevant chunks using pgvector
    const searchResults = await query<SearchContext & { id: string }>(
      `SELECT c.id as chunk_id, c.content, d.title as document_title,
              d.source_type, d.url,
              1 - (c.embedding <=> $1::vector) as similarity
       FROM chunks c
       JOIN documents d ON c.document_id = d.id
       WHERE c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $1::vector
       LIMIT 5`,
      [embeddingStr]
    );

    // Format contexts for the prompt
    const contexts: SearchContext[] = searchResults.map(r => ({
      chunk_id: r.chunk_id,
      content: r.content,
      document_title: r.document_title,
      source_type: r.source_type,
      url: r.url,
      similarity: r.similarity,
    }));

    // Build prompt with context
    const prompt = buildPrompt(body.question, contexts);

    // Generate answer using GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful Maryland special education law expert. Always cite your sources using [1], [2], etc. Be accurate and helpful.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const answer = completion.choices[0].message.content || '';

    // Format all citations
    const allCitations = formatCitations(contexts);

    // Filter to only used citations
    const usedCitations = filterUsedCitations(allCitations, answer);

    // Store conversation if conversation_id provided
    let conversationId = body.conversation_id;

    if (!conversationId) {
      // Create new conversation
      const convResult = await query<{ id: string }>(
        `INSERT INTO conversations (user_id, title)
         VALUES ($1, $2)
         RETURNING id`,
        ['00000000-0000-0000-0000-000000000000', body.question.slice(0, 100)]
      );
      conversationId = convResult[0]?.id;
    }

    if (conversationId) {
      // Store user message
      await query(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, $2, $3)`,
        [conversationId, 'user', body.question]
      );

      // Store assistant message with citations metadata
      await query(
        `INSERT INTO messages (conversation_id, role, content, metadata)
         VALUES ($1, $2, $3, $4)`,
        [conversationId, 'assistant', answer, JSON.stringify({ citations: usedCitations })]
      );
    }

    return NextResponse.json({
      answer,
      citations: usedCitations,
      conversation_id: conversationId,
      contexts_used: contexts.length,
    });
  } catch (error) {
    console.error('Q&A error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}

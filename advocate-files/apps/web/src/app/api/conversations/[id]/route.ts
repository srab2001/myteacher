/**
 * Single Conversation API Routes
 * GET /api/conversations/[id] - Get conversation with all messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface Message {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

interface Conversation {
  id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get conversation
    const conversations = await query<Conversation>(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );

    if (conversations.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get messages
    const messages = await query<Message>(
      `SELECT * FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({
      ...conversations[0],
      messages,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

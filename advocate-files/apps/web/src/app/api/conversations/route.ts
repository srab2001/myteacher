/**
 * Conversations API Routes
 * GET /api/conversations - List all conversations
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';

interface Conversation {
  id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
  message_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id') || '00000000-0000-0000-0000-000000000000';

    const conversations = await query<Conversation>(
      `SELECT c.*, COUNT(m.id) as message_count
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT 50`,
      [userId]
    );

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

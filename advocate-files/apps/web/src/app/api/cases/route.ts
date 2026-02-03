/**
 * Cases API Routes
 * POST /api/cases - Create a new case
 * GET /api/cases - List all cases for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { Case, CreateCaseRequest } from '@/lib/db/types';

export async function POST(request: NextRequest) {
  try {
    const body: CreateCaseRequest = await request.json();

    // Validate required fields
    if (!body.student_name) {
      return NextResponse.json(
        { error: 'student_name is required' },
        { status: 400 }
      );
    }

    // For now, use a placeholder user_id (in production, get from auth)
    const userId = body.user_id || '00000000-0000-0000-0000-000000000000';

    const result = await query<Case>(
      `INSERT INTO cases (
        user_id, student_name, student_dob, student_grade,
        school_name, school_district, disability_category, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        body.student_name,
        body.student_dob || null,
        body.student_grade || null,
        body.school_name || null,
        body.school_district || null,
        body.disability_category || null,
        body.notes || null,
      ]
    );

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { error: 'Failed to create case' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id') || '00000000-0000-0000-0000-000000000000';
    const status = searchParams.get('status');

    let queryText = 'SELECT * FROM cases WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (status) {
      queryText += ' AND status = $2';
      params.push(status);
    }

    queryText += ' ORDER BY updated_at DESC';

    const cases = await query<Case>(queryText, params);

    return NextResponse.json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cases' },
      { status: 500 }
    );
  }
}

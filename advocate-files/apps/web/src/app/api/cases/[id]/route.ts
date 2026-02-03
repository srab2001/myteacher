/**
 * Single Case API Routes
 * GET /api/cases/[id] - Get a single case with events and deadlines
 * PUT /api/cases/[id] - Update a case
 * DELETE /api/cases/[id] - Delete a case
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { Case, CaseEvent, Deadline } from '@/lib/db/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get the case
    const cases = await query<Case>(
      'SELECT * FROM cases WHERE id = $1',
      [id]
    );

    if (cases.length === 0) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    // Get case events
    const events = await query<CaseEvent>(
      'SELECT * FROM case_events WHERE case_id = $1 ORDER BY event_date DESC',
      [id]
    );

    // Get deadlines
    const deadlines = await query<Deadline>(
      'SELECT * FROM deadlines WHERE case_id = $1 ORDER BY deadline_date ASC',
      [id]
    );

    return NextResponse.json({
      ...cases[0],
      events,
      deadlines,
    });
  } catch (error) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'student_name', 'student_dob', 'student_grade',
      'school_name', 'school_district', 'disability_category',
      'notes', 'status'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    values.push(id);
    const queryText = `
      UPDATE cases
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query<Case>(queryText, values);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json(
      { error: 'Failed to update case' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await query<Case>(
      'DELETE FROM cases WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json(
      { error: 'Failed to delete case' },
      { status: 500 }
    );
  }
}

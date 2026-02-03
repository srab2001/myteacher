/**
 * Case Events API Routes
 * POST /api/cases/[id]/events - Add a new event to a case (auto-calculates deadlines)
 * GET /api/cases/[id]/events - List all events for a case
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { CaseEvent, Deadline, CreateEventRequest, EventType } from '@/lib/db/types';
import { calculateDeadlinesForEvent } from '@/lib/timeline/calculator';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: caseId } = await params;
    const body: CreateEventRequest = await request.json();

    // Validate required fields
    if (!body.event_type || !body.event_date) {
      return NextResponse.json(
        { error: 'event_type and event_date are required' },
        { status: 400 }
      );
    }

    // Verify case exists
    const caseCheck = await query<{ id: string }>(
      'SELECT id FROM cases WHERE id = $1',
      [caseId]
    );

    if (caseCheck.length === 0) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    // Insert the event
    const eventDate = new Date(body.event_date);
    const eventResult = await query<CaseEvent>(
      `INSERT INTO case_events (case_id, event_type, event_date, notes, document_ids)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        caseId,
        body.event_type,
        eventDate,
        body.notes || null,
        body.document_ids ? JSON.stringify(body.document_ids) : null,
      ]
    );

    const createdEvent = eventResult[0];

    // Calculate and insert deadlines
    const calculatedDeadlines = calculateDeadlinesForEvent(
      body.event_type as EventType,
      eventDate
    );

    const insertedDeadlines: Deadline[] = [];

    for (const deadline of calculatedDeadlines) {
      // Check if a similar deadline already exists for this case
      const existingDeadline = await query<Deadline>(
        `SELECT id FROM deadlines
         WHERE case_id = $1 AND deadline_type = $2 AND status = 'pending'`,
        [caseId, deadline.deadline_type]
      );

      if (existingDeadline.length > 0) {
        // Update existing deadline
        const updated = await query<Deadline>(
          `UPDATE deadlines
           SET deadline_date = $1, calculated_from = $2, source_event_id = $3, updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [
            deadline.deadline_date,
            deadline.calculated_from,
            createdEvent.id,
            existingDeadline[0].id,
          ]
        );
        insertedDeadlines.push(updated[0]);
      } else {
        // Insert new deadline
        const inserted = await query<Deadline>(
          `INSERT INTO deadlines (case_id, deadline_type, deadline_date, calculated_from, source_event_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            caseId,
            deadline.deadline_type,
            deadline.deadline_date,
            deadline.calculated_from,
            createdEvent.id,
          ]
        );
        insertedDeadlines.push(inserted[0]);
      }
    }

    return NextResponse.json({
      event: createdEvent,
      deadlines: insertedDeadlines,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: caseId } = await params;

    const events = await query<CaseEvent>(
      `SELECT * FROM case_events
       WHERE case_id = $1
       ORDER BY event_date DESC`,
      [caseId]
    );

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

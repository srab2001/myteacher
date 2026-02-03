/**
 * Case Deadlines API Routes
 * GET /api/cases/[id]/deadlines - Get all deadlines for a case with urgency info
 * PUT /api/cases/[id]/deadlines/[deadlineId] - Update deadline status
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { Deadline, DeadlineWithUrgency } from '@/lib/db/types';
import { daysUntil, getUrgencyLevel, formatDaysRemaining, getDeadlineTypeName } from '@/lib/timeline/calculator';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: caseId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const includeCompleted = searchParams.get('include_completed') === 'true';

    let queryText = `
      SELECT d.*, e.event_type as source_event_type, e.event_date as source_event_date
      FROM deadlines d
      LEFT JOIN case_events e ON d.source_event_id = e.id
      WHERE d.case_id = $1
    `;
    const queryParams: unknown[] = [caseId];

    if (status) {
      queryText += ' AND d.status = $2';
      queryParams.push(status);
    } else if (!includeCompleted) {
      queryText += ' AND d.status != $2';
      queryParams.push('completed');
    }

    queryText += ' ORDER BY d.deadline_date ASC';

    const deadlines = await query<Deadline & { source_event_type?: string; source_event_date?: Date }>(
      queryText,
      queryParams
    );

    // Enhance deadlines with urgency information
    const enhancedDeadlines: DeadlineWithUrgency[] = deadlines.map((deadline) => {
      const days = daysUntil(new Date(deadline.deadline_date));
      return {
        ...deadline,
        days_remaining: days,
        urgency: getUrgencyLevel(days),
        display_name: getDeadlineTypeName(deadline.deadline_type),
        days_display: formatDaysRemaining(days),
      };
    });

    // Group by urgency for summary
    const summary = {
      overdue: enhancedDeadlines.filter(d => d.urgency === 'overdue').length,
      urgent: enhancedDeadlines.filter(d => d.urgency === 'urgent').length,
      warning: enhancedDeadlines.filter(d => d.urgency === 'warning').length,
      normal: enhancedDeadlines.filter(d => d.urgency === 'normal').length,
      total: enhancedDeadlines.length,
    };

    return NextResponse.json({
      deadlines: enhancedDeadlines,
      summary,
    });
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deadlines' },
      { status: 500 }
    );
  }
}

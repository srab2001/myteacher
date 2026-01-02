import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { Errors, ApiError } from '../errors.js';
import {
  ScheduleType,
  ReviewScheduleStatus,
  ComplianceTaskType,
  ComplianceTaskStatus,
} from '../types/prisma-enums.js';

const router = Router();

// Helper to check if user can manage reviews (create/complete)
function canManageReviews(userRole: string | null | undefined): boolean {
  return userRole === 'ADMIN' || userRole === 'CASE_MANAGER';
}

// Helper to check if user can view reviews
function canViewReviews(userRole: string | null | undefined): boolean {
  return userRole === 'ADMIN' || userRole === 'CASE_MANAGER' || userRole === 'TEACHER';
}

// ============================================
// CREATE REVIEW SCHEDULE
// POST /api/plans/:planId/review-schedules
// ============================================

const createReviewScheduleSchema = z.object({
  scheduleType: z.nativeEnum(ScheduleType),
  dueDate: z.string().datetime(),
  leadDays: z.number().int().min(1).max(365).optional().default(30),
  notes: z.string().optional(),
  assignedToUserId: z.string().uuid().optional(),
});

router.post('/plans/:planId/review-schedules', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;

    if (!canManageReviews(req.user?.role)) {
      throw Errors.forbidden('Not authorized to create review schedules');
    }

    const validatedData = createReviewScheduleSchema.parse(req.body);

    // Verify plan exists
    const plan = await prisma.planInstance.findUnique({
      where: { id: planId },
      include: { planType: true, student: true },
    });

    if (!plan) {
      throw Errors.planNotFound(planId);
    }

    // Create the review schedule
    const reviewSchedule = await prisma.reviewSchedule.create({
      data: {
        planInstanceId: planId,
        scheduleType: validatedData.scheduleType,
        dueDate: new Date(validatedData.dueDate),
        leadDays: validatedData.leadDays,
        notes: validatedData.notes,
        assignedToUserId: validatedData.assignedToUserId,
        createdByUserId: req.user!.id,
      },
      include: {
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        planInstance: {
          select: {
            id: true,
            student: { select: { id: true, firstName: true, lastName: true } },
            planType: { select: { code: true, name: true } },
          },
        },
      },
    });

    // Auto-create compliance task for lead window if due date is within lead days
    const now = new Date();
    const leadDate = new Date(validatedData.dueDate);
    leadDate.setDate(leadDate.getDate() - validatedData.leadDays);

    if (leadDate <= now) {
      // Already within lead window, create "due soon" task
      await prisma.complianceTask.create({
        data: {
          taskType: ComplianceTaskType.REVIEW_DUE_SOON,
          status: ComplianceTaskStatus.OPEN,
          title: `${getScheduleTypeLabel(validatedData.scheduleType)} due soon`,
          description: `Review for ${plan.student.firstName} ${plan.student.lastName} is due on ${new Date(validatedData.dueDate).toLocaleDateString()}`,
          dueDate: new Date(validatedData.dueDate),
          priority: 2,
          assignedToUserId: validatedData.assignedToUserId,
          reviewScheduleId: reviewSchedule.id,
          planInstanceId: planId,
          studentId: plan.studentId,
          createdByUserId: req.user!.id,
        },
      });
    }

    res.status(201).json({ reviewSchedule });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error creating review schedule:', error);
    next(Errors.internal('Failed to create review schedule'));
  }
});

// ============================================
// GET PLAN REVIEW SCHEDULES
// GET /api/plans/:planId/review-schedules
// ============================================

router.get('/plans/:planId/review-schedules', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;
    const { status, type } = req.query;

    if (!canViewReviews(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view review schedules');
    }

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { planInstanceId: planId };

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (type && typeof type === 'string') {
      where.scheduleType = type;
    }

    const reviewSchedules = await prisma.reviewSchedule.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        completedBy: { select: { id: true, displayName: true } },
        complianceTasks: {
          select: { id: true, taskType: true, status: true, title: true },
        },
      },
    });

    res.json({ reviewSchedules });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching review schedules:', error);
    next(Errors.internal('Failed to fetch review schedules'));
  }
});

// ============================================
// GET ALL DUE/OVERDUE REVIEWS (Dashboard)
// GET /api/review-schedules/dashboard
// NOTE: This route MUST be defined BEFORE /:scheduleId to avoid 'dashboard' being captured as a scheduleId
// ============================================

router.get('/review-schedules/dashboard', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canViewReviews(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view review schedules');
    }

    const { days = '30' } = req.query;
    const daysAhead = parseInt(days as string, 10) || 30;

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Get upcoming reviews (within lead window)
    const upcomingReviews = await prisma.reviewSchedule.findMany({
      where: {
        status: { in: [ReviewScheduleStatus.OPEN, ReviewScheduleStatus.OVERDUE] },
        dueDate: { lte: futureDate },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        planInstance: {
          select: {
            id: true,
            student: { select: { id: true, firstName: true, lastName: true } },
            planType: { select: { code: true, name: true } },
          },
        },
        assignedTo: { select: { id: true, displayName: true } },
      },
    });

    // Separate into overdue and upcoming
    const overdue = upcomingReviews.filter(r => r.dueDate < now || r.status === ReviewScheduleStatus.OVERDUE);
    const upcoming = upcomingReviews.filter(r => r.dueDate >= now && r.status !== ReviewScheduleStatus.OVERDUE);

    res.json({
      overdue,
      upcoming,
      summary: {
        overdueCount: overdue.length,
        upcomingCount: upcoming.length,
        totalDueWithin30Days: upcomingReviews.filter(r => {
          const thirtyDays = new Date();
          thirtyDays.setDate(thirtyDays.getDate() + 30);
          return r.dueDate <= thirtyDays;
        }).length,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching review dashboard:', error);
    next(Errors.internal('Failed to fetch review dashboard'));
  }
});

// ============================================
// GET SINGLE REVIEW SCHEDULE
// GET /api/review-schedules/:scheduleId
// ============================================

router.get('/review-schedules/:scheduleId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scheduleId } = req.params;

    if (!canViewReviews(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view review schedules');
    }

    const reviewSchedule = await prisma.reviewSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        planInstance: {
          select: {
            id: true,
            student: { select: { id: true, firstName: true, lastName: true } },
            planType: { select: { code: true, name: true } },
          },
        },
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        completedBy: { select: { id: true, displayName: true } },
        complianceTasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!reviewSchedule) {
      throw Errors.reviewScheduleNotFound(scheduleId);
    }

    res.json({ reviewSchedule });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching review schedule:', error);
    next(Errors.internal('Failed to fetch review schedule'));
  }
});

// ============================================
// UPDATE REVIEW SCHEDULE
// PATCH /api/review-schedules/:scheduleId
// ============================================

const updateReviewScheduleSchema = z.object({
  dueDate: z.string().datetime().optional(),
  leadDays: z.number().int().min(1).max(365).optional(),
  notes: z.string().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
});

router.patch('/review-schedules/:scheduleId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scheduleId } = req.params;

    if (!canManageReviews(req.user?.role)) {
      throw Errors.forbidden('Not authorized to update review schedules');
    }

    const validatedData = updateReviewScheduleSchema.parse(req.body);

    const existing = await prisma.reviewSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      throw Errors.reviewScheduleNotFound(scheduleId);
    }

    if (existing.status === ReviewScheduleStatus.COMPLETE) {
      throw Errors.reviewScheduleAlreadyComplete(scheduleId);
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }
    if (validatedData.leadDays !== undefined) {
      updateData.leadDays = validatedData.leadDays;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }
    if (validatedData.assignedToUserId !== undefined) {
      updateData.assignedToUserId = validatedData.assignedToUserId;
    }

    const reviewSchedule = await prisma.reviewSchedule.update({
      where: { id: scheduleId },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        planInstance: {
          select: {
            id: true,
            student: { select: { id: true, firstName: true, lastName: true } },
            planType: { select: { code: true, name: true } },
          },
        },
      },
    });

    res.json({ reviewSchedule });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error updating review schedule:', error);
    next(Errors.internal('Failed to update review schedule'));
  }
});

// ============================================
// MARK REVIEW SCHEDULE COMPLETE
// POST /api/review-schedules/:scheduleId/complete
// ============================================

const completeReviewScheduleSchema = z.object({
  notes: z.string().optional(),
});

router.post('/review-schedules/:scheduleId/complete', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scheduleId } = req.params;

    if (!canManageReviews(req.user?.role)) {
      throw Errors.forbidden('Not authorized to complete review schedules');
    }

    const validatedData = completeReviewScheduleSchema.parse(req.body);

    const existing = await prisma.reviewSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      throw Errors.reviewScheduleNotFound(scheduleId);
    }

    if (existing.status === ReviewScheduleStatus.COMPLETE) {
      throw Errors.reviewScheduleAlreadyComplete(scheduleId);
    }

    // Update review schedule and complete related tasks in a transaction
    const [reviewSchedule] = await prisma.$transaction([
      prisma.reviewSchedule.update({
        where: { id: scheduleId },
        data: {
          status: ReviewScheduleStatus.COMPLETE,
          completedAt: new Date(),
          completedByUserId: req.user!.id,
          notes: validatedData.notes ? `${existing.notes || ''}\n\nCompletion notes: ${validatedData.notes}`.trim() : existing.notes,
        },
        include: {
          assignedTo: { select: { id: true, displayName: true, email: true } },
          createdBy: { select: { id: true, displayName: true } },
          completedBy: { select: { id: true, displayName: true } },
          planInstance: {
            select: {
              id: true,
              student: { select: { id: true, firstName: true, lastName: true } },
              planType: { select: { code: true, name: true } },
            },
          },
        },
      }),
      // Also complete any open related compliance tasks
      prisma.complianceTask.updateMany({
        where: {
          reviewScheduleId: scheduleId,
          status: { in: [ComplianceTaskStatus.OPEN, ComplianceTaskStatus.IN_PROGRESS] },
        },
        data: {
          status: ComplianceTaskStatus.COMPLETE,
          completedAt: new Date(),
          completedByUserId: req.user!.id,
        },
      }),
    ]);

    res.json({ reviewSchedule });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error completing review schedule:', error);
    next(Errors.internal('Failed to complete review schedule'));
  }
});

// ============================================
// DELETE REVIEW SCHEDULE
// DELETE /api/review-schedules/:scheduleId
// ============================================

router.delete('/review-schedules/:scheduleId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scheduleId } = req.params;

    // Only admins can delete review schedules
    if (req.user?.role !== 'ADMIN') {
      throw Errors.forbidden('Only administrators can delete review schedules');
    }

    const existing = await prisma.reviewSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      throw Errors.reviewScheduleNotFound(scheduleId);
    }

    // Delete related compliance tasks first, then the schedule
    await prisma.$transaction([
      prisma.complianceTask.deleteMany({
        where: { reviewScheduleId: scheduleId },
      }),
      prisma.reviewSchedule.delete({
        where: { id: scheduleId },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error deleting review schedule:', error);
    next(Errors.internal('Failed to delete review schedule'));
  }
});

// ============================================
// GET SCHEDULE TYPES (for dropdown)
// GET /api/review-schedules/types
// ============================================

router.get('/schedule-types', requireAuth, async (_req: Request, res: Response) => {
  const scheduleTypes = [
    { value: 'IEP_ANNUAL_REVIEW', label: 'IEP Annual Review', description: 'Annual review of IEP goals and services' },
    { value: 'IEP_REEVALUATION', label: 'IEP Reevaluation', description: 'Three-year comprehensive reevaluation' },
    { value: 'PLAN_AMENDMENT_REVIEW', label: 'Plan Amendment Review', description: 'Review of plan amendments' },
    { value: 'SECTION504_PERIODIC_REVIEW', label: 'Section 504 Periodic Review', description: 'Periodic review of 504 accommodations' },
    { value: 'BIP_REVIEW', label: 'BIP Review', description: 'Behavior Intervention Plan review' },
  ];

  res.json({ scheduleTypes });
});

// Helper function to get human-readable schedule type label
function getScheduleTypeLabel(scheduleType: string): string {
  const labels: Record<string, string> = {
    IEP_ANNUAL_REVIEW: 'IEP Annual Review',
    IEP_REEVALUATION: 'IEP Reevaluation',
    PLAN_AMENDMENT_REVIEW: 'Plan Amendment Review',
    SECTION504_PERIODIC_REVIEW: 'Section 504 Periodic Review',
    BIP_REVIEW: 'BIP Review',
  };
  return labels[scheduleType] || scheduleType;
}

export default router;

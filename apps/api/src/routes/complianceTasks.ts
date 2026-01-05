import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { Errors, ApiError } from '../errors.js';
import {
  ComplianceTaskType,
  ComplianceTaskStatus,
} from '../types/prisma-enums.js';

const router = Router();

// Helper to check if user can manage compliance tasks
function canManageTasks(userRole: string | null | undefined): boolean {
  return userRole === 'ADMIN' || userRole === 'CASE_MANAGER';
}

// Helper to check if user can view compliance tasks
function canViewTasks(userRole: string | null | undefined): boolean {
  return userRole === 'ADMIN' || userRole === 'CASE_MANAGER' || userRole === 'TEACHER';
}

// ============================================
// CREATE COMPLIANCE TASK
// POST /api/compliance-tasks
// ============================================

const createTaskSchema = z.object({
  taskType: z.nativeEnum(ComplianceTaskType),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.number().int().min(1).max(5).optional().default(1),
  assignedToUserId: z.string().uuid().optional(),
  reviewScheduleId: z.string().uuid().optional(),
  planInstanceId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
});

router.post('/compliance-tasks', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canManageTasks(req.user?.role)) {
      throw Errors.forbidden('Not authorized to create compliance tasks');
    }

    const validatedData = createTaskSchema.parse(req.body);

    // Validate referenced entities exist
    if (validatedData.planInstanceId) {
      const plan = await prisma.planInstance.findUnique({
        where: { id: validatedData.planInstanceId },
      });
      if (!plan) {
        throw Errors.planNotFound(validatedData.planInstanceId);
      }
    }

    if (validatedData.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: validatedData.studentId },
      });
      if (!student) {
        throw Errors.studentNotFound(validatedData.studentId);
      }
    }

    const task = await prisma.complianceTask.create({
      data: {
        taskType: validatedData.taskType,
        title: validatedData.title,
        description: validatedData.description,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        priority: validatedData.priority,
        assignedToUserId: validatedData.assignedToUserId,
        reviewScheduleId: validatedData.reviewScheduleId,
        planInstanceId: validatedData.planInstanceId,
        studentId: validatedData.studentId,
        createdByUserId: req.user!.id,
      },
      include: {
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        planInstance: {
          select: {
            id: true,
            planType: { select: { code: true, name: true } },
          },
        },
      },
    });

    res.status(201).json({ task });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error creating compliance task:', error);
    next(Errors.internal('Failed to create compliance task'));
  }
});

// ============================================
// GET COMPLIANCE TASKS
// GET /api/compliance-tasks
// Supports filtering by status, type, assignee, student, plan
// ============================================

router.get('/compliance-tasks', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canViewTasks(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view compliance tasks');
    }

    const { status, type, assignedTo, studentId, planId, overdue } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (type && typeof type === 'string') {
      where.taskType = type;
    }

    if (assignedTo && typeof assignedTo === 'string') {
      where.assignedToUserId = assignedTo;
    }

    if (studentId && typeof studentId === 'string') {
      where.studentId = studentId;
    }

    if (planId && typeof planId === 'string') {
      where.planInstanceId = planId;
    }

    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { in: [ComplianceTaskStatus.OPEN, ComplianceTaskStatus.IN_PROGRESS] };
    }

    const tasks = await prisma.complianceTask.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      include: {
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        completedBy: { select: { id: true, displayName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        planInstance: {
          select: {
            id: true,
            planType: { select: { code: true, name: true } },
          },
        },
        reviewSchedule: {
          select: { id: true, scheduleType: true, dueDate: true },
        },
      },
    });

    res.json({ tasks });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching compliance tasks:', error);
    next(Errors.internal('Failed to fetch compliance tasks'));
  }
});

// ============================================
// GET MY COMPLIANCE TASKS
// GET /api/compliance-tasks/my-tasks
// ============================================

router.get('/compliance-tasks/my-tasks', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      assignedToUserId: req.user!.id,
    };

    if (status && typeof status === 'string') {
      where.status = status;
    } else {
      // Default to open/in-progress tasks
      where.status = { in: [ComplianceTaskStatus.OPEN, ComplianceTaskStatus.IN_PROGRESS] };
    }

    const tasks = await prisma.complianceTask.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        planInstance: {
          select: {
            id: true,
            planType: { select: { code: true, name: true } },
          },
        },
        reviewSchedule: {
          select: { id: true, scheduleType: true, dueDate: true },
        },
      },
    });

    res.json({ tasks });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching my tasks:', error);
    next(Errors.internal('Failed to fetch my tasks'));
  }
});

// ============================================
// GET COMPLIANCE DASHBOARD SUMMARY
// GET /api/compliance-tasks/dashboard
// NOTE: This MUST be defined before /:taskId routes!
// ============================================

router.get('/compliance-tasks/dashboard', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canViewTasks(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view compliance dashboard');
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get task counts by status
    const [openCount, inProgressCount, overdueCount, dueIn30DaysCount] = await Promise.all([
      prisma.complianceTask.count({
        where: { status: ComplianceTaskStatus.OPEN },
      }),
      prisma.complianceTask.count({
        where: { status: ComplianceTaskStatus.IN_PROGRESS },
      }),
      prisma.complianceTask.count({
        where: {
          status: { in: [ComplianceTaskStatus.OPEN, ComplianceTaskStatus.IN_PROGRESS] },
          dueDate: { lt: now },
        },
      }),
      prisma.complianceTask.count({
        where: {
          status: { in: [ComplianceTaskStatus.OPEN, ComplianceTaskStatus.IN_PROGRESS] },
          dueDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
    ]);

    // Get recent tasks for quick view
    const recentTasks = await prisma.complianceTask.findMany({
      where: {
        status: { in: [ComplianceTaskStatus.OPEN, ComplianceTaskStatus.IN_PROGRESS] },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      take: 10,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        planInstance: {
          select: {
            id: true,
            planType: { select: { code: true, name: true } },
          },
        },
        assignedTo: { select: { id: true, displayName: true } },
      },
    });

    res.json({
      summary: {
        open: openCount,
        inProgress: inProgressCount,
        overdue: overdueCount,
        dueIn30Days: dueIn30DaysCount,
      },
      recentTasks,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching compliance dashboard:', error);
    next(Errors.internal('Failed to fetch compliance dashboard'));
  }
});

// ============================================
// GET SINGLE COMPLIANCE TASK
// GET /api/compliance-tasks/:taskId
// ============================================

router.get('/compliance-tasks/:taskId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;

    if (!canViewTasks(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view compliance tasks');
    }

    const task = await prisma.complianceTask.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        completedBy: { select: { id: true, displayName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        planInstance: {
          select: {
            id: true,
            student: { select: { id: true, firstName: true, lastName: true } },
            planType: { select: { code: true, name: true } },
          },
        },
        reviewSchedule: {
          select: {
            id: true,
            scheduleType: true,
            dueDate: true,
            status: true,
          },
        },
      },
    });

    if (!task) {
      throw Errors.complianceTaskNotFound(taskId);
    }

    res.json({ task });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching compliance task:', error);
    next(Errors.internal('Failed to fetch compliance task'));
  }
});

// ============================================
// UPDATE COMPLIANCE TASK
// PATCH /api/compliance-tasks/:taskId
// ============================================

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  status: z.nativeEnum(ComplianceTaskStatus).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
});

router.patch('/compliance-tasks/:taskId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;

    if (!canManageTasks(req.user?.role)) {
      throw Errors.forbidden('Not authorized to update compliance tasks');
    }

    const validatedData = updateTaskSchema.parse(req.body);

    const existing = await prisma.complianceTask.findUnique({
      where: { id: taskId },
    });

    if (!existing) {
      throw Errors.complianceTaskNotFound(taskId);
    }

    const updateData: Record<string, unknown> = {};

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    }
    if (validatedData.priority !== undefined) {
      updateData.priority = validatedData.priority;
    }
    if (validatedData.assignedToUserId !== undefined) {
      updateData.assignedToUserId = validatedData.assignedToUserId;
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;

      // If completing the task, set completion fields
      if (validatedData.status === ComplianceTaskStatus.COMPLETE) {
        updateData.completedAt = new Date();
        updateData.completedByUserId = req.user!.id;
      }
    }

    const task = await prisma.complianceTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        completedBy: { select: { id: true, displayName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        planInstance: {
          select: {
            id: true,
            planType: { select: { code: true, name: true } },
          },
        },
      },
    });

    res.json({ task });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error updating compliance task:', error);
    next(Errors.internal('Failed to update compliance task'));
  }
});

// ============================================
// COMPLETE COMPLIANCE TASK
// POST /api/compliance-tasks/:taskId/complete
// ============================================

const completeTaskSchema = z.object({
  notes: z.string().optional(),
});

router.post('/compliance-tasks/:taskId/complete', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;

    if (!canManageTasks(req.user?.role)) {
      throw Errors.forbidden('Not authorized to complete compliance tasks');
    }

    const validatedData = completeTaskSchema.parse(req.body);

    const existing = await prisma.complianceTask.findUnique({
      where: { id: taskId },
    });

    if (!existing) {
      throw Errors.complianceTaskNotFound(taskId);
    }

    if (existing.status === ComplianceTaskStatus.COMPLETE) {
      throw Errors.complianceTaskAlreadyComplete(taskId);
    }

    const task = await prisma.complianceTask.update({
      where: { id: taskId },
      data: {
        status: ComplianceTaskStatus.COMPLETE,
        completedAt: new Date(),
        completedByUserId: req.user!.id,
        description: validatedData.notes
          ? `${existing.description || ''}\n\nCompletion notes: ${validatedData.notes}`.trim()
          : existing.description,
      },
      include: {
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        completedBy: { select: { id: true, displayName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.json({ task });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error completing compliance task:', error);
    next(Errors.internal('Failed to complete compliance task'));
  }
});

// ============================================
// DISMISS COMPLIANCE TASK
// POST /api/compliance-tasks/:taskId/dismiss
// ============================================

const dismissTaskSchema = z.object({
  reason: z.string().min(1, 'Dismissal reason is required'),
});

router.post('/compliance-tasks/:taskId/dismiss', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;

    if (!canManageTasks(req.user?.role)) {
      throw Errors.forbidden('Not authorized to dismiss compliance tasks');
    }

    const validatedData = dismissTaskSchema.parse(req.body);

    const existing = await prisma.complianceTask.findUnique({
      where: { id: taskId },
    });

    if (!existing) {
      throw Errors.complianceTaskNotFound(taskId);
    }

    if (existing.status === ComplianceTaskStatus.COMPLETE || existing.status === ComplianceTaskStatus.DISMISSED) {
      throw Errors.complianceTaskAlreadyComplete(taskId);
    }

    const task = await prisma.complianceTask.update({
      where: { id: taskId },
      data: {
        status: ComplianceTaskStatus.DISMISSED,
        completedAt: new Date(),
        completedByUserId: req.user!.id,
        description: `${existing.description || ''}\n\nDismissed: ${validatedData.reason}`.trim(),
      },
      include: {
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        completedBy: { select: { id: true, displayName: true } },
      },
    });

    res.json({ task });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error dismissing compliance task:', error);
    next(Errors.internal('Failed to dismiss compliance task'));
  }
});

// ============================================
// GET TASK TYPES (for dropdown)
// GET /api/compliance-tasks/types
// ============================================

router.get('/task-types', requireAuth, async (_req: Request, res: Response) => {
  const taskTypes = [
    { value: 'REVIEW_DUE_SOON', label: 'Review Due Soon', description: 'A plan review is due within the lead window' },
    { value: 'REVIEW_OVERDUE', label: 'Review Overdue', description: 'A plan review is past its due date' },
    { value: 'DOCUMENT_REQUIRED', label: 'Document Required', description: 'A required document needs to be uploaded or completed' },
    { value: 'SIGNATURE_NEEDED', label: 'Signature Needed', description: 'A signature is required on a document or plan' },
    { value: 'MEETING_REQUIRED', label: 'Meeting Required', description: 'A meeting needs to be scheduled or held' },
  ];

  res.json({ taskTypes });
});

export default router;

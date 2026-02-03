import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, Prisma, ServiceType, ScheduledServiceStatus } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { Errors, ApiError } from '../errors.js';
import { startOfWeek, endOfWeek, eachWeekOfInterval, format, parseISO } from 'date-fns';

const router = Router();

// Helper to check if user can manage scheduled services
function canManageScheduledServices(userRole: string | null | undefined): boolean {
  return userRole === 'ADMIN' || userRole === 'CASE_MANAGER';
}

// Schema for creating/updating scheduled service items
const ScheduledServiceItemSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  expectedMinutesPerWeek: z.number().int().positive(),
  startDate: z.string().transform(s => new Date(s)),
  endDate: z.string().transform(s => new Date(s)).optional().nullable(),
  providerRole: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const CreateScheduledServicePlanSchema = z.object({
  items: z.array(ScheduledServiceItemSchema).min(1, 'At least one service item is required'),
});

const UpdateScheduledServicePlanSchema = z.object({
  status: z.nativeEnum(ScheduledServiceStatus).optional(),
  items: z.array(ScheduledServiceItemSchema).optional(),
});

/**
 * POST /api/plans/:planId/scheduled-services
 * Create a new scheduled service plan for the given plan
 */
router.post('/plans/:planId/scheduled-services', requireAuth, requireOnboarded, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;
    const userId = (req as Request & { user: { id: string; role: string } }).user.id;
    const userRole = (req as Request & { user: { role: string } }).user.role;

    if (!canManageScheduledServices(userRole)) {
      throw Errors.forbidden('Only ADMIN or CASE_MANAGER can manage scheduled services');
    }

    const validatedData = CreateScheduledServicePlanSchema.parse(req.body);

    // Check if plan exists
    const plan = await prisma.planInstance.findUnique({
      where: { id: planId },
      include: { scheduledServicePlan: true },
    });

    if (!plan) {
      throw Errors.planNotFound(planId);
    }

    if (plan.scheduledServicePlan) {
      throw Errors.scheduledPlanExists(planId);
    }

    // Create scheduled service plan with items
    const scheduledPlan = await prisma.scheduledServicePlan.create({
      data: {
        planInstanceId: planId,
        createdById: userId,
        items: {
          create: validatedData.items.map(item => ({
            serviceType: item.serviceType,
            expectedMinutesPerWeek: item.expectedMinutesPerWeek,
            startDate: item.startDate,
            endDate: item.endDate,
            providerRole: item.providerRole,
            location: item.location,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    res.status(201).json({ scheduledPlan });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error creating scheduled service plan:', error);
    next(Errors.internal('Failed to create scheduled service plan'));
  }
});

/**
 * GET /api/plans/:planId/scheduled-services
 * Get the scheduled service plan for a plan
 */
router.get('/plans/:planId/scheduled-services', requireAuth, requireOnboarded, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const scheduledPlan = await prisma.scheduledServicePlan.findUnique({
      where: { planInstanceId: planId },
      include: {
        items: {
          orderBy: { serviceType: 'asc' },
        },
        createdBy: { select: { id: true, displayName: true } },
        updatedBy: { select: { id: true, displayName: true } },
      },
    });

    res.json({ scheduledPlan });
  } catch (error) {
    console.error('Error fetching scheduled service plan:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled service plan' });
  }
});

/**
 * PATCH /api/scheduled-services/:scheduledPlanId
 * Update a scheduled service plan
 */
router.patch('/scheduled-services/:scheduledPlanId', requireAuth, requireOnboarded, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scheduledPlanId } = req.params;
    const userId = (req as Request & { user: { id: string; role: string } }).user.id;
    const userRole = (req as Request & { user: { role: string } }).user.role;

    if (!canManageScheduledServices(userRole)) {
      throw Errors.forbidden('Only ADMIN or CASE_MANAGER can manage scheduled services');
    }

    const validatedData = UpdateScheduledServicePlanSchema.parse(req.body);

    const existingPlan = await prisma.scheduledServicePlan.findUnique({
      where: { id: scheduledPlanId },
    });

    if (!existingPlan) {
      throw Errors.scheduledPlanNotFound(scheduledPlanId);
    }

    // Update the plan and items in a transaction
    const updatedPlan = await prisma.$transaction(async (tx) => {
      // Update status if provided
      const updateData: Prisma.ScheduledServicePlanUpdateInput = {
        updatedBy: { connect: { id: userId } },
      };
      if (validatedData.status) {
        updateData.status = validatedData.status;
      }

      await tx.scheduledServicePlan.update({
        where: { id: scheduledPlanId },
        data: updateData,
      });

      // Replace items if provided
      if (validatedData.items) {
        await tx.scheduledServiceItem.deleteMany({
          where: { scheduledPlanId },
        });

        await tx.scheduledServiceItem.createMany({
          data: validatedData.items.map(item => ({
            scheduledPlanId,
            serviceType: item.serviceType,
            expectedMinutesPerWeek: item.expectedMinutesPerWeek,
            startDate: item.startDate,
            endDate: item.endDate,
            providerRole: item.providerRole,
            location: item.location,
            notes: item.notes,
          })),
        });
      }

      return tx.scheduledServicePlan.findUnique({
        where: { id: scheduledPlanId },
        include: {
          items: { orderBy: { serviceType: 'asc' } },
          createdBy: { select: { id: true, displayName: true } },
          updatedBy: { select: { id: true, displayName: true } },
        },
      });
    });

    res.json({ scheduledPlan: updatedPlan });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error updating scheduled service plan:', error);
    next(Errors.internal('Failed to update scheduled service plan'));
  }
});

/**
 * GET /api/plans/:planId/service-variance
 * Get weekly variance report comparing expected vs delivered services
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD)
 */
router.get('/plans/:planId/service-variance', requireAuth, requireOnboarded, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { start, end } = req.query;

    if (!start || !end) {
      res.status(400).json({ error: 'Start and end dates are required (YYYY-MM-DD format)' });
      return;
    }

    const startDate = parseISO(start as string);
    const endDate = parseISO(end as string);

    // Get scheduled service plan
    const scheduledPlan = await prisma.scheduledServicePlan.findUnique({
      where: { planInstanceId: planId },
      include: {
        items: true,
      },
    });

    if (!scheduledPlan) {
      res.json({
        variance: [],
        summary: {
          totalExpected: 0,
          totalDelivered: 0,
          totalVariance: 0,
        },
      });
      return;
    }

    // Get all service logs in the date range
    const serviceLogs = await prisma.serviceLog.findMany({
      where: {
        planInstanceId: planId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Generate weekly buckets
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });

    const varianceByWeek: Array<{
      weekOf: string;
      weekEnd: string;
      byServiceType: Array<{
        serviceType: ServiceType;
        expectedMinutes: number;
        deliveredMinutes: number;
        varianceMinutes: number;
        missedSessions: number;
      }>;
      totalExpected: number;
      totalDelivered: number;
      totalVariance: number;
    }> = [];

    let grandTotalExpected = 0;
    let grandTotalDelivered = 0;

    for (const weekStart of weeks) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const clampedWeekEnd = weekEnd > endDate ? endDate : weekEnd;

      // Calculate expected minutes per service type for this week
      const serviceTypeData: Record<ServiceType, {
        expected: number;
        delivered: number;
        missed: number;
      }> = {} as Record<ServiceType, { expected: number; delivered: number; missed: number }>;

      for (const item of scheduledPlan.items) {
        // Check if this item is active during this week
        const itemStart = new Date(item.startDate);
        const itemEnd = item.endDate ? new Date(item.endDate) : null;

        if (itemStart <= clampedWeekEnd && (!itemEnd || itemEnd >= weekStart)) {
          if (!serviceTypeData[item.serviceType]) {
            serviceTypeData[item.serviceType] = { expected: 0, delivered: 0, missed: 0 };
          }
          serviceTypeData[item.serviceType].expected += item.expectedMinutesPerWeek;
        }
      }

      // Calculate delivered minutes from service logs
      const logsThisWeek = serviceLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= weekStart && logDate <= clampedWeekEnd;
      });

      for (const log of logsThisWeek) {
        if (!serviceTypeData[log.serviceType]) {
          serviceTypeData[log.serviceType] = { expected: 0, delivered: 0, missed: 0 };
        }
        serviceTypeData[log.serviceType].delivered += log.minutes;
        if (log.minutes === 0 && log.missedReason) {
          serviceTypeData[log.serviceType].missed += 1;
        }
      }

      // Build the week data
      const byServiceType = Object.entries(serviceTypeData).map(([type, data]) => ({
        serviceType: type as ServiceType,
        expectedMinutes: data.expected,
        deliveredMinutes: data.delivered,
        varianceMinutes: data.delivered - data.expected,
        missedSessions: data.missed,
      }));

      const weekTotalExpected = byServiceType.reduce((sum, s) => sum + s.expectedMinutes, 0);
      const weekTotalDelivered = byServiceType.reduce((sum, s) => sum + s.deliveredMinutes, 0);

      grandTotalExpected += weekTotalExpected;
      grandTotalDelivered += weekTotalDelivered;

      if (byServiceType.length > 0) {
        varianceByWeek.push({
          weekOf: format(weekStart, 'yyyy-MM-dd'),
          weekEnd: format(clampedWeekEnd, 'yyyy-MM-dd'),
          byServiceType,
          totalExpected: weekTotalExpected,
          totalDelivered: weekTotalDelivered,
          totalVariance: weekTotalDelivered - weekTotalExpected,
        });
      }
    }

    res.json({
      variance: varianceByWeek,
      summary: {
        totalExpected: grandTotalExpected,
        totalDelivered: grandTotalDelivered,
        totalVariance: grandTotalDelivered - grandTotalExpected,
      },
    });
  } catch (error) {
    console.error('Error calculating service variance:', error);
    res.status(500).json({ error: 'Failed to calculate service variance' });
  }
});

export default router;

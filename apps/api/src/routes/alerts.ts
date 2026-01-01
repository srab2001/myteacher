import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { Errors, ApiError } from '../errors.js';
import { AlertType } from '../types/prisma-enums.js';

const router = Router();

// ============================================
// GET USER ALERTS
// GET /api/alerts
// Returns alerts for the current user
// ============================================

router.get('/alerts', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { unreadOnly, limit = '50' } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      userId: req.user!.id,
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const alerts = await prisma.inAppAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10) || 50,
    });

    // Also get unread count
    const unreadCount = await prisma.inAppAlert.count({
      where: {
        userId: req.user!.id,
        isRead: false,
      },
    });

    res.json({ alerts, unreadCount });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching alerts:', error);
    next(Errors.internal('Failed to fetch alerts'));
  }
});

// ============================================
// GET UNREAD ALERT COUNT
// GET /api/alerts/unread-count
// ============================================

router.get('/alerts/unread-count', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unreadCount = await prisma.inAppAlert.count({
      where: {
        userId: req.user!.id,
        isRead: false,
      },
    });

    res.json({ unreadCount });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching unread count:', error);
    next(Errors.internal('Failed to fetch unread count'));
  }
});

// ============================================
// MARK ALERT AS READ
// POST /api/alerts/:alertId/read
// ============================================

router.post('/alerts/:alertId/read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alertId } = req.params;

    const alert = await prisma.inAppAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw Errors.alertNotFound(alertId);
    }

    // Ensure user owns this alert
    if (alert.userId !== req.user!.id) {
      throw Errors.forbidden('Not authorized to mark this alert as read');
    }

    const updatedAlert = await prisma.inAppAlert.update({
      where: { id: alertId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ alert: updatedAlert });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error marking alert as read:', error);
    next(Errors.internal('Failed to mark alert as read'));
  }
});

// ============================================
// MARK ALL ALERTS AS READ
// POST /api/alerts/mark-all-read
// ============================================

router.post('/alerts/mark-all-read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.inAppAlert.updateMany({
      where: {
        userId: req.user!.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error marking all alerts as read:', error);
    next(Errors.internal('Failed to mark all alerts as read'));
  }
});

// ============================================
// DELETE ALERT
// DELETE /api/alerts/:alertId
// ============================================

router.delete('/alerts/:alertId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alertId } = req.params;

    const alert = await prisma.inAppAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw Errors.alertNotFound(alertId);
    }

    // Ensure user owns this alert
    if (alert.userId !== req.user!.id) {
      throw Errors.forbidden('Not authorized to delete this alert');
    }

    await prisma.inAppAlert.delete({
      where: { id: alertId },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error deleting alert:', error);
    next(Errors.internal('Failed to delete alert'));
  }
});

// ============================================
// DELETE ALL READ ALERTS
// DELETE /api/alerts/clear-read
// ============================================

router.delete('/alerts/clear-read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.inAppAlert.deleteMany({
      where: {
        userId: req.user!.id,
        isRead: true,
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error clearing read alerts:', error);
    next(Errors.internal('Failed to clear read alerts'));
  }
});

// ============================================
// CREATE ALERT (Admin/System use)
// POST /api/alerts
// ============================================

const createAlertSchema = z.object({
  userId: z.string().uuid(),
  alertType: z.nativeEnum(AlertType),
  title: z.string().min(1),
  message: z.string().min(1),
  linkUrl: z.string().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().uuid().optional(),
});

router.post('/alerts', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only admins and case managers can create alerts for other users
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'CASE_MANAGER') {
      throw Errors.forbidden('Not authorized to create alerts');
    }

    const validatedData = createAlertSchema.parse(req.body);

    const alert = await prisma.inAppAlert.create({
      data: {
        userId: validatedData.userId,
        alertType: validatedData.alertType,
        title: validatedData.title,
        message: validatedData.message,
        linkUrl: validatedData.linkUrl,
        relatedEntityType: validatedData.relatedEntityType,
        relatedEntityId: validatedData.relatedEntityId,
      },
    });

    res.status(201).json({ alert });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error creating alert:', error);
    next(Errors.internal('Failed to create alert'));
  }
});

// ============================================
// BULK CREATE ALERTS (Admin/System use)
// POST /api/alerts/bulk
// ============================================

const bulkCreateAlertSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  alertType: z.nativeEnum(AlertType),
  title: z.string().min(1),
  message: z.string().min(1),
  linkUrl: z.string().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().uuid().optional(),
});

router.post('/alerts/bulk', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only admins can bulk create alerts
    if (req.user?.role !== 'ADMIN') {
      throw Errors.forbidden('Not authorized to bulk create alerts');
    }

    const validatedData = bulkCreateAlertSchema.parse(req.body);

    const alertData = validatedData.userIds.map(userId => ({
      userId,
      alertType: validatedData.alertType,
      title: validatedData.title,
      message: validatedData.message,
      linkUrl: validatedData.linkUrl,
      relatedEntityType: validatedData.relatedEntityType,
      relatedEntityId: validatedData.relatedEntityId,
    }));

    const result = await prisma.inAppAlert.createMany({
      data: alertData,
    });

    res.status(201).json({ created: result.count });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error bulk creating alerts:', error);
    next(Errors.internal('Failed to bulk create alerts'));
  }
});

// ============================================
// HELPER: Create Review Due Alert
// This would typically be called by a background job
// ============================================

export async function createReviewDueAlert(
  userId: string,
  studentName: string,
  planType: string,
  dueDate: Date,
  planId: string,
  scheduleId: string,
  isOverdue: boolean = false
): Promise<void> {
  const alertType = isOverdue ? AlertType.REVIEW_OVERDUE : AlertType.REVIEW_DUE_SOON;
  const title = isOverdue
    ? `Overdue: ${planType} Review for ${studentName}`
    : `${planType} Review Due Soon`;
  const message = isOverdue
    ? `The ${planType} review for ${studentName} was due on ${dueDate.toLocaleDateString()}.`
    : `The ${planType} review for ${studentName} is due on ${dueDate.toLocaleDateString()}.`;

  await prisma.inAppAlert.create({
    data: {
      userId,
      alertType,
      title,
      message,
      linkUrl: `/students/${planId.split('-')[0]}/plans/${planId}`,
      relatedEntityType: 'ReviewSchedule',
      relatedEntityId: scheduleId,
    },
  });
}

// ============================================
// GET ALERT TYPES (for reference)
// GET /api/alerts/types
// ============================================

router.get('/alert-types', requireAuth, async (_req: Request, res: Response) => {
  const alertTypes = [
    { value: 'REVIEW_DUE_SOON', label: 'Review Due Soon', description: 'A plan review is coming due' },
    { value: 'REVIEW_OVERDUE', label: 'Review Overdue', description: 'A plan review is past due' },
    { value: 'COMPLIANCE_TASK', label: 'Compliance Task', description: 'A compliance task requires attention' },
    { value: 'SIGNATURE_REQUESTED', label: 'Signature Requested', description: 'Your signature is needed on a document' },
    { value: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', description: 'A meeting has been scheduled' },
    { value: 'DOCUMENT_UPLOADED', label: 'Document Uploaded', description: 'A new document has been uploaded' },
    { value: 'GENERAL', label: 'General', description: 'General notification' },
  ];

  res.json({ alertTypes });
});

export default router;

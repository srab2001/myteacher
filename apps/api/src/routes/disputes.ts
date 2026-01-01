import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { Errors, ApiError } from '../errors.js';
import { AuditLogger } from '../services/auditLog.js';
import {
  DisputeCaseType,
  DisputeCaseStatus,
  DisputeEventType,
} from '../types/prisma-enums.js';

const router = Router();

// Helper to check if user can view disputes (all authenticated users)
function canViewDisputes(userRole: string | null | undefined): boolean {
  return !!userRole; // Any authenticated user can view
}

// Helper to check if user can edit disputes (ADMIN or CASE_MANAGER only)
function canEditDisputes(userRole: string | null | undefined): boolean {
  return userRole === 'ADMIN' || userRole === 'CASE_MANAGER';
}

// Helper to generate case number
async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.disputeCase.count({
    where: {
      caseNumber: { startsWith: `DC-${year}-` },
    },
  });
  const sequence = (count + 1).toString().padStart(4, '0');
  return `DC-${year}-${sequence}`;
}

// ============================================
// CREATE DISPUTE CASE
// POST /api/students/:studentId/disputes
// ============================================

const createDisputeSchema = z.object({
  caseType: z.nativeEnum(DisputeCaseType),
  planInstanceId: z.string().uuid().optional(),
  summary: z.string().min(1),
  filedDate: z.string().datetime().optional(),
  externalReference: z.string().optional(),
  assignedToUserId: z.string().uuid().optional(),
});

router.post('/students/:studentId/disputes', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;

    if (!canEditDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to create dispute cases');
    }

    const validatedData = createDisputeSchema.parse(req.body);

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw Errors.studentNotFound(studentId);
    }

    // If plan is specified, verify it exists and belongs to student
    if (validatedData.planInstanceId) {
      const plan = await prisma.planInstance.findUnique({
        where: { id: validatedData.planInstanceId },
      });
      if (!plan || plan.studentId !== studentId) {
        throw Errors.planNotFound(validatedData.planInstanceId);
      }
    }

    const caseNumber = await generateCaseNumber();

    // Create case with initial INTAKE event
    const disputeCase = await prisma.$transaction(async (tx) => {
      const newCase = await tx.disputeCase.create({
        data: {
          caseNumber,
          studentId,
          planInstanceId: validatedData.planInstanceId,
          caseType: validatedData.caseType,
          summary: validatedData.summary,
          filedDate: validatedData.filedDate ? new Date(validatedData.filedDate) : new Date(),
          externalReference: validatedData.externalReference,
          assignedToUserId: validatedData.assignedToUserId,
          createdByUserId: req.user!.id,
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          planInstance: {
            select: {
              id: true,
              planType: { select: { code: true, name: true } },
            },
          },
          assignedTo: { select: { id: true, displayName: true, email: true } },
          createdBy: { select: { id: true, displayName: true } },
        },
      });

      // Create initial INTAKE event
      await tx.disputeEvent.create({
        data: {
          disputeCaseId: newCase.id,
          eventType: DisputeEventType.INTAKE,
          eventDate: newCase.filedDate,
          summary: 'Case filed',
          details: validatedData.summary,
          createdByUserId: req.user!.id,
        },
      });

      return newCase;
    });

    res.status(201).json({ disputeCase });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error creating dispute case:', error);
    next(Errors.internal('Failed to create dispute case'));
  }
});

// ============================================
// GET STUDENT DISPUTE CASES
// GET /api/students/:studentId/disputes
// ============================================

router.get('/students/:studentId/disputes', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const { status, type } = req.query;

    if (!canViewDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view dispute cases');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { studentId };

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (type && typeof type === 'string') {
      where.caseType = type;
    }

    const disputeCases = await prisma.disputeCase.findMany({
      where,
      orderBy: { filedDate: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        planInstance: {
          select: {
            id: true,
            planType: { select: { code: true, name: true } },
          },
        },
        assignedTo: { select: { id: true, displayName: true } },
        _count: {
          select: { events: true, attachments: true },
        },
      },
    });

    res.json({ disputeCases });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching dispute cases:', error);
    next(Errors.internal('Failed to fetch dispute cases'));
  }
});

// ============================================
// GET ALL DISPUTE CASES (Admin view)
// GET /api/disputes
// ============================================

router.get('/disputes', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canViewDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view dispute cases');
    }

    const { status, type, assignedTo } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (type && typeof type === 'string') {
      where.caseType = type;
    }

    if (assignedTo && typeof assignedTo === 'string') {
      where.assignedToUserId = assignedTo;
    }

    const disputeCases = await prisma.disputeCase.findMany({
      where,
      orderBy: { filedDate: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        planInstance: {
          select: {
            id: true,
            planType: { select: { code: true, name: true } },
          },
        },
        assignedTo: { select: { id: true, displayName: true } },
        _count: {
          select: { events: true, attachments: true },
        },
      },
    });

    res.json({ disputeCases });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching dispute cases:', error);
    next(Errors.internal('Failed to fetch dispute cases'));
  }
});

// ============================================
// GET SINGLE DISPUTE CASE
// GET /api/disputes/:caseId
// ============================================

router.get('/disputes/:caseId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;

    if (!canViewDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view dispute cases');
    }

    const disputeCase = await prisma.disputeCase.findUnique({
      where: { id: caseId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, stateStudentId: true } },
        planInstance: {
          select: {
            id: true,
            planType: { select: { code: true, name: true } },
            startDate: true,
            endDate: true,
          },
        },
        assignedTo: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        resolvedBy: { select: { id: true, displayName: true } },
        events: {
          orderBy: { eventDate: 'desc' },
          include: {
            createdBy: { select: { id: true, displayName: true } },
          },
        },
        attachments: {
          orderBy: { uploadedAt: 'desc' },
          include: {
            uploadedBy: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!disputeCase) {
      throw Errors.disputeCaseNotFound(caseId);
    }

    // Log audit event for case viewing
    AuditLogger.caseViewed(req.user!, caseId, disputeCase.studentId, req).catch(err => {
      console.error('Failed to log audit event:', err);
    });

    res.json({ disputeCase });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching dispute case:', error);
    next(Errors.internal('Failed to fetch dispute case'));
  }
});

// ============================================
// UPDATE DISPUTE CASE
// PATCH /api/disputes/:caseId
// ============================================

const updateDisputeSchema = z.object({
  summary: z.string().min(1).optional(),
  status: z.nativeEnum(DisputeCaseStatus).optional(),
  externalReference: z.string().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  resolutionSummary: z.string().optional(),
});

router.patch('/disputes/:caseId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;

    if (!canEditDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to update dispute cases');
    }

    const validatedData = updateDisputeSchema.parse(req.body);

    const existing = await prisma.disputeCase.findUnique({
      where: { id: caseId },
    });

    if (!existing) {
      throw Errors.disputeCaseNotFound(caseId);
    }

    const updateData: Record<string, unknown> = {};
    let statusChanged = false;

    if (validatedData.summary !== undefined) {
      updateData.summary = validatedData.summary;
    }
    if (validatedData.externalReference !== undefined) {
      updateData.externalReference = validatedData.externalReference;
    }
    if (validatedData.assignedToUserId !== undefined) {
      updateData.assignedToUserId = validatedData.assignedToUserId;
    }
    if (validatedData.resolutionSummary !== undefined) {
      updateData.resolutionSummary = validatedData.resolutionSummary;
    }
    if (validatedData.status !== undefined && validatedData.status !== existing.status) {
      updateData.status = validatedData.status;
      statusChanged = true;

      // Set resolution fields if resolving/closing
      if (validatedData.status === DisputeCaseStatus.RESOLVED || validatedData.status === DisputeCaseStatus.CLOSED) {
        updateData.resolvedAt = new Date();
        updateData.resolvedByUserId = req.user!.id;
      }
    }

    // Use transaction to update case and create status change event
    const disputeCase = await prisma.$transaction(async (tx) => {
      const updated = await tx.disputeCase.update({
        where: { id: caseId },
        data: updateData,
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          planInstance: {
            select: {
              id: true,
              planType: { select: { code: true, name: true } },
            },
          },
          assignedTo: { select: { id: true, displayName: true, email: true } },
          createdBy: { select: { id: true, displayName: true } },
          resolvedBy: { select: { id: true, displayName: true } },
        },
      });

      // Create status change event if status changed
      if (statusChanged) {
        await tx.disputeEvent.create({
          data: {
            disputeCaseId: caseId,
            eventType: validatedData.status === DisputeCaseStatus.RESOLVED
              ? DisputeEventType.RESOLUTION
              : DisputeEventType.STATUS_CHANGE,
            eventDate: new Date(),
            summary: `Status changed from ${existing.status} to ${validatedData.status}`,
            details: validatedData.resolutionSummary,
            createdByUserId: req.user!.id,
          },
        });
      }

      return updated;
    });

    res.json({ disputeCase });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error updating dispute case:', error);
    next(Errors.internal('Failed to update dispute case'));
  }
});

// ============================================
// ADD DISPUTE EVENT
// POST /api/disputes/:caseId/events
// ============================================

const createEventSchema = z.object({
  eventType: z.nativeEnum(DisputeEventType),
  eventDate: z.string().datetime().optional(),
  summary: z.string().min(1),
  details: z.string().optional(),
});

router.post('/disputes/:caseId/events', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;

    if (!canEditDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to add dispute events');
    }

    const validatedData = createEventSchema.parse(req.body);

    const disputeCase = await prisma.disputeCase.findUnique({
      where: { id: caseId },
    });

    if (!disputeCase) {
      throw Errors.disputeCaseNotFound(caseId);
    }

    const event = await prisma.disputeEvent.create({
      data: {
        disputeCaseId: caseId,
        eventType: validatedData.eventType,
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : new Date(),
        summary: validatedData.summary,
        details: validatedData.details,
        createdByUserId: req.user!.id,
      },
      include: {
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    res.status(201).json({ event });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error creating dispute event:', error);
    next(Errors.internal('Failed to create dispute event'));
  }
});

// ============================================
// GET DISPUTE EVENTS
// GET /api/disputes/:caseId/events
// ============================================

router.get('/disputes/:caseId/events', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;

    if (!canViewDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view dispute events');
    }

    const events = await prisma.disputeEvent.findMany({
      where: { disputeCaseId: caseId },
      orderBy: { eventDate: 'desc' },
      include: {
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    res.json({ events });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching dispute events:', error);
    next(Errors.internal('Failed to fetch dispute events'));
  }
});

// ============================================
// ADD DISPUTE ATTACHMENT
// POST /api/disputes/:caseId/attachments
// ============================================

const createAttachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().optional(),
  description: z.string().optional(),
});

router.post('/disputes/:caseId/attachments', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;

    if (!canEditDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to add dispute attachments');
    }

    const validatedData = createAttachmentSchema.parse(req.body);

    const disputeCase = await prisma.disputeCase.findUnique({
      where: { id: caseId },
    });

    if (!disputeCase) {
      throw Errors.disputeCaseNotFound(caseId);
    }

    // Create attachment and DOCUMENT_RECEIVED event in transaction
    const [attachment] = await prisma.$transaction([
      prisma.disputeAttachment.create({
        data: {
          disputeCaseId: caseId,
          fileName: validatedData.fileName,
          fileUrl: validatedData.fileUrl,
          mimeType: validatedData.mimeType,
          fileSize: validatedData.fileSize,
          description: validatedData.description,
          uploadedByUserId: req.user!.id,
        },
        include: {
          uploadedBy: { select: { id: true, displayName: true } },
        },
      }),
      prisma.disputeEvent.create({
        data: {
          disputeCaseId: caseId,
          eventType: DisputeEventType.DOCUMENT_RECEIVED,
          eventDate: new Date(),
          summary: `Document uploaded: ${validatedData.fileName}`,
          details: validatedData.description,
          createdByUserId: req.user!.id,
        },
      }),
    ]);

    res.status(201).json({ attachment });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error creating dispute attachment:', error);
    next(Errors.internal('Failed to create dispute attachment'));
  }
});

// ============================================
// GET DISPUTE ATTACHMENTS
// GET /api/disputes/:caseId/attachments
// ============================================

router.get('/disputes/:caseId/attachments', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;

    if (!canViewDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view dispute attachments');
    }

    const attachments = await prisma.disputeAttachment.findMany({
      where: { disputeCaseId: caseId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, displayName: true } },
      },
    });

    res.json({ attachments });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching dispute attachments:', error);
    next(Errors.internal('Failed to fetch dispute attachments'));
  }
});

// ============================================
// DELETE DISPUTE ATTACHMENT
// DELETE /api/disputes/attachments/:attachmentId
// ============================================

router.delete('/disputes/attachments/:attachmentId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attachmentId } = req.params;

    if (!canEditDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to delete dispute attachments');
    }

    const attachment = await prisma.disputeAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw Errors.disputeAttachmentNotFound(attachmentId);
    }

    await prisma.disputeAttachment.delete({
      where: { id: attachmentId },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error deleting dispute attachment:', error);
    next(Errors.internal('Failed to delete dispute attachment'));
  }
});

// ============================================
// EXPORT DISPUTE CASE TO PDF (placeholder)
// GET /api/disputes/:caseId/export-pdf
// ============================================

router.get('/disputes/:caseId/export-pdf', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;

    if (!canViewDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to export dispute cases');
    }

    const disputeCase = await prisma.disputeCase.findUnique({
      where: { id: caseId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, stateStudentId: true } },
        planInstance: {
          select: {
            id: true,
            planType: { select: { code: true, name: true } },
          },
        },
        assignedTo: { select: { id: true, displayName: true } },
        createdBy: { select: { id: true, displayName: true } },
        resolvedBy: { select: { id: true, displayName: true } },
        events: {
          orderBy: { eventDate: 'asc' },
          include: {
            createdBy: { select: { id: true, displayName: true } },
          },
        },
        attachments: {
          orderBy: { uploadedAt: 'desc' },
          include: {
            uploadedBy: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!disputeCase) {
      throw Errors.disputeCaseNotFound(caseId);
    }

    // For now, return JSON data that could be used to generate PDF client-side
    // In production, you would use a PDF library like puppeteer, pdfkit, or similar
    res.json({
      exportData: {
        case: disputeCase,
        exportedAt: new Date().toISOString(),
        exportedBy: req.user!.displayName,
      },
      message: 'PDF export data ready. Implement PDF generation with preferred library.',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error exporting dispute case:', error);
    next(Errors.internal('Failed to export dispute case'));
  }
});

// ============================================
// GET DISPUTE CASE TYPES (for dropdown)
// GET /api/disputes/case-types
// ============================================

router.get('/case-types', requireAuth, async (_req: Request, res: Response) => {
  const caseTypes = [
    { value: 'SECTION504_COMPLAINT', label: 'Section 504 Complaint', description: 'Complaint related to Section 504 accommodations or services' },
    { value: 'IEP_DISPUTE', label: 'IEP Dispute', description: 'Dispute regarding IEP services, goals, or placement' },
    { value: 'RECORDS_REQUEST', label: 'Records Request', description: 'Request for educational records or documentation' },
    { value: 'OTHER', label: 'Other', description: 'Other dispute or complaint type' },
  ];

  res.json({ caseTypes });
});

// ============================================
// GET DISPUTE EVENT TYPES (for dropdown)
// GET /api/disputes/event-types
// ============================================

router.get('/event-types', requireAuth, async (_req: Request, res: Response) => {
  const eventTypes = [
    { value: 'INTAKE', label: 'Intake', description: 'Initial case filing or intake' },
    { value: 'MEETING', label: 'Meeting', description: 'Meeting held regarding the case' },
    { value: 'RESPONSE_SENT', label: 'Response Sent', description: 'Response or communication sent' },
    { value: 'DOCUMENT_RECEIVED', label: 'Document Received', description: 'Document or evidence received' },
    { value: 'RESOLUTION', label: 'Resolution', description: 'Case resolution or settlement' },
    { value: 'STATUS_CHANGE', label: 'Status Change', description: 'Case status changed' },
    { value: 'NOTE', label: 'Note', description: 'General note or comment' },
  ];

  res.json({ eventTypes });
});

// ============================================
// GET DISPUTE DASHBOARD SUMMARY
// GET /api/disputes/dashboard
// ============================================

router.get('/disputes/dashboard', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canViewDisputes(req.user?.role)) {
      throw Errors.forbidden('Not authorized to view dispute dashboard');
    }

    // Get counts by status
    const [openCount, inReviewCount, resolvedCount, closedCount] = await Promise.all([
      prisma.disputeCase.count({ where: { status: DisputeCaseStatus.OPEN } }),
      prisma.disputeCase.count({ where: { status: DisputeCaseStatus.IN_REVIEW } }),
      prisma.disputeCase.count({ where: { status: DisputeCaseStatus.RESOLVED } }),
      prisma.disputeCase.count({ where: { status: DisputeCaseStatus.CLOSED } }),
    ]);

    // Get recent open cases
    const recentCases = await prisma.disputeCase.findMany({
      where: {
        status: { in: [DisputeCaseStatus.OPEN, DisputeCaseStatus.IN_REVIEW] },
      },
      orderBy: { filedDate: 'desc' },
      take: 10,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, displayName: true } },
      },
    });

    res.json({
      summary: {
        open: openCount,
        inReview: inReviewCount,
        resolved: resolvedCount,
        closed: closedCount,
        active: openCount + inReviewCount,
      },
      recentCases,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching dispute dashboard:', error);
    next(Errors.internal('Failed to fetch dispute dashboard'));
  }
});

export default router;

/**
 * Meeting API Routes
 * Handles meeting CRUD, evidence upload, close, and plan implementation
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  RulePlanType,
  MeetingStatus,
  ParentDeliveryMethod,
  MeetingTypeCode,
} from '../types/prisma-enums.js';
import {
  getActiveRulePack,
  evaluateMeetingEnforcement,
  calculateDueDates,
  canCloseMeeting,
  canImplementPlan,
} from '../services/rulesEvaluator.js';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateMeetingSchema = z.object({
  studentId: z.string().uuid(),
  planInstanceId: z.string().uuid().optional().nullable(),
  planType: z.nativeEnum(RulePlanType),
  meetingTypeCode: z.nativeEnum(MeetingTypeCode),
  scheduledAt: z.string().transform((s) => new Date(s)),
  parentDeliveryMethod: z.nativeEnum(ParentDeliveryMethod).optional(),
  isContinued: z.boolean().optional().default(false),
  continuedFromMeetingId: z.string().uuid().optional().nullable(),
});

const UpdateMeetingSchema = z.object({
  scheduledAt: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  heldAt: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  parentDeliveryMethod: z.nativeEnum(ParentDeliveryMethod).optional(),
  mutualAgreementForContinuedDate: z.boolean().optional(),
  noticeWaiverSigned: z.boolean().optional(),
  parentRecording: z.boolean().optional(),
  staffRecording: z.boolean().optional(),
  preDocsDeliveredAt: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  preDocsDeliveryMethod: z.nativeEnum(ParentDeliveryMethod).optional().nullable(),
  postDocsDeliveredAt: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  postDocsDeliveryMethod: z.nativeEnum(ParentDeliveryMethod).optional().nullable(),
  consentStatus: z.enum(['PENDING', 'OBTAINED', 'REFUSED']).optional(),
  consentObtainedAt: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  outcomeNotes: z.string().optional(),
  actionItems: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
  })).optional(),
});

const AddEvidenceSchema = z.object({
  evidenceTypeKey: z.string(),
  note: z.string().optional(),
  evidenceDate: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  deliveryMethod: z.nativeEnum(ParentDeliveryMethod).optional(),
});

// ============================================
// MEETING CRUD ENDPOINTS
// ============================================

/**
 * GET /api/meetings/student/:studentId
 * List all meetings for a student
 */
router.get('/student/:studentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { planType, status } = req.query;

    const where: Prisma.PlanMeetingWhereInput = { studentId };

    if (planType && Object.values(RulePlanType).includes(planType as RulePlanType)) {
      where.planType = planType as RulePlanType;
    }
    if (status && Object.values(MeetingStatus).includes(status as MeetingStatus)) {
      where.status = status as MeetingStatus;
    }

    const meetings = await prisma.planMeeting.findMany({
      where,
      include: {
        meetingType: true,
        planInstance: {
          include: {
            planType: true,
          },
        },
        evidence: {
          include: {
            evidenceType: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            evidence: true,
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    res.json({ meetings });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

/**
 * GET /api/meetings/:id
 * Get a specific meeting with full details
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const meeting = await prisma.planMeeting.findUnique({
      where: { id },
      include: {
        meetingType: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            recordId: true,
            grade: true,
            schoolName: true,
          },
        },
        planInstance: {
          include: {
            planType: true,
            schema: true,
          },
        },
        continuedFromMeeting: {
          select: {
            id: true,
            scheduledAt: true,
            meetingType: { select: { name: true } },
          },
        },
        evidence: {
          include: {
            evidenceType: true,
            fileUpload: true,
            createdBy: {
              select: { displayName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          orderBy: [{ isCompleted: 'asc' }, { dueDate: 'asc' }],
        },
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get rule pack and enforcement info
    const rulePack = await getActiveRulePack('DISTRICT', 'HCPSS', meeting.planType);
    const enforcement = await evaluateMeetingEnforcement(id, rulePack);
    const dueDates = calculateDueDates(meeting.scheduledAt, rulePack);

    res.json({
      meeting,
      enforcement,
      dueDates,
      rulePack: rulePack ? {
        id: rulePack.id,
        name: rulePack.name,
        version: rulePack.version,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

/**
 * POST /api/meetings
 * Create a new meeting
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = CreateMeetingSchema.parse(req.body);
    const userId = req.user?.id;

    // Get meeting type
    const meetingType = await prisma.meetingType.findFirst({
      where: { code: data.meetingTypeCode },
    });

    if (!meetingType) {
      return res.status(400).json({ error: 'Invalid meeting type' });
    }

    // Get applicable rule pack
    const rulePack = await getActiveRulePack('DISTRICT', 'HCPSS', data.planType);

    const meeting = await prisma.planMeeting.create({
      data: {
        studentId: data.studentId,
        planInstanceId: data.planInstanceId,
        planType: data.planType,
        meetingTypeId: meetingType.id,
        scheduledAt: data.scheduledAt,
        parentDeliveryMethod: data.parentDeliveryMethod,
        isContinued: data.isContinued,
        continuedFromMeetingId: data.continuedFromMeetingId,
        status: 'SCHEDULED',
        rulePackId: rulePack?.id,
        rulePackVersion: rulePack?.version,
        createdByUserId: userId,
      },
      include: {
        meetingType: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({
      meeting,
      dueDates: calculateDueDates(meeting.scheduledAt, rulePack),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

/**
 * PATCH /api/meetings/:id
 * Update a meeting
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateMeetingSchema.parse(req.body);

    // Get existing meeting
    const existingMeeting = await prisma.planMeeting.findUnique({
      where: { id },
    });

    if (!existingMeeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Build update data
    const updateData: Prisma.PlanMeetingUpdateInput = {};

    if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt;
    if (data.heldAt !== undefined) {
      updateData.heldAt = data.heldAt;
      if (data.heldAt) {
        updateData.status = 'HELD';
      }
    }
    if (data.parentDeliveryMethod !== undefined) updateData.parentDeliveryMethod = data.parentDeliveryMethod;
    if (data.mutualAgreementForContinuedDate !== undefined) updateData.mutualAgreementForContinuedDate = data.mutualAgreementForContinuedDate;
    if (data.noticeWaiverSigned !== undefined) updateData.noticeWaiverSigned = data.noticeWaiverSigned;
    if (data.parentRecording !== undefined) updateData.parentRecording = data.parentRecording;
    if (data.staffRecording !== undefined) updateData.staffRecording = data.staffRecording;
    if (data.preDocsDeliveredAt !== undefined) updateData.preDocsDeliveredAt = data.preDocsDeliveredAt;
    if (data.preDocsDeliveryMethod !== undefined) updateData.preDocsDeliveryMethod = data.preDocsDeliveryMethod;
    if (data.postDocsDeliveredAt !== undefined) updateData.postDocsDeliveredAt = data.postDocsDeliveredAt;
    if (data.postDocsDeliveryMethod !== undefined) updateData.postDocsDeliveryMethod = data.postDocsDeliveryMethod;
    if (data.consentStatus !== undefined) updateData.consentStatus = data.consentStatus;
    if (data.consentObtainedAt !== undefined) updateData.consentObtainedAt = data.consentObtainedAt;
    if (data.outcomeNotes !== undefined) updateData.outcomeNotes = data.outcomeNotes;
    if (data.actionItems !== undefined) updateData.actionItems = data.actionItems as Prisma.InputJsonValue;

    const meeting = await prisma.planMeeting.update({
      where: { id },
      data: updateData,
      include: {
        meetingType: true,
        evidence: {
          include: { evidenceType: true },
        },
      },
    });

    // Get enforcement status
    const rulePack = await getActiveRulePack('DISTRICT', 'HCPSS', meeting.planType);
    const enforcement = await evaluateMeetingEnforcement(id, rulePack);

    res.json({ meeting, enforcement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// ============================================
// EVIDENCE ENDPOINTS
// ============================================

/**
 * POST /api/meetings/:id/evidence
 * Add evidence to a meeting
 */
router.post('/:id/evidence', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = AddEvidenceSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify meeting exists
    const meeting = await prisma.planMeeting.findUnique({ where: { id } });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get evidence type by key
    const evidenceType = await prisma.ruleEvidenceType.findFirst({
      where: { key: data.evidenceTypeKey },
    });

    if (!evidenceType) {
      return res.status(400).json({ error: 'Invalid evidence type' });
    }

    // Create or update evidence (upsert based on unique constraint)
    const evidence = await prisma.meetingEvidence.upsert({
      where: {
        meetingId_evidenceTypeId: {
          meetingId: id,
          evidenceTypeId: evidenceType.id,
        },
      },
      create: {
        meetingId: id,
        evidenceTypeId: evidenceType.id,
        note: data.note,
        evidenceDate: data.evidenceDate,
        deliveryMethod: data.deliveryMethod,
        createdByUserId: userId,
      },
      update: {
        note: data.note,
        evidenceDate: data.evidenceDate,
        deliveryMethod: data.deliveryMethod,
      },
      include: {
        evidenceType: true,
        createdBy: { select: { displayName: true } },
      },
    });

    // Get updated enforcement status
    const rulePack = await getActiveRulePack('DISTRICT', 'HCPSS', meeting.planType);
    const enforcement = await evaluateMeetingEnforcement(id, rulePack);

    res.status(201).json({ evidence, enforcement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error adding evidence:', error);
    res.status(500).json({ error: 'Failed to add evidence' });
  }
});

/**
 * DELETE /api/meetings/:id/evidence/:evidenceId
 * Remove evidence from a meeting
 */
router.delete('/:id/evidence/:evidenceId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, evidenceId } = req.params;

    // Verify evidence exists and belongs to this meeting
    const evidence = await prisma.meetingEvidence.findFirst({
      where: { id: evidenceId, meetingId: id },
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    await prisma.meetingEvidence.delete({ where: { id: evidenceId } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({ error: 'Failed to delete evidence' });
  }
});

// ============================================
// MEETING WORKFLOW ENDPOINTS
// ============================================

/**
 * POST /api/meetings/:id/mark-held
 * Mark a meeting as held
 */
router.post('/:id/mark-held', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { heldAt } = req.body;

    const meeting = await prisma.planMeeting.update({
      where: { id },
      data: {
        status: 'HELD',
        heldAt: heldAt ? new Date(heldAt) : new Date(),
      },
      include: {
        meetingType: true,
      },
    });

    res.json({ meeting });
  } catch (error) {
    console.error('Error marking meeting as held:', error);
    res.status(500).json({ error: 'Failed to mark meeting as held' });
  }
});

/**
 * POST /api/meetings/:id/close
 * Close a meeting (runs enforcement checks)
 */
router.post('/:id/close', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get meeting
    const meeting = await prisma.planMeeting.findUnique({
      where: { id },
      include: { meetingType: true },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if meeting can be closed
    const closeCheck = await canCloseMeeting(id, 'DISTRICT', 'HCPSS', meeting.planType);

    if (!closeCheck.allowed) {
      return res.status(400).json({
        error: 'Cannot close meeting',
        code: 'ENFORCEMENT_FAILED',
        errors: closeCheck.errors,
      });
    }

    // Close the meeting
    const closedMeeting = await prisma.planMeeting.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedByUserId: userId,
      },
      include: {
        meetingType: true,
        evidence: { include: { evidenceType: true } },
      },
    });

    res.json({ meeting: closedMeeting, message: 'Meeting closed successfully' });
  } catch (error) {
    console.error('Error closing meeting:', error);
    res.status(500).json({ error: 'Failed to close meeting' });
  }
});

/**
 * POST /api/meetings/:id/cancel
 * Cancel a meeting
 */
router.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const meeting = await prisma.planMeeting.update({
      where: { id },
      data: { status: 'CANCELED' },
      include: { meetingType: true },
    });

    res.json({ meeting });
  } catch (error) {
    console.error('Error canceling meeting:', error);
    res.status(500).json({ error: 'Failed to cancel meeting' });
  }
});

/**
 * POST /api/plans/:planId/implement
 * Implement a plan (runs initial IEP consent gate)
 */
router.post('/plans/:planId/implement', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'meetingId is required' });
    }

    // Get meeting
    const meeting = await prisma.planMeeting.findUnique({
      where: { id: meetingId },
      include: { meetingType: true },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if it's an initial meeting and if consent is required
    const implementCheck = await canImplementPlan(meetingId, 'DISTRICT', 'HCPSS', meeting.planType);

    if (!implementCheck.allowed) {
      return res.status(400).json({
        error: 'Cannot implement plan',
        code: 'CONSENT_REQUIRED',
        errors: implementCheck.errors,
      });
    }

    // Update plan status to active/implemented
    const plan = await prisma.planInstance.update({
      where: { id: planId },
      data: { status: 'ACTIVE' },
      include: {
        planType: true,
        student: { select: { firstName: true, lastName: true } },
      },
    });

    res.json({ plan, message: 'Plan implemented successfully' });
  } catch (error) {
    console.error('Error implementing plan:', error);
    res.status(500).json({ error: 'Failed to implement plan' });
  }
});

// ============================================
// DOCUMENT DELIVERY ENDPOINTS
// ============================================

/**
 * POST /api/meetings/:id/mark-pre-docs-sent
 * Mark pre-meeting documents as sent
 */
router.post('/:id/mark-pre-docs-sent', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sentAt, deliveryMethod } = req.body;
    const userId = req.user?.id;

    const meeting = await prisma.planMeeting.findUnique({ where: { id } });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Update meeting
    const updatedMeeting = await prisma.planMeeting.update({
      where: { id },
      data: {
        preDocsDeliveredAt: sentAt ? new Date(sentAt) : new Date(),
        preDocsDeliveryMethod: deliveryMethod,
      },
    });

    // Also create evidence record
    const evidenceType = await prisma.ruleEvidenceType.findFirst({
      where: { key: 'PARENT_DOCS_SENT' },
    });

    if (evidenceType && userId) {
      await prisma.meetingEvidence.upsert({
        where: {
          meetingId_evidenceTypeId: {
            meetingId: id,
            evidenceTypeId: evidenceType.id,
          },
        },
        create: {
          meetingId: id,
          evidenceTypeId: evidenceType.id,
          evidenceDate: sentAt ? new Date(sentAt) : new Date(),
          deliveryMethod,
          createdByUserId: userId,
        },
        update: {
          evidenceDate: sentAt ? new Date(sentAt) : new Date(),
          deliveryMethod,
        },
      });
    }

    res.json({ meeting: updatedMeeting, message: 'Pre-meeting documents marked as sent' });
  } catch (error) {
    console.error('Error marking pre-docs sent:', error);
    res.status(500).json({ error: 'Failed to mark pre-docs sent' });
  }
});

/**
 * POST /api/meetings/:id/mark-post-docs-sent
 * Mark post-meeting documents as sent
 */
router.post('/:id/mark-post-docs-sent', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sentAt, deliveryMethod } = req.body;
    const userId = req.user?.id;

    const meeting = await prisma.planMeeting.findUnique({ where: { id } });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Update meeting
    const updatedMeeting = await prisma.planMeeting.update({
      where: { id },
      data: {
        postDocsDeliveredAt: sentAt ? new Date(sentAt) : new Date(),
        postDocsDeliveryMethod: deliveryMethod,
      },
    });

    // Also create evidence record
    const evidenceType = await prisma.ruleEvidenceType.findFirst({
      where: { key: 'FINAL_DOC_SENT' },
    });

    if (evidenceType && userId) {
      await prisma.meetingEvidence.upsert({
        where: {
          meetingId_evidenceTypeId: {
            meetingId: id,
            evidenceTypeId: evidenceType.id,
          },
        },
        create: {
          meetingId: id,
          evidenceTypeId: evidenceType.id,
          evidenceDate: sentAt ? new Date(sentAt) : new Date(),
          deliveryMethod,
          createdByUserId: userId,
        },
        update: {
          evidenceDate: sentAt ? new Date(sentAt) : new Date(),
          deliveryMethod,
        },
      });
    }

    res.json({ meeting: updatedMeeting, message: 'Post-meeting documents marked as sent' });
  } catch (error) {
    console.error('Error marking post-docs sent:', error);
    res.status(500).json({ error: 'Failed to mark post-docs sent' });
  }
});

// ============================================
// TASK ENDPOINTS
// ============================================

/**
 * POST /api/meetings/:id/tasks
 * Add a task to a meeting
 */
router.post('/:id/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, assignedTo, dueDate } = req.body;

    const meeting = await prisma.planMeeting.findUnique({ where: { id } });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const task = await prisma.meetingTask.create({
      data: {
        meetingId: id,
        title,
        description,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json({ task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * PATCH /api/meetings/:id/tasks/:taskId
 * Update a meeting task
 */
router.patch('/:id/tasks/:taskId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { title, description, assignedTo, dueDate, isCompleted } = req.body;

    const updateData: Prisma.MeetingTaskUpdateInput = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      if (isCompleted) {
        updateData.completedAt = new Date();
      }
    }

    const task = await prisma.meetingTask.update({
      where: { id: taskId },
      data: updateData,
    });

    res.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * DELETE /api/meetings/:id/tasks/:taskId
 * Delete a meeting task
 */
router.delete('/:id/tasks/:taskId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    await prisma.meetingTask.delete({ where: { id: taskId } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;

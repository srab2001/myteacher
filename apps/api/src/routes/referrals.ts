import { Router } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';

const router = Router();

// ============================================
// Zod Schemas for Validation
// ============================================

const createReferralSchema = z.object({
  referralType: z.enum(['IDEA_EVALUATION', 'SECTION_504_EVALUATION', 'BEHAVIOR_SUPPORT']),
  source: z.enum(['TEACHER', 'PARENT', 'ADMINISTRATOR', 'STUDENT_SUPPORT_TEAM', 'OTHER']),
  sourceOther: z.string().optional(),
  referredByName: z.string().optional(),
  referredByEmail: z.string().email().optional().or(z.literal('')),
  reasonForReferral: z.string().min(10),
  areasOfConcern: z.array(z.string()).optional(),
  interventionsTried: z.string().optional(),
  supportingData: z.string().optional(),
  parentContactEmail: z.string().email().optional().or(z.literal('')),
  parentContactPhone: z.string().optional(),
  evaluationDueDate: z.string().optional(),
  consentDueDate: z.string().optional(),
  internalNotes: z.string().optional(),
});

const updateReferralSchema = createReferralSchema.partial().extend({
  status: z.enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CONSENT_REQUESTED', 'CONSENT_RECEIVED', 'CONSENT_DECLINED', 'CLOSED']).optional(),
  caseManagerId: z.string().uuid().optional().nullable(),
  closedReason: z.string().optional(),
});

const addTimelineEventSchema = z.object({
  eventType: z.string(),
  description: z.string(),
  eventData: z.record(z.unknown()).optional(),
});

// ============================================
// Helper Functions
// ============================================

// Check if user has access to the student (teacher owns student or is admin/case manager)
async function canAccessStudent(userId: string, userRole: string | null | undefined, studentId: string): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  const student = await prisma.student.findFirst({
    where: { id: studentId },
    select: { teacherId: true },
  });

  if (!student) return false;

  // Case managers and teachers can access if they own the student
  return student.teacherId === userId;
}

// Check if user can modify the referral
function canModifyReferral(userRole: string | null | undefined, referral: { createdByUserId: string; status: string }, userId: string): boolean {
  if (userRole === 'ADMIN' || userRole === 'CASE_MANAGER') return true;
  if (userRole === 'TEACHER' && referral.createdByUserId === userId && referral.status === 'DRAFT') return true;
  return false;
}

// Create a timeline event for audit trail
async function createTimelineEvent(
  referralId: string,
  eventType: string,
  description: string,
  performedByUserId: string,
  eventData?: Record<string, unknown>
) {
  return prisma.referralTimelineEvent.create({
    data: {
      referralId,
      eventType,
      description,
      performedByUserId,
      eventData: eventData as Prisma.InputJsonValue,
    },
  });
}

// ============================================
// Routes
// ============================================

// GET /api/students/:studentId/referrals - List referrals for a student
router.get('/students/:studentId/referrals', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, type } = req.query;

    // Check access
    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const where: Prisma.ReferralWhereInput = { studentId };
    if (status && ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CONSENT_REQUESTED', 'CONSENT_RECEIVED', 'CONSENT_DECLINED', 'CLOSED'].includes(status as string)) {
      where.status = status as 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'CONSENT_REQUESTED' | 'CONSENT_RECEIVED' | 'CONSENT_DECLINED' | 'CLOSED';
    }
    if (type && ['IDEA_EVALUATION', 'SECTION_504_EVALUATION', 'BEHAVIOR_SUPPORT'].includes(type as string)) {
      where.referralType = type as 'IDEA_EVALUATION' | 'SECTION_504_EVALUATION' | 'BEHAVIOR_SUPPORT';
    }

    const referrals = await prisma.referral.findMany({
      where,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, grade: true },
        },
        caseManager: {
          select: { id: true, displayName: true, email: true },
        },
        referredBy: {
          select: { id: true, displayName: true },
        },
        createdBy: {
          select: { id: true, displayName: true },
        },
        _count: {
          select: { attachments: true, timelineEvents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ referrals });
  } catch (error) {
    console.error('Referrals fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

// POST /api/students/:studentId/referrals - Create a new referral
router.post('/students/:studentId/referrals', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { studentId } = req.params;
    const data = createReferralSchema.parse(req.body);

    // Check access
    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Create the referral
    const referral = await prisma.referral.create({
      data: {
        studentId,
        referralType: data.referralType,
        source: data.source,
        sourceOther: data.sourceOther,
        referredByUserId: req.user!.id,
        referredByName: data.referredByName,
        referredByEmail: data.referredByEmail || null,
        reasonForReferral: data.reasonForReferral,
        areasOfConcern: data.areasOfConcern as Prisma.InputJsonValue,
        interventionsTried: data.interventionsTried,
        supportingData: data.supportingData,
        parentContactEmail: data.parentContactEmail || null,
        parentContactPhone: data.parentContactPhone,
        evaluationDueDate: data.evaluationDueDate ? new Date(data.evaluationDueDate) : null,
        consentDueDate: data.consentDueDate ? new Date(data.consentDueDate) : null,
        internalNotes: data.internalNotes,
        createdByUserId: req.user!.id,
        status: 'DRAFT',
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdBy: {
          select: { id: true, displayName: true },
        },
      },
    });

    // Create timeline event
    await createTimelineEvent(
      referral.id,
      'CREATED',
      `Referral created by ${req.user!.displayName}`,
      req.user!.id,
      { referralType: data.referralType, source: data.source }
    );

    res.status(201).json({ referral });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Referral creation error:', error);
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

// GET /api/referrals/:referralId - Get a specific referral
router.get('/referrals/:referralId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { referralId } = req.params;

    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, grade: true, schoolName: true, dateOfBirth: true },
        },
        caseManager: {
          select: { id: true, displayName: true, email: true },
        },
        referredBy: {
          select: { id: true, displayName: true, email: true },
        },
        closedBy: {
          select: { id: true, displayName: true },
        },
        createdBy: {
          select: { id: true, displayName: true },
        },
        attachments: {
          include: {
            fileUpload: true,
            createdBy: {
              select: { id: true, displayName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        timelineEvents: {
          include: {
            performedBy: {
              select: { id: true, displayName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Check access
    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, referral.studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ referral });
  } catch (error) {
    console.error('Referral fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch referral' });
  }
});

// PATCH /api/referrals/:referralId - Update a referral
router.patch('/referrals/:referralId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { referralId } = req.params;
    const data = updateReferralSchema.parse(req.body);

    // Fetch existing referral
    const existingReferral = await prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Check access
    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, existingReferral.studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user can modify
    if (!canModifyReferral(req.user!.role, existingReferral, req.user!.id)) {
      return res.status(403).json({ error: 'You do not have permission to modify this referral' });
    }

    // Track status change for timeline
    const statusChanged = data.status && data.status !== existingReferral.status;
    const oldStatus = existingReferral.status;

    // Build update data
    const updateData: Prisma.ReferralUpdateInput = {};

    if (data.referralType) updateData.referralType = data.referralType;
    if (data.source) updateData.source = data.source;
    if (data.sourceOther !== undefined) updateData.sourceOther = data.sourceOther;
    if (data.referredByName !== undefined) updateData.referredByName = data.referredByName;
    if (data.referredByEmail !== undefined) updateData.referredByEmail = data.referredByEmail || null;
    if (data.reasonForReferral) updateData.reasonForReferral = data.reasonForReferral;
    if (data.areasOfConcern) updateData.areasOfConcern = data.areasOfConcern as Prisma.InputJsonValue;
    if (data.interventionsTried !== undefined) updateData.interventionsTried = data.interventionsTried;
    if (data.supportingData !== undefined) updateData.supportingData = data.supportingData;
    if (data.parentContactEmail !== undefined) updateData.parentContactEmail = data.parentContactEmail || null;
    if (data.parentContactPhone !== undefined) updateData.parentContactPhone = data.parentContactPhone;
    if (data.evaluationDueDate !== undefined) {
      updateData.evaluationDueDate = data.evaluationDueDate ? new Date(data.evaluationDueDate) : null;
    }
    if (data.consentDueDate !== undefined) {
      updateData.consentDueDate = data.consentDueDate ? new Date(data.consentDueDate) : null;
    }
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;
    if (data.caseManagerId !== undefined) {
      updateData.caseManager = data.caseManagerId ? { connect: { id: data.caseManagerId } } : { disconnect: true };
    }

    // Handle status changes
    if (data.status) {
      updateData.status = data.status;

      if (data.status === 'SUBMITTED' && existingReferral.status === 'DRAFT') {
        updateData.submittedAt = new Date();
      }
      if (data.status === 'CONSENT_REQUESTED') {
        updateData.consentRequestedAt = new Date();
        updateData.consentStatus = 'REQUESTED';
      }
      if (data.status === 'CONSENT_RECEIVED') {
        updateData.consentReceivedAt = new Date();
        updateData.consentStatus = 'RECEIVED';
      }
      if (data.status === 'CONSENT_DECLINED') {
        updateData.consentDeclinedAt = new Date();
        updateData.consentStatus = 'DECLINED';
      }
      if (data.status === 'CLOSED') {
        updateData.closedAt = new Date();
        updateData.closedBy = { connect: { id: req.user!.id } };
        if (data.closedReason) updateData.closedReason = data.closedReason;
      }
    }

    const referral = await prisma.referral.update({
      where: { id: referralId },
      data: updateData,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        caseManager: {
          select: { id: true, displayName: true, email: true },
        },
        createdBy: {
          select: { id: true, displayName: true },
        },
      },
    });

    // Create timeline event for status change
    if (statusChanged) {
      await createTimelineEvent(
        referral.id,
        'STATUS_CHANGE',
        `Status changed from ${oldStatus} to ${data.status} by ${req.user!.displayName}`,
        req.user!.id,
        { from: oldStatus, to: data.status }
      );
    }

    res.json({ referral });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Referral update error:', error);
    res.status(500).json({ error: 'Failed to update referral' });
  }
});

// POST /api/referrals/:referralId/submit - Submit a draft referral
router.post('/referrals/:referralId/submit', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { referralId } = req.params;

    const existingReferral = await prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Check access
    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, existingReferral.studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existingReferral.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft referrals can be submitted' });
    }

    const referral = await prisma.referral.update({
      where: { id: referralId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await createTimelineEvent(
      referral.id,
      'SUBMITTED',
      `Referral submitted by ${req.user!.displayName}`,
      req.user!.id
    );

    res.json({ referral });
  } catch (error) {
    console.error('Referral submit error:', error);
    res.status(500).json({ error: 'Failed to submit referral' });
  }
});

// POST /api/referrals/:referralId/request-consent - Request parent consent
router.post('/referrals/:referralId/request-consent', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { referralId } = req.params;

    // Only admin and case managers can request consent
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'CASE_MANAGER') {
      return res.status(403).json({ error: 'Only administrators and case managers can request consent' });
    }

    const existingReferral = await prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    if (!['SUBMITTED', 'IN_REVIEW'].includes(existingReferral.status)) {
      return res.status(400).json({ error: 'Referral must be submitted or in review to request consent' });
    }

    const referral = await prisma.referral.update({
      where: { id: referralId },
      data: {
        status: 'CONSENT_REQUESTED',
        consentRequestedAt: new Date(),
        consentStatus: 'REQUESTED',
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await createTimelineEvent(
      referral.id,
      'CONSENT_REQUESTED',
      `Consent requested by ${req.user!.displayName}`,
      req.user!.id
    );

    res.json({ referral });
  } catch (error) {
    console.error('Consent request error:', error);
    res.status(500).json({ error: 'Failed to request consent' });
  }
});

// POST /api/referrals/:referralId/record-consent - Record consent received/declined
router.post('/referrals/:referralId/record-consent', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { referralId } = req.params;
    const { received, declineReason } = req.body;

    // Only admin and case managers can record consent
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'CASE_MANAGER') {
      return res.status(403).json({ error: 'Only administrators and case managers can record consent' });
    }

    const existingReferral = await prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    if (existingReferral.status !== 'CONSENT_REQUESTED') {
      return res.status(400).json({ error: 'Consent must be requested before recording response' });
    }

    const updateData: Prisma.ReferralUpdateInput = received
      ? {
          status: 'CONSENT_RECEIVED',
          consentReceivedAt: new Date(),
          consentStatus: 'RECEIVED',
        }
      : {
          status: 'CONSENT_DECLINED',
          consentDeclinedAt: new Date(),
          consentStatus: 'DECLINED',
          consentDeclineReason: declineReason || null,
        };

    const referral = await prisma.referral.update({
      where: { id: referralId },
      data: updateData,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await createTimelineEvent(
      referral.id,
      received ? 'CONSENT_RECEIVED' : 'CONSENT_DECLINED',
      received
        ? `Consent received, recorded by ${req.user!.displayName}`
        : `Consent declined, recorded by ${req.user!.displayName}${declineReason ? `: ${declineReason}` : ''}`,
      req.user!.id,
      { received, declineReason }
    );

    res.json({ referral });
  } catch (error) {
    console.error('Record consent error:', error);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

// POST /api/referrals/:referralId/close - Close a referral
router.post('/referrals/:referralId/close', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { referralId } = req.params;
    const { reason } = req.body;

    // Only admin and case managers can close referrals
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'CASE_MANAGER') {
      return res.status(403).json({ error: 'Only administrators and case managers can close referrals' });
    }

    const existingReferral = await prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    if (existingReferral.status === 'CLOSED') {
      return res.status(400).json({ error: 'Referral is already closed' });
    }

    const referral = await prisma.referral.update({
      where: { id: referralId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedByUserId: req.user!.id,
        closedReason: reason || null,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await createTimelineEvent(
      referral.id,
      'CLOSED',
      `Referral closed by ${req.user!.displayName}${reason ? `: ${reason}` : ''}`,
      req.user!.id,
      { reason }
    );

    res.json({ referral });
  } catch (error) {
    console.error('Close referral error:', error);
    res.status(500).json({ error: 'Failed to close referral' });
  }
});

// POST /api/referrals/:referralId/assign - Assign a case manager
router.post('/referrals/:referralId/assign', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { referralId } = req.params;
    const { caseManagerId } = req.body;

    // Only admins can assign case managers
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only administrators can assign case managers' });
    }

    const existingReferral = await prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Verify case manager exists and has appropriate role
    if (caseManagerId) {
      const caseManager = await prisma.appUser.findUnique({
        where: { id: caseManagerId },
      });

      if (!caseManager) {
        return res.status(404).json({ error: 'Case manager not found' });
      }

      if (caseManager.role !== 'CASE_MANAGER' && caseManager.role !== 'ADMIN') {
        return res.status(400).json({ error: 'User must be a case manager or administrator' });
      }
    }

    const referral = await prisma.referral.update({
      where: { id: referralId },
      data: {
        caseManagerId: caseManagerId || null,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        caseManager: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    await createTimelineEvent(
      referral.id,
      'ASSIGNED',
      caseManagerId
        ? `Case manager assigned: ${referral.caseManager?.displayName} by ${req.user!.displayName}`
        : `Case manager unassigned by ${req.user!.displayName}`,
      req.user!.id,
      { caseManagerId }
    );

    res.json({ referral });
  } catch (error) {
    console.error('Assign case manager error:', error);
    res.status(500).json({ error: 'Failed to assign case manager' });
  }
});

// POST /api/referrals/:referralId/timeline - Add a timeline event/note
router.post('/referrals/:referralId/timeline', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { referralId } = req.params;
    const data = addTimelineEventSchema.parse(req.body);

    const existingReferral = await prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Check access
    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, existingReferral.studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const event = await createTimelineEvent(
      referralId,
      data.eventType,
      data.description,
      req.user!.id,
      data.eventData
    );

    const eventWithUser = await prisma.referralTimelineEvent.findUnique({
      where: { id: event.id },
      include: {
        performedBy: {
          select: { id: true, displayName: true },
        },
      },
    });

    res.status(201).json({ event: eventWithUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Add timeline event error:', error);
    res.status(500).json({ error: 'Failed to add timeline event' });
  }
});

// GET /api/referrals/:referralId/timeline - Get timeline events
router.get('/referrals/:referralId/timeline', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { referralId } = req.params;

    const existingReferral = await prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Check access
    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, existingReferral.studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const events = await prisma.referralTimelineEvent.findMany({
      where: { referralId },
      include: {
        performedBy: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ events });
  } catch (error) {
    console.error('Fetch timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// DELETE /api/referrals/:referralId - Delete a referral (draft only)
router.delete('/referrals/:referralId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { referralId } = req.params;

    const existingReferral = await prisma.referral.findUnique({
      where: { id: referralId },
    });

    if (!existingReferral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Only drafts can be deleted
    if (existingReferral.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft referrals can be deleted' });
    }

    // Check access
    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, existingReferral.studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only creator or admin can delete
    if (existingReferral.createdByUserId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the creator or an administrator can delete this referral' });
    }

    await prisma.referral.delete({
      where: { id: referralId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete referral error:', error);
    res.status(500).json({ error: 'Failed to delete referral' });
  }
});

export default router;

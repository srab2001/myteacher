import { Router } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';

const router = Router();

// ============================================
// Zod Schemas for Validation
// ============================================

const CASE_TYPE_VALUES = ['IDEA', 'SECTION_504'] as const;
const CASE_STATUS_VALUES = ['OPEN', 'ASSESSMENTS_IN_PROGRESS', 'MEETING_SCHEDULED', 'DETERMINATION_COMPLETE', 'CLOSED'] as const;
const DETERMINATION_OUTCOME_VALUES = ['ELIGIBLE', 'NOT_ELIGIBLE', 'PENDING_ADDITIONAL_DATA'] as const;
const DISABILITY_CATEGORY_VALUES = [
  'AUTISM', 'DEAF_BLINDNESS', 'DEAFNESS', 'DEVELOPMENTAL_DELAY', 'EMOTIONAL_DISTURBANCE',
  'HEARING_IMPAIRMENT', 'INTELLECTUAL_DISABILITY', 'MULTIPLE_DISABILITIES', 'ORTHOPEDIC_IMPAIRMENT',
  'OTHER_HEALTH_IMPAIRMENT', 'SPECIFIC_LEARNING_DISABILITY', 'SPEECH_LANGUAGE_IMPAIRMENT',
  'TRAUMATIC_BRAIN_INJURY', 'VISUAL_IMPAIRMENT'
] as const;
const ASSESSMENT_TYPE_VALUES = [
  'AUDIOLOGICAL', 'EDUCATIONAL', 'OCCUPATIONAL_THERAPY', 'PHYSICAL_THERAPY',
  'PSYCHOLOGICAL', 'SPEECH_LANGUAGE', 'OTHER'
] as const;
const ASSESSMENT_STATUS_VALUES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
const PARTICIPANT_ROLE_VALUES = [
  'PARENT', 'GENERAL_ED_TEACHER', 'SPECIAL_ED_TEACHER', 'SCHOOL_PSYCHOLOGIST', 'ADMINISTRATOR',
  'SPEECH_LANGUAGE_PATHOLOGIST', 'OCCUPATIONAL_THERAPIST', 'PHYSICAL_THERAPIST', 'SCHOOL_COUNSELOR',
  'BEHAVIOR_SPECIALIST', 'STUDENT', 'OTHER'
] as const;

const createEvaluationCaseSchema = z.object({
  caseType: z.enum(CASE_TYPE_VALUES),
  referralId: z.string().uuid().optional().nullable(),
  caseManagerId: z.string().uuid().optional().nullable(),
  meetingScheduledAt: z.string().optional(),
  meetingLocation: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  internalNotes: z.string().optional(),
});

const updateEvaluationCaseSchema = createEvaluationCaseSchema.partial().extend({
  status: z.enum(CASE_STATUS_VALUES).optional(),
  meetingHeldAt: z.string().optional(),
  determinationOutcome: z.enum(DETERMINATION_OUTCOME_VALUES).optional().nullable(),
  determinationDate: z.string().optional(),
  determinationRationale: z.string().optional(),
  primaryDisabilityCategory: z.enum(DISABILITY_CATEGORY_VALUES).optional().nullable(),
  secondaryDisabilities: z.array(z.enum(DISABILITY_CATEGORY_VALUES)).optional(),
  qualifyingImpairment: z.string().optional(),
  nonEligibilityReason: z.string().optional(),
  alternativeRecommendations: z.string().optional(),
  parentNotifiedAt: z.string().optional(),
  parentAgreement: z.enum(['AGREE', 'DISAGREE', 'PENDING']).optional(),
  parentDisagreementReason: z.string().optional(),
  closedReason: z.string().optional(),
});

const createAssessmentSchema = z.object({
  assessmentType: z.enum(ASSESSMENT_TYPE_VALUES),
  assessmentName: z.string().min(1),
  assessorName: z.string().optional(),
  assessorTitle: z.string().optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
});

const updateAssessmentSchema = createAssessmentSchema.partial().extend({
  status: z.enum(ASSESSMENT_STATUS_VALUES).optional(),
  completedAt: z.string().optional(),
  resultsJson: z.record(z.unknown()).optional(),
  resultsSummary: z.string().optional(),
});

const createParticipantSchema = z.object({
  role: z.enum(PARTICIPANT_ROLE_VALUES),
  roleOther: z.string().optional(),
  name: z.string().min(1),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  isRequired: z.boolean().optional(),
  userId: z.string().uuid().optional().nullable(),
});

const updateParticipantSchema = createParticipantSchema.partial().extend({
  invitedAt: z.string().optional(),
  confirmedAt: z.string().optional(),
  attended: z.boolean().optional().nullable(),
  attendanceNotes: z.string().optional(),
});

const createDeterminationSchema = z.object({
  isEligible: z.boolean(),
  determinationDate: z.string(),
  rationale: z.string().min(10),
  primaryDisabilityCategory: z.enum(DISABILITY_CATEGORY_VALUES).optional().nullable(),
  secondaryDisabilities: z.array(z.enum(DISABILITY_CATEGORY_VALUES)).optional(),
  eligibilityCriteriaMet: z.record(z.unknown()).optional(),
  nonEligibilityReason: z.string().optional(),
  alternativeRecommendations: z.string().optional(),
});

const addTimelineEventSchema = z.object({
  eventType: z.string(),
  description: z.string(),
  eventData: z.record(z.unknown()).optional(),
});

// ============================================
// Helper Functions
// ============================================

async function canAccessStudent(userId: string, userRole: string | null | undefined, studentId: string): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  const student = await prisma.student.findFirst({
    where: { id: studentId },
    select: { teacherId: true },
  });

  if (!student) return false;
  return student.teacherId === userId;
}

function canManageEvaluationCase(userRole: string | null | undefined): boolean {
  return userRole === 'ADMIN' || userRole === 'CASE_MANAGER';
}

async function createTimelineEvent(
  evaluationCaseId: string,
  eventType: string,
  description: string,
  performedByUserId: string,
  eventData?: Record<string, unknown>
) {
  return prisma.evaluationCaseTimelineEvent.create({
    data: {
      evaluationCaseId,
      eventType,
      description,
      performedByUserId,
      eventData: eventData as Prisma.InputJsonValue,
    },
  });
}

// ============================================
// Evaluation Case Routes
// ============================================

// GET /api/students/:studentId/evaluation-cases - List evaluation cases for a student
router.get('/students/:studentId/evaluation-cases', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, type } = req.query;

    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const where: Prisma.EvaluationCaseWhereInput = { studentId };

    if (status && CASE_STATUS_VALUES.includes(status as (typeof CASE_STATUS_VALUES)[number])) {
      where.status = status as (typeof CASE_STATUS_VALUES)[number];
    }
    if (type && CASE_TYPE_VALUES.includes(type as (typeof CASE_TYPE_VALUES)[number])) {
      where.caseType = type as (typeof CASE_TYPE_VALUES)[number];
    }

    const evaluationCases = await prisma.evaluationCase.findMany({
      where,
      include: {
        caseManager: { select: { id: true, displayName: true, email: true } },
        referral: { select: { id: true, referralType: true, status: true } },
        _count: { select: { assessments: true, participants: true, timelineEvents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ evaluationCases });
  } catch (error) {
    console.error('Error fetching evaluation cases:', error);
    return res.status(500).json({ error: 'Failed to fetch evaluation cases' });
  }
});

// GET /api/evaluation-cases/:id - Get evaluation case details
router.get('/evaluation-cases/:id', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    const evaluationCase = await prisma.evaluationCase.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, grade: true, schoolName: true } },
        caseManager: { select: { id: true, displayName: true, email: true } },
        createdBy: { select: { id: true, displayName: true } },
        closedBy: { select: { id: true, displayName: true } },
        referral: { select: { id: true, referralType: true, status: true, reasonForReferral: true } },
        assessments: {
          include: {
            createdBy: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        participants: {
          include: {
            user: { select: { id: true, displayName: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        determination: {
          include: {
            createdBy: { select: { id: true, displayName: true } },
          },
        },
        timelineEvents: {
          include: {
            performedBy: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!evaluationCase) {
      return res.status(404).json({ error: 'Evaluation case not found' });
    }

    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, evaluationCase.studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({ evaluationCase });
  } catch (error) {
    console.error('Error fetching evaluation case:', error);
    return res.status(500).json({ error: 'Failed to fetch evaluation case' });
  }
});

// POST /api/students/:studentId/evaluation-cases - Create a new evaluation case
router.post('/students/:studentId/evaluation-cases', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can create evaluation cases' });
    }

    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    const validatedData = createEvaluationCaseSchema.parse(req.body);

    const evaluationCase = await prisma.evaluationCase.create({
      data: {
        studentId,
        caseType: validatedData.caseType,
        referralId: validatedData.referralId || undefined,
        caseManagerId: validatedData.caseManagerId || undefined,
        meetingScheduledAt: validatedData.meetingScheduledAt ? new Date(validatedData.meetingScheduledAt) : undefined,
        meetingLocation: validatedData.meetingLocation,
        meetingLink: validatedData.meetingLink || undefined,
        internalNotes: validatedData.internalNotes,
        createdByUserId: req.user!.id,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        caseManager: { select: { id: true, displayName: true, email: true } },
        referral: { select: { id: true, referralType: true } },
      },
    });

    // Create timeline event
    await createTimelineEvent(
      evaluationCase.id,
      'CREATED',
      `Evaluation case created for ${validatedData.caseType} evaluation`,
      req.user!.id
    );

    return res.status(201).json({ evaluationCase });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating evaluation case:', error);
    return res.status(500).json({ error: 'Failed to create evaluation case' });
  }
});

// PATCH /api/evaluation-cases/:id - Update evaluation case
router.patch('/evaluation-cases/:id', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    const existingCase = await prisma.evaluationCase.findUnique({
      where: { id },
      select: { id: true, studentId: true, status: true },
    });

    if (!existingCase) {
      return res.status(404).json({ error: 'Evaluation case not found' });
    }

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can update evaluation cases' });
    }

    const validatedData = updateEvaluationCaseSchema.parse(req.body);

    const updateData: Prisma.EvaluationCaseUpdateInput = {};

    if (validatedData.caseType) updateData.caseType = validatedData.caseType;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.caseManagerId !== undefined) {
      updateData.caseManager = validatedData.caseManagerId ? { connect: { id: validatedData.caseManagerId } } : { disconnect: true };
    }
    if (validatedData.meetingScheduledAt) updateData.meetingScheduledAt = new Date(validatedData.meetingScheduledAt);
    if (validatedData.meetingLocation !== undefined) updateData.meetingLocation = validatedData.meetingLocation;
    if (validatedData.meetingLink !== undefined) updateData.meetingLink = validatedData.meetingLink || null;
    if (validatedData.meetingHeldAt) updateData.meetingHeldAt = new Date(validatedData.meetingHeldAt);
    if (validatedData.determinationOutcome !== undefined) updateData.determinationOutcome = validatedData.determinationOutcome;
    if (validatedData.determinationDate) updateData.determinationDate = new Date(validatedData.determinationDate);
    if (validatedData.determinationRationale !== undefined) updateData.determinationRationale = validatedData.determinationRationale;
    if (validatedData.primaryDisabilityCategory !== undefined) updateData.primaryDisabilityCategory = validatedData.primaryDisabilityCategory;
    if (validatedData.secondaryDisabilities !== undefined) updateData.secondaryDisabilities = validatedData.secondaryDisabilities;
    if (validatedData.qualifyingImpairment !== undefined) updateData.qualifyingImpairment = validatedData.qualifyingImpairment;
    if (validatedData.nonEligibilityReason !== undefined) updateData.nonEligibilityReason = validatedData.nonEligibilityReason;
    if (validatedData.alternativeRecommendations !== undefined) updateData.alternativeRecommendations = validatedData.alternativeRecommendations;
    if (validatedData.parentNotifiedAt) updateData.parentNotifiedAt = new Date(validatedData.parentNotifiedAt);
    if (validatedData.parentAgreement !== undefined) updateData.parentAgreement = validatedData.parentAgreement;
    if (validatedData.parentDisagreementReason !== undefined) updateData.parentDisagreementReason = validatedData.parentDisagreementReason;
    if (validatedData.internalNotes !== undefined) updateData.internalNotes = validatedData.internalNotes;

    // Handle status changes
    if (validatedData.status === 'CLOSED' && existingCase.status !== 'CLOSED') {
      updateData.closedAt = new Date();
      updateData.closedBy = { connect: { id: req.user!.id } };
      updateData.closedReason = validatedData.closedReason;
    }

    const evaluationCase = await prisma.evaluationCase.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        caseManager: { select: { id: true, displayName: true, email: true } },
      },
    });

    // Create timeline event for status change
    if (validatedData.status && validatedData.status !== existingCase.status) {
      await createTimelineEvent(
        id,
        'STATUS_CHANGE',
        `Status changed from ${existingCase.status} to ${validatedData.status}`,
        req.user!.id,
        { from: existingCase.status, to: validatedData.status }
      );
    }

    return res.json({ evaluationCase });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating evaluation case:', error);
    return res.status(500).json({ error: 'Failed to update evaluation case' });
  }
});

// DELETE /api/evaluation-cases/:id - Delete evaluation case (only if OPEN status)
router.delete('/evaluation-cases/:id', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    const evaluationCase = await prisma.evaluationCase.findUnique({
      where: { id },
      select: { id: true, status: true, studentId: true },
    });

    if (!evaluationCase) {
      return res.status(404).json({ error: 'Evaluation case not found' });
    }

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can delete evaluation cases' });
    }

    if (evaluationCase.status !== 'OPEN') {
      return res.status(400).json({ error: 'Only OPEN evaluation cases can be deleted' });
    }

    await prisma.evaluationCase.delete({ where: { id } });

    return res.json({ message: 'Evaluation case deleted successfully' });
  } catch (error) {
    console.error('Error deleting evaluation case:', error);
    return res.status(500).json({ error: 'Failed to delete evaluation case' });
  }
});

// ============================================
// Assessment Routes
// ============================================

// POST /api/evaluation-cases/:id/assessments - Add assessment
router.post('/evaluation-cases/:id/assessments', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can add assessments' });
    }

    const evaluationCase = await prisma.evaluationCase.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!evaluationCase) {
      return res.status(404).json({ error: 'Evaluation case not found' });
    }

    if (evaluationCase.status === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot add assessments to a closed case' });
    }

    const validatedData = createAssessmentSchema.parse(req.body);

    const assessment = await prisma.evaluationAssessment.create({
      data: {
        evaluationCaseId: id,
        assessmentType: validatedData.assessmentType,
        assessmentName: validatedData.assessmentName,
        assessorName: validatedData.assessorName,
        assessorTitle: validatedData.assessorTitle,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined,
        notes: validatedData.notes,
        createdByUserId: req.user!.id,
      },
      include: {
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    await createTimelineEvent(
      id,
      'ASSESSMENT_ADDED',
      `Assessment added: ${validatedData.assessmentName}`,
      req.user!.id
    );

    // Update case status if first assessment is added
    if (evaluationCase.status === 'OPEN') {
      await prisma.evaluationCase.update({
        where: { id },
        data: { status: 'ASSESSMENTS_IN_PROGRESS' },
      });
    }

    return res.status(201).json({ assessment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error adding assessment:', error);
    return res.status(500).json({ error: 'Failed to add assessment' });
  }
});

// PATCH /api/evaluation-cases/:caseId/assessments/:assessmentId - Update assessment
router.patch('/evaluation-cases/:caseId/assessments/:assessmentId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { caseId, assessmentId } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can update assessments' });
    }

    const assessment = await prisma.evaluationAssessment.findFirst({
      where: { id: assessmentId, evaluationCaseId: caseId },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const validatedData = updateAssessmentSchema.parse(req.body);

    const updateData: Prisma.EvaluationAssessmentUpdateInput = {};

    if (validatedData.assessmentType) updateData.assessmentType = validatedData.assessmentType;
    if (validatedData.assessmentName) updateData.assessmentName = validatedData.assessmentName;
    if (validatedData.assessorName !== undefined) updateData.assessorName = validatedData.assessorName;
    if (validatedData.assessorTitle !== undefined) updateData.assessorTitle = validatedData.assessorTitle;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.scheduledAt) updateData.scheduledAt = new Date(validatedData.scheduledAt);
    if (validatedData.completedAt) updateData.completedAt = new Date(validatedData.completedAt);
    if (validatedData.resultsJson !== undefined) updateData.resultsJson = validatedData.resultsJson as Prisma.InputJsonValue;
    if (validatedData.resultsSummary !== undefined) updateData.resultsSummary = validatedData.resultsSummary;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

    const updatedAssessment = await prisma.evaluationAssessment.update({
      where: { id: assessmentId },
      data: updateData,
      include: {
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    // Log completion
    if (validatedData.status === 'COMPLETED' && assessment.status !== 'COMPLETED') {
      await createTimelineEvent(
        caseId,
        'ASSESSMENT_COMPLETED',
        `Assessment completed: ${updatedAssessment.assessmentName}`,
        req.user!.id
      );
    }

    return res.json({ assessment: updatedAssessment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating assessment:', error);
    return res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// DELETE /api/evaluation-cases/:caseId/assessments/:assessmentId - Delete assessment
router.delete('/evaluation-cases/:caseId/assessments/:assessmentId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { caseId, assessmentId } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can delete assessments' });
    }

    const assessment = await prisma.evaluationAssessment.findFirst({
      where: { id: assessmentId, evaluationCaseId: caseId },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    if (assessment.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot delete a completed assessment' });
    }

    await prisma.evaluationAssessment.delete({ where: { id: assessmentId } });

    await createTimelineEvent(
      caseId,
      'ASSESSMENT_REMOVED',
      `Assessment removed: ${assessment.assessmentName}`,
      req.user!.id
    );

    return res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    return res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

// ============================================
// Participant Routes
// ============================================

// POST /api/evaluation-cases/:id/participants - Add participant
router.post('/evaluation-cases/:id/participants', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can add participants' });
    }

    const evaluationCase = await prisma.evaluationCase.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!evaluationCase) {
      return res.status(404).json({ error: 'Evaluation case not found' });
    }

    const validatedData = createParticipantSchema.parse(req.body);

    const participant = await prisma.evaluationParticipant.create({
      data: {
        evaluationCaseId: id,
        role: validatedData.role,
        roleOther: validatedData.roleOther,
        name: validatedData.name,
        title: validatedData.title,
        email: validatedData.email || undefined,
        phone: validatedData.phone,
        isRequired: validatedData.isRequired || false,
        userId: validatedData.userId || undefined,
      },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });

    await createTimelineEvent(
      id,
      'PARTICIPANT_ADDED',
      `Participant added: ${validatedData.name} (${validatedData.role})`,
      req.user!.id
    );

    return res.status(201).json({ participant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error adding participant:', error);
    return res.status(500).json({ error: 'Failed to add participant' });
  }
});

// PATCH /api/evaluation-cases/:caseId/participants/:participantId - Update participant
router.patch('/evaluation-cases/:caseId/participants/:participantId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { caseId, participantId } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can update participants' });
    }

    const participant = await prisma.evaluationParticipant.findFirst({
      where: { id: participantId, evaluationCaseId: caseId },
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const validatedData = updateParticipantSchema.parse(req.body);

    const updateData: Prisma.EvaluationParticipantUpdateInput = {};

    if (validatedData.role) updateData.role = validatedData.role;
    if (validatedData.roleOther !== undefined) updateData.roleOther = validatedData.roleOther;
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.email !== undefined) updateData.email = validatedData.email || null;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.isRequired !== undefined) updateData.isRequired = validatedData.isRequired;
    if (validatedData.invitedAt) updateData.invitedAt = new Date(validatedData.invitedAt);
    if (validatedData.confirmedAt) updateData.confirmedAt = new Date(validatedData.confirmedAt);
    if (validatedData.attended !== undefined) updateData.attended = validatedData.attended;
    if (validatedData.attendanceNotes !== undefined) updateData.attendanceNotes = validatedData.attendanceNotes;

    const updatedParticipant = await prisma.evaluationParticipant.update({
      where: { id: participantId },
      data: updateData,
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });

    return res.json({ participant: updatedParticipant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating participant:', error);
    return res.status(500).json({ error: 'Failed to update participant' });
  }
});

// DELETE /api/evaluation-cases/:caseId/participants/:participantId - Remove participant
router.delete('/evaluation-cases/:caseId/participants/:participantId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { caseId, participantId } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can remove participants' });
    }

    const participant = await prisma.evaluationParticipant.findFirst({
      where: { id: participantId, evaluationCaseId: caseId },
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    await prisma.evaluationParticipant.delete({ where: { id: participantId } });

    await createTimelineEvent(
      caseId,
      'PARTICIPANT_REMOVED',
      `Participant removed: ${participant.name}`,
      req.user!.id
    );

    return res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Error removing participant:', error);
    return res.status(500).json({ error: 'Failed to remove participant' });
  }
});

// ============================================
// Determination Routes
// ============================================

// POST /api/evaluation-cases/:id/determination - Create eligibility determination
router.post('/evaluation-cases/:id/determination', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can create determinations' });
    }

    const evaluationCase = await prisma.evaluationCase.findUnique({
      where: { id },
      include: { determination: true },
    });

    if (!evaluationCase) {
      return res.status(404).json({ error: 'Evaluation case not found' });
    }

    if (evaluationCase.determination) {
      return res.status(400).json({ error: 'Determination already exists for this case' });
    }

    if (evaluationCase.status === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot create determination for a closed case' });
    }

    const validatedData = createDeterminationSchema.parse(req.body);

    const determination = await prisma.eligibilityDetermination.create({
      data: {
        evaluationCaseId: id,
        isEligible: validatedData.isEligible,
        determinationDate: new Date(validatedData.determinationDate),
        rationale: validatedData.rationale,
        primaryDisabilityCategory: validatedData.primaryDisabilityCategory,
        secondaryDisabilities: validatedData.secondaryDisabilities,
        eligibilityCriteriaMet: validatedData.eligibilityCriteriaMet as Prisma.InputJsonValue,
        nonEligibilityReason: validatedData.nonEligibilityReason,
        alternativeRecommendations: validatedData.alternativeRecommendations,
        createdByUserId: req.user!.id,
      },
      include: {
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    // Update case status
    await prisma.evaluationCase.update({
      where: { id },
      data: {
        status: 'DETERMINATION_COMPLETE',
        determinationOutcome: validatedData.isEligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
        determinationDate: new Date(validatedData.determinationDate),
        determinationRationale: validatedData.rationale,
        primaryDisabilityCategory: validatedData.primaryDisabilityCategory,
      },
    });

    await createTimelineEvent(
      id,
      'DETERMINATION_MADE',
      `Eligibility determination: ${validatedData.isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`,
      req.user!.id,
      { isEligible: validatedData.isEligible }
    );

    return res.status(201).json({ determination });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating determination:', error);
    return res.status(500).json({ error: 'Failed to create determination' });
  }
});

// ============================================
// Timeline Event Routes
// ============================================

// POST /api/evaluation-cases/:id/timeline - Add timeline event (note)
router.post('/evaluation-cases/:id/timeline', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    const evaluationCase = await prisma.evaluationCase.findUnique({
      where: { id },
      select: { id: true, studentId: true },
    });

    if (!evaluationCase) {
      return res.status(404).json({ error: 'Evaluation case not found' });
    }

    const hasAccess = await canAccessStudent(req.user!.id, req.user!.role, evaluationCase.studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validatedData = addTimelineEventSchema.parse(req.body);

    const event = await prisma.evaluationCaseTimelineEvent.create({
      data: {
        evaluationCaseId: id,
        eventType: validatedData.eventType,
        description: validatedData.description,
        eventData: validatedData.eventData as Prisma.InputJsonValue,
        performedByUserId: req.user!.id,
      },
      include: {
        performedBy: { select: { id: true, displayName: true } },
      },
    });

    return res.status(201).json({ event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error adding timeline event:', error);
    return res.status(500).json({ error: 'Failed to add timeline event' });
  }
});

// ============================================
// Workflow Action Routes
// ============================================

// POST /api/evaluation-cases/:id/schedule-meeting - Schedule eligibility meeting
router.post('/evaluation-cases/:id/schedule-meeting', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can schedule meetings' });
    }

    const { meetingScheduledAt, meetingLocation, meetingLink } = req.body;

    if (!meetingScheduledAt) {
      return res.status(400).json({ error: 'Meeting date/time is required' });
    }

    const evaluationCase = await prisma.evaluationCase.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!evaluationCase) {
      return res.status(404).json({ error: 'Evaluation case not found' });
    }

    const updated = await prisma.evaluationCase.update({
      where: { id },
      data: {
        status: 'MEETING_SCHEDULED',
        meetingScheduledAt: new Date(meetingScheduledAt),
        meetingLocation,
        meetingLink: meetingLink || undefined,
      },
    });

    await createTimelineEvent(
      id,
      'MEETING_SCHEDULED',
      `Eligibility meeting scheduled for ${new Date(meetingScheduledAt).toLocaleString()}`,
      req.user!.id,
      { meetingScheduledAt, meetingLocation }
    );

    return res.json({ evaluationCase: updated });
  } catch (error) {
    console.error('Error scheduling meeting:', error);
    return res.status(500).json({ error: 'Failed to schedule meeting' });
  }
});

// POST /api/evaluation-cases/:id/close - Close evaluation case
router.post('/evaluation-cases/:id/close', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can close cases' });
    }

    const { closedReason } = req.body;

    const evaluationCase = await prisma.evaluationCase.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!evaluationCase) {
      return res.status(404).json({ error: 'Evaluation case not found' });
    }

    if (evaluationCase.status === 'CLOSED') {
      return res.status(400).json({ error: 'Case is already closed' });
    }

    const updated = await prisma.evaluationCase.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedByUserId: req.user!.id,
        closedReason,
      },
    });

    await createTimelineEvent(
      id,
      'CASE_CLOSED',
      `Case closed${closedReason ? `: ${closedReason}` : ''}`,
      req.user!.id,
      { closedReason }
    );

    return res.json({ evaluationCase: updated });
  } catch (error) {
    console.error('Error closing case:', error);
    return res.status(500).json({ error: 'Failed to close case' });
  }
});

// POST /api/evaluation-cases/:id/assign - Assign case manager
router.post('/evaluation-cases/:id/assign', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    if (!canManageEvaluationCase(req.user!.role)) {
      return res.status(403).json({ error: 'Only administrators and case managers can assign cases' });
    }

    const { caseManagerId } = req.body;

    const evaluationCase = await prisma.evaluationCase.findUnique({
      where: { id },
      select: { id: true, caseManagerId: true },
    });

    if (!evaluationCase) {
      return res.status(404).json({ error: 'Evaluation case not found' });
    }

    // Verify the case manager exists and has appropriate role
    if (caseManagerId) {
      const caseManager = await prisma.appUser.findUnique({
        where: { id: caseManagerId },
        select: { id: true, displayName: true, role: true },
      });

      if (!caseManager) {
        return res.status(400).json({ error: 'Case manager not found' });
      }

      if (caseManager.role !== 'ADMIN' && caseManager.role !== 'CASE_MANAGER') {
        return res.status(400).json({ error: 'User must be an administrator or case manager' });
      }
    }

    const updated = await prisma.evaluationCase.update({
      where: { id },
      data: {
        caseManagerId: caseManagerId || null,
      },
      include: {
        caseManager: { select: { id: true, displayName: true, email: true } },
      },
    });

    if (caseManagerId) {
      await createTimelineEvent(
        id,
        'CASE_MANAGER_ASSIGNED',
        `Case manager assigned: ${updated.caseManager?.displayName}`,
        req.user!.id
      );
    } else {
      await createTimelineEvent(
        id,
        'CASE_MANAGER_UNASSIGNED',
        'Case manager unassigned',
        req.user!.id
      );
    }

    return res.json({ evaluationCase: updated });
  } catch (error) {
    console.error('Error assigning case manager:', error);
    return res.status(500).json({ error: 'Failed to assign case manager' });
  }
});

export default router;

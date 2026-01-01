import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { Errors, ApiError } from '../errors.js';

const router = Router();

// Helper to check if user can manage plans
function canManagePlan(userRole: string | null | undefined): boolean {
  return userRole === 'ADMIN' || userRole === 'CASE_MANAGER';
}

// ============================================
// CREATE DECISION
// POST /api/plans/:planId/decisions
// ============================================

const createDecisionSchema = z.object({
  decisionType: z.enum([
    'ELIGIBILITY_CATEGORY', 'PLACEMENT_LRE', 'SERVICES_CHANGE', 'GOALS_CHANGE',
    'ACCOMMODATIONS_CHANGE', 'ESY_DECISION', 'ASSESSMENT_PARTICIPATION',
    'BEHAVIOR_SUPPORTS', 'TRANSITION_SERVICES', 'OTHER'
  ]),
  sectionKey: z.string().optional(), // ex: "LRE", "SERVICES", "ACCOMMODATIONS", "ESY", "GOALS"
  summary: z.string().min(1),
  rationale: z.string().min(1),
  optionsConsidered: z.string().optional(),
  participants: z.string().optional(),
  meetingId: z.string().uuid().optional(),
  planVersionId: z.string().uuid().optional(),
  decidedAt: z.string().datetime().optional(),
});

router.post('/plans/:planId/decisions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.params;

    if (!canManagePlan(req.user?.role)) {
      throw Errors.forbidden('Not authorized to create decisions');
    }

    const validatedData = createDecisionSchema.parse(req.body);

    // Verify plan exists and is an IEP
    const plan = await prisma.planInstance.findUnique({
      where: { id: planId },
      include: { planType: true },
    });

    if (!plan) {
      throw Errors.planNotFound(planId);
    }

    // Only allow decisions for IEP plans
    if (plan.planType.code !== 'IEP') {
      throw Errors.decisionCreateForNonIep(plan.planType.code);
    }

    // If meetingId provided, verify it exists and belongs to this plan
    if (validatedData.meetingId) {
      const meeting = await prisma.planMeeting.findUnique({
        where: { id: validatedData.meetingId },
      });
      if (!meeting || meeting.planInstanceId !== planId) {
        return res.status(400).json({ error: 'Invalid meeting ID' });
      }
    }

    // If planVersionId provided, verify it exists and belongs to this plan
    if (validatedData.planVersionId) {
      const version = await prisma.planVersion.findUnique({
        where: { id: validatedData.planVersionId },
      });
      if (!version || version.planInstanceId !== planId) {
        return res.status(400).json({ error: 'Invalid plan version ID' });
      }
    }

    const decision = await prisma.decisionLedgerEntry.create({
      data: {
        planInstanceId: planId,
        planVersionId: validatedData.planVersionId,
        meetingId: validatedData.meetingId,
        decisionType: validatedData.decisionType,
        sectionKey: validatedData.sectionKey,
        summary: validatedData.summary,
        rationale: validatedData.rationale,
        optionsConsidered: validatedData.optionsConsidered,
        participants: validatedData.participants,
        decidedAt: validatedData.decidedAt ? new Date(validatedData.decidedAt) : new Date(),
        decidedByUserId: req.user!.id,
      },
      include: {
        decidedBy: { select: { id: true, displayName: true } },
        planVersion: { select: { id: true, versionNumber: true } },
        meeting: { select: { id: true, scheduledAt: true } },
      },
    });

    res.status(201).json({ decision });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error creating decision:', error);
    next(Errors.internal('Failed to create decision'));
  }
});

// ============================================
// GET PLAN DECISIONS
// GET /api/plans/:planId/decisions
// ============================================

router.get('/plans/:planId/decisions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { type, status, section } = req.query;

    // Build where clause dynamically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { planInstanceId: planId };

    if (type && typeof type === 'string') {
      where.decisionType = type;
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (section && typeof section === 'string') {
      where.sectionKey = section;
    }

    const decisions = await prisma.decisionLedgerEntry.findMany({
      where,
      orderBy: { decidedAt: 'desc' },
      include: {
        decidedBy: { select: { id: true, displayName: true } },
        voidedBy: { select: { id: true, displayName: true } },
        planVersion: { select: { id: true, versionNumber: true } },
        meeting: { select: { id: true, scheduledAt: true, meetingType: { select: { name: true } } } },
      },
    });

    res.json({ decisions });
  } catch (error) {
    console.error('Error fetching decisions:', error);
    res.status(500).json({ error: 'Failed to fetch decisions' });
  }
});

// ============================================
// GET SINGLE DECISION
// GET /api/decisions/:decisionId
// ============================================

router.get('/decisions/:decisionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { decisionId } = req.params;

    const decision = await prisma.decisionLedgerEntry.findUnique({
      where: { id: decisionId },
      include: {
        planInstance: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
            planType: { select: { code: true, name: true } },
          },
        },
        decidedBy: { select: { id: true, displayName: true } },
        voidedBy: { select: { id: true, displayName: true } },
        planVersion: { select: { id: true, versionNumber: true, finalizedAt: true } },
        meeting: {
          select: {
            id: true,
            scheduledAt: true,
            heldAt: true,
            meetingType: { select: { name: true } },
          },
        },
      },
    });

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json({ decision });
  } catch (error) {
    console.error('Error fetching decision:', error);
    res.status(500).json({ error: 'Failed to fetch decision' });
  }
});

// ============================================
// VOID DECISION
// POST /api/decisions/:decisionId/void
// ============================================

const voidDecisionSchema = z.object({
  voidReason: z.string().min(1, 'Void reason is required'),
});

router.post('/decisions/:decisionId/void', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decisionId } = req.params;

    if (!canManagePlan(req.user?.role)) {
      throw Errors.forbidden('Not authorized to void decisions');
    }

    const validatedData = voidDecisionSchema.parse(req.body);

    const decision = await prisma.decisionLedgerEntry.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw Errors.decisionNotFound(decisionId);
    }

    if (decision.status === 'VOID') {
      throw Errors.decisionAlreadyVoided(decisionId);
    }

    const voidedDecision = await prisma.decisionLedgerEntry.update({
      where: { id: decisionId },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
        voidedByUserId: req.user!.id,
        voidReason: validatedData.voidReason,
      },
      include: {
        decidedBy: { select: { id: true, displayName: true } },
        voidedBy: { select: { id: true, displayName: true } },
      },
    });

    res.json({ decision: voidedDecision });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.decisionVoidRequiresReason());
    }
    console.error('Error voiding decision:', error);
    next(Errors.internal('Failed to void decision'));
  }
});

// ============================================
// GET DECISION TYPES (for dropdown)
// GET /api/decisions/types
// ============================================

router.get('/decision-types', requireAuth, async (_req: Request, res: Response) => {
  const decisionTypes = [
    { value: 'ELIGIBILITY_CATEGORY', label: 'Eligibility Category', description: 'Determination of disability category' },
    { value: 'PLACEMENT_LRE', label: 'Placement / LRE', description: 'Least Restrictive Environment decision' },
    { value: 'SERVICES_CHANGE', label: 'Services Change', description: 'Changes to special education or related services' },
    { value: 'GOALS_CHANGE', label: 'Goals Change', description: 'Modifications to annual goals or objectives' },
    { value: 'ACCOMMODATIONS_CHANGE', label: 'Accommodations Change', description: 'Changes to accommodations or modifications' },
    { value: 'ESY_DECISION', label: 'ESY Decision', description: 'Extended School Year eligibility determination' },
    { value: 'ASSESSMENT_PARTICIPATION', label: 'Assessment Participation', description: 'State and district assessment participation decisions' },
    { value: 'BEHAVIOR_SUPPORTS', label: 'Behavior Supports', description: 'Behavioral intervention or support decisions' },
    { value: 'TRANSITION_SERVICES', label: 'Transition Services', description: 'Post-secondary transition planning decisions' },
    { value: 'OTHER', label: 'Other', description: 'Other plan-related decisions' },
  ];

  res.json({ decisionTypes });
});

export default router;

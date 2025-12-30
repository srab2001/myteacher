import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { RuleScopeType, RulePlanType } from '../types/prisma-enums.js';

type JsonValue = Prisma.InputJsonValue;

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateRulePackSchema = z.object({
  scopeType: z.nativeEnum(RuleScopeType),
  scopeId: z.string().min(1),
  planType: z.nativeEnum(RulePlanType),
  name: z.string().min(1).max(255),
  effectiveFrom: z.string().transform((s) => new Date(s)),
  effectiveTo: z.string().optional().nullable().transform((s) => s ? new Date(s) : null),
  isActive: z.boolean().optional().default(true),
});

const AttachRuleSchema = z.object({
  ruleDefinitionId: z.string().uuid(),
  isEnabled: z.boolean().optional().default(true),
  config: z.any().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});

const AttachEvidenceRequirementSchema = z.object({
  evidenceTypeId: z.string().uuid(),
  isRequired: z.boolean().optional().default(true),
});

// ============================================
// RULE DEFINITIONS (Reference Data)
// ============================================

/**
 * GET /api/rule-packs/definitions
 * List all available rule definitions
 */
router.get('/definitions', requireAuth, async (_req: Request, res: Response) => {
  try {
    const definitions = await prisma.ruleDefinition.findMany({
      orderBy: { key: 'asc' },
    });

    res.json({ definitions });
  } catch (error) {
    console.error('Error fetching rule definitions:', error);
    res.status(500).json({ error: 'Failed to fetch rule definitions' });
  }
});

// ============================================
// EVIDENCE TYPES (Reference Data)
// ============================================

/**
 * GET /api/rule-packs/evidence-types
 * List all available evidence types
 */
router.get('/evidence-types', requireAuth, async (_req: Request, res: Response) => {
  try {
    const evidenceTypes = await prisma.ruleEvidenceType.findMany({
      orderBy: { key: 'asc' },
    });

    res.json({ evidenceTypes });
  } catch (error) {
    console.error('Error fetching evidence types:', error);
    res.status(500).json({ error: 'Failed to fetch evidence types' });
  }
});

// ============================================
// MEETING TYPES (Reference Data)
// ============================================

/**
 * GET /api/rule-packs/meeting-types
 * List all available meeting types
 */
router.get('/meeting-types', requireAuth, async (_req: Request, res: Response) => {
  try {
    const meetingTypes = await prisma.meetingType.findMany({
      orderBy: { code: 'asc' },
    });

    res.json({ meetingTypes });
  } catch (error) {
    console.error('Error fetching meeting types:', error);
    res.status(500).json({ error: 'Failed to fetch meeting types' });
  }
});

// ============================================
// RULE PACKS CRUD
// ============================================

/**
 * GET /api/rule-packs
 * List all rule packs, optionally filtered by scope and/or plan type
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { scopeType, scopeId, planType, isActive } = req.query;

    const where: {
      scopeType?: RuleScopeType;
      scopeId?: string;
      planType?: RulePlanType;
      isActive?: boolean;
    } = {};

    if (scopeType && Object.values(RuleScopeType).includes(scopeType as RuleScopeType)) {
      where.scopeType = scopeType as RuleScopeType;
    }
    if (scopeId && typeof scopeId === 'string') {
      where.scopeId = scopeId;
    }
    if (planType && Object.values(RulePlanType).includes(planType as RulePlanType)) {
      where.planType = planType as RulePlanType;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const rulePacks = await prisma.rulePack.findMany({
      where,
      include: {
        rules: {
          include: {
            ruleDefinition: true,
            evidenceRequirements: {
              include: {
                evidenceType: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ scopeType: 'asc' }, { scopeId: 'asc' }, { version: 'desc' }],
    });

    res.json({ rulePacks });
  } catch (error) {
    console.error('Error fetching rule packs:', error);
    res.status(500).json({ error: 'Failed to fetch rule packs' });
  }
});

/**
 * GET /api/rule-packs/active
 * Get the active rule pack for a specific scope and plan type
 * Falls back through scope hierarchy: SCHOOL -> DISTRICT -> STATE
 */
router.get('/active', requireAuth, async (req: Request, res: Response) => {
  try {
    const { scopeType, scopeId, planType } = req.query;

    if (!scopeType || !scopeId || !planType) {
      return res.status(400).json({ error: 'scopeType, scopeId, and planType are required' });
    }

    // Build fallback hierarchy
    const scopes: { scopeType: RuleScopeType; scopeId: string }[] = [];

    if (scopeType === 'SCHOOL') {
      scopes.push({ scopeType: RuleScopeType.SCHOOL, scopeId: scopeId as string });
    }
    if (scopeType === 'SCHOOL' || scopeType === 'DISTRICT') {
      // For district fallback, we'd need to know the district ID
      // For now, assume scopeId contains district info or is passed separately
      scopes.push({ scopeType: RuleScopeType.DISTRICT, scopeId: scopeId as string });
    }
    // Always include state-level fallback (using first 2 chars of scopeId as state code)
    const stateCode = (scopeId as string).substring(0, 2).toUpperCase();
    scopes.push({ scopeType: RuleScopeType.STATE, scopeId: stateCode });

    // Search for matching rule pack
    for (const scope of scopes) {
      const rulePack = await prisma.rulePack.findFirst({
        where: {
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
          AND: [
            {
              OR: [
                { planType: planType as RulePlanType },
                { planType: RulePlanType.ALL },
              ],
            },
            {
              OR: [
                { effectiveTo: null },
                { effectiveTo: { gte: new Date() } },
              ],
            },
          ],
          isActive: true,
          effectiveFrom: { lte: new Date() },
        },
        include: {
          rules: {
            where: { isEnabled: true },
            include: {
              ruleDefinition: true,
              evidenceRequirements: {
                include: {
                  evidenceType: true,
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { version: 'desc' },
      });

      if (rulePack) {
        return res.json({ rulePack, resolvedScope: scope });
      }
    }

    return res.json({ rulePack: null, resolvedScope: null });
  } catch (error) {
    console.error('Error fetching active rule pack:', error);
    res.status(500).json({ error: 'Failed to fetch active rule pack' });
  }
});

/**
 * GET /api/rule-packs/:id
 * Get a specific rule pack by ID
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rulePack = await prisma.rulePack.findUnique({
      where: { id },
      include: {
        rules: {
          include: {
            ruleDefinition: true,
            evidenceRequirements: {
              include: {
                evidenceType: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!rulePack) {
      return res.status(404).json({ error: 'Rule pack not found' });
    }

    res.json({ rulePack });
  } catch (error) {
    console.error('Error fetching rule pack:', error);
    res.status(500).json({ error: 'Failed to fetch rule pack' });
  }
});

/**
 * POST /api/rule-packs
 * Create a new rule pack
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = CreateRulePackSchema.parse(req.body);

    // Get the next version number for this scope/planType combination
    const existingPacks = await prisma.rulePack.findMany({
      where: {
        scopeType: data.scopeType,
        scopeId: data.scopeId,
        planType: data.planType,
      },
      orderBy: { version: 'desc' },
      take: 1,
    });

    const nextVersion = existingPacks.length > 0 ? existingPacks[0].version + 1 : 1;

    const rulePack = await prisma.rulePack.create({
      data: {
        scopeType: data.scopeType,
        scopeId: data.scopeId,
        planType: data.planType,
        name: data.name,
        version: nextVersion,
        isActive: data.isActive,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
      },
    });

    res.status(201).json({ rulePack });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating rule pack:', error);
    res.status(500).json({ error: 'Failed to create rule pack' });
  }
});

/**
 * PUT /api/rule-packs/:id
 * Update a rule pack
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive, effectiveFrom, effectiveTo } = req.body;

    const rulePack = await prisma.rulePack.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
        ...(effectiveFrom !== undefined && { effectiveFrom: new Date(effectiveFrom) }),
        ...(effectiveTo !== undefined && { effectiveTo: effectiveTo ? new Date(effectiveTo) : null }),
      },
    });

    res.json({ rulePack });
  } catch (error) {
    console.error('Error updating rule pack:', error);
    res.status(500).json({ error: 'Failed to update rule pack' });
  }
});

/**
 * DELETE /api/rule-packs/:id
 * Delete a rule pack (cascades to rules and evidence requirements)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.rulePack.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting rule pack:', error);
    res.status(500).json({ error: 'Failed to delete rule pack' });
  }
});

// ============================================
// RULE PACK RULES
// ============================================

/**
 * POST /api/rule-packs/:id/rules
 * Attach a rule to a rule pack
 */
router.post('/:id/rules', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = AttachRuleSchema.parse(req.body);

    // Verify the rule pack exists
    const rulePack = await prisma.rulePack.findUnique({ where: { id } });
    if (!rulePack) {
      return res.status(404).json({ error: 'Rule pack not found' });
    }

    // Verify the rule definition exists
    const ruleDefinition = await prisma.ruleDefinition.findUnique({
      where: { id: data.ruleDefinitionId },
    });
    if (!ruleDefinition) {
      return res.status(404).json({ error: 'Rule definition not found' });
    }

    const rulePackRule = await prisma.rulePackRule.create({
      data: {
        rulePackId: id,
        ruleDefinitionId: data.ruleDefinitionId,
        isEnabled: data.isEnabled,
        config: data.config as JsonValue,
        sortOrder: data.sortOrder,
      },
      include: {
        ruleDefinition: true,
      },
    });

    res.status(201).json({ rule: rulePackRule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error attaching rule to pack:', error);
    res.status(500).json({ error: 'Failed to attach rule to pack' });
  }
});

/**
 * PUT /api/rule-packs/:id/rules/:ruleId
 * Update a rule pack rule
 */
router.put('/:id/rules/:ruleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { isEnabled, config, sortOrder } = req.body;

    const rulePackRule = await prisma.rulePackRule.update({
      where: { id: ruleId },
      data: {
        ...(isEnabled !== undefined && { isEnabled }),
        ...(config !== undefined && { config: config as JsonValue }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        ruleDefinition: true,
        evidenceRequirements: {
          include: {
            evidenceType: true,
          },
        },
      },
    });

    res.json({ rule: rulePackRule });
  } catch (error) {
    console.error('Error updating rule pack rule:', error);
    res.status(500).json({ error: 'Failed to update rule pack rule' });
  }
});

/**
 * DELETE /api/rule-packs/:id/rules/:ruleId
 * Remove a rule from a rule pack
 */
router.delete('/:id/rules/:ruleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;

    await prisma.rulePackRule.delete({
      where: { id: ruleId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error removing rule from pack:', error);
    res.status(500).json({ error: 'Failed to remove rule from pack' });
  }
});

// ============================================
// EVIDENCE REQUIREMENTS
// ============================================

/**
 * POST /api/rule-packs/:id/rules/:ruleId/evidence
 * Add an evidence requirement to a rule pack rule
 */
router.post('/:id/rules/:ruleId/evidence', requireAuth, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const data = AttachEvidenceRequirementSchema.parse(req.body);

    // Verify the rule pack rule exists
    const rulePackRule = await prisma.rulePackRule.findUnique({ where: { id: ruleId } });
    if (!rulePackRule) {
      return res.status(404).json({ error: 'Rule pack rule not found' });
    }

    // Verify the evidence type exists
    const evidenceType = await prisma.ruleEvidenceType.findUnique({
      where: { id: data.evidenceTypeId },
    });
    if (!evidenceType) {
      return res.status(404).json({ error: 'Evidence type not found' });
    }

    const evidenceRequirement = await prisma.rulePackEvidenceRequirement.create({
      data: {
        rulePackRuleId: ruleId,
        evidenceTypeId: data.evidenceTypeId,
        isRequired: data.isRequired,
      },
      include: {
        evidenceType: true,
      },
    });

    res.status(201).json({ evidenceRequirement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error adding evidence requirement:', error);
    res.status(500).json({ error: 'Failed to add evidence requirement' });
  }
});

/**
 * DELETE /api/rule-packs/:id/rules/:ruleId/evidence/:evidenceId
 * Remove an evidence requirement from a rule pack rule
 */
router.delete('/:id/rules/:ruleId/evidence/:evidenceId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { evidenceId } = req.params;

    await prisma.rulePackEvidenceRequirement.delete({
      where: { id: evidenceId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error removing evidence requirement:', error);
    res.status(500).json({ error: 'Failed to remove evidence requirement' });
  }
});

export default router;

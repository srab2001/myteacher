import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../lib/db.js';
import { requireAdmin } from '../middleware/auth.js';
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
  isActive: z.boolean().optional().default(false), // Default to inactive for new packs
});

const UpdateRulePackSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
  effectiveFrom: z.string().optional().transform((s) => s ? new Date(s) : undefined),
  effectiveTo: z.string().optional().nullable().transform((s) => s === null ? null : s ? new Date(s) : undefined),
});

const BulkUpdateRulesSchema = z.object({
  rules: z.array(z.object({
    ruleDefinitionId: z.string().uuid(),
    isEnabled: z.boolean(),
    config: z.any().optional().nullable(),
    sortOrder: z.number().int().optional().default(0),
  })),
});

const BulkUpdateEvidenceSchema = z.object({
  ruleId: z.string().uuid(),
  evidenceRequirements: z.array(z.object({
    evidenceTypeId: z.string().uuid(),
    isRequired: z.boolean(),
  })),
});

// ============================================
// REFERENCE DATA (for admin UI dropdowns)
// ============================================

/**
 * GET /api/admin/rule-packs/definitions
 * List all available rule definitions
 */
router.get('/definitions', requireAdmin, async (_req: Request, res: Response) => {
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

/**
 * GET /api/admin/rule-packs/evidence-types
 * List all available evidence types
 */
router.get('/evidence-types', requireAdmin, async (_req: Request, res: Response) => {
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

/**
 * GET /api/admin/rule-packs/meeting-types
 * List all available meeting types
 */
router.get('/meeting-types', requireAdmin, async (_req: Request, res: Response) => {
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
// RULE PACKS CRUD (Admin only)
// ============================================

/**
 * GET /api/admin/rule-packs
 * List all rule packs with filters
 */
router.get('/', requireAdmin, async (req: Request, res: Response) => {
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
      orderBy: [{ scopeType: 'asc' }, { scopeId: 'asc' }, { planType: 'asc' }, { version: 'desc' }],
    });

    res.json({ rulePacks });
  } catch (error) {
    console.error('Error fetching rule packs:', error);
    res.status(500).json({ error: 'Failed to fetch rule packs' });
  }
});

/**
 * GET /api/admin/rule-packs/:id
 * Get a specific rule pack by ID
 */
router.get('/:id', requireAdmin, async (req: Request, res: Response) => {
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
 * POST /api/admin/rule-packs
 * Create a new rule pack
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
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

    // If setting as active, deactivate other packs for same scope+planType
    if (data.isActive) {
      await prisma.rulePack.updateMany({
        where: {
          scopeType: data.scopeType,
          scopeId: data.scopeId,
          planType: data.planType,
          isActive: true,
        },
        data: { isActive: false },
      });
    }

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
        },
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
 * PATCH /api/admin/rule-packs/:id
 * Update a rule pack (name, isActive, effectiveFrom, effectiveTo)
 * Enforces only one active pack per scope+planType
 */
router.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateRulePackSchema.parse(req.body);

    // Fetch the existing rule pack
    const existingPack = await prisma.rulePack.findUnique({
      where: { id },
    });

    if (!existingPack) {
      return res.status(404).json({ error: 'Rule pack not found' });
    }

    // If activating this pack, deactivate others for same scope+planType
    if (data.isActive === true && !existingPack.isActive) {
      await prisma.rulePack.updateMany({
        where: {
          scopeType: existingPack.scopeType,
          scopeId: existingPack.scopeId,
          planType: existingPack.planType,
          isActive: true,
          NOT: { id },
        },
        data: { isActive: false },
      });
    }

    const rulePack = await prisma.rulePack.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.effectiveFrom !== undefined && { effectiveFrom: data.effectiveFrom }),
        ...(data.effectiveTo !== undefined && { effectiveTo: data.effectiveTo }),
      },
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

    res.json({ rulePack });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating rule pack:', error);
    res.status(500).json({ error: 'Failed to update rule pack' });
  }
});

/**
 * DELETE /api/admin/rule-packs/:id
 * Delete a rule pack (cascades to rules and evidence requirements)
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rulePack = await prisma.rulePack.findUnique({
      where: { id },
    });

    if (!rulePack) {
      return res.status(404).json({ error: 'Rule pack not found' });
    }

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
// BULK RULES UPDATE
// ============================================

/**
 * PUT /api/admin/rule-packs/:id/rules
 * Bulk update rules for a rule pack
 * Replaces all existing rules with the provided set
 */
router.put('/:id/rules', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = BulkUpdateRulesSchema.parse(req.body);

    // Verify rule pack exists
    const rulePack = await prisma.rulePack.findUnique({
      where: { id },
    });

    if (!rulePack) {
      return res.status(404).json({ error: 'Rule pack not found' });
    }

    // Verify all rule definitions exist
    const ruleDefinitionIds = data.rules.map(r => r.ruleDefinitionId);
    const existingDefinitions = await prisma.ruleDefinition.findMany({
      where: { id: { in: ruleDefinitionIds } },
      select: { id: true },
    });

    if (existingDefinitions.length !== ruleDefinitionIds.length) {
      const foundIds = new Set(existingDefinitions.map(d => d.id));
      const missingIds = ruleDefinitionIds.filter(id => !foundIds.has(id));
      return res.status(400).json({
        error: 'Some rule definitions not found',
        missingIds,
      });
    }

    // Use transaction to replace all rules
    await prisma.$transaction(async (tx) => {
      // Delete existing rules (cascades to evidence requirements)
      await tx.rulePackRule.deleteMany({
        where: { rulePackId: id },
      });

      // Create new rules
      for (const rule of data.rules) {
        await tx.rulePackRule.create({
          data: {
            rulePackId: id,
            ruleDefinitionId: rule.ruleDefinitionId,
            isEnabled: rule.isEnabled,
            config: rule.config as JsonValue,
            sortOrder: rule.sortOrder,
          },
        });
      }
    });

    // Fetch updated rule pack with rules
    const updatedRulePack = await prisma.rulePack.findUnique({
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

    res.json({ rulePack: updatedRulePack });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating rules:', error);
    res.status(500).json({ error: 'Failed to update rules' });
  }
});

// ============================================
// BULK EVIDENCE UPDATE
// ============================================

/**
 * PUT /api/admin/rule-packs/:id/evidence
 * Bulk update evidence requirements for a specific rule
 */
router.put('/:id/evidence', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = BulkUpdateEvidenceSchema.parse(req.body);

    // Verify rule pack exists
    const rulePack = await prisma.rulePack.findUnique({
      where: { id },
    });

    if (!rulePack) {
      return res.status(404).json({ error: 'Rule pack not found' });
    }

    // Verify rule exists in this pack
    const rulePackRule = await prisma.rulePackRule.findFirst({
      where: {
        id: data.ruleId,
        rulePackId: id,
      },
    });

    if (!rulePackRule) {
      return res.status(404).json({ error: 'Rule not found in this pack' });
    }

    // Verify all evidence types exist
    const evidenceTypeIds = data.evidenceRequirements.map(e => e.evidenceTypeId);
    const existingEvidenceTypes = await prisma.ruleEvidenceType.findMany({
      where: { id: { in: evidenceTypeIds } },
      select: { id: true },
    });

    if (existingEvidenceTypes.length !== evidenceTypeIds.length) {
      const foundIds = new Set(existingEvidenceTypes.map(e => e.id));
      const missingIds = evidenceTypeIds.filter(id => !foundIds.has(id));
      return res.status(400).json({
        error: 'Some evidence types not found',
        missingIds,
      });
    }

    // Use transaction to replace evidence requirements
    await prisma.$transaction(async (tx) => {
      // Delete existing evidence requirements for this rule
      await tx.rulePackEvidenceRequirement.deleteMany({
        where: { rulePackRuleId: data.ruleId },
      });

      // Create new evidence requirements
      for (const evidence of data.evidenceRequirements) {
        await tx.rulePackEvidenceRequirement.create({
          data: {
            rulePackRuleId: data.ruleId,
            evidenceTypeId: evidence.evidenceTypeId,
            isRequired: evidence.isRequired,
          },
        });
      }
    });

    // Fetch updated rule with evidence
    const updatedRule = await prisma.rulePackRule.findUnique({
      where: { id: data.ruleId },
      include: {
        ruleDefinition: true,
        evidenceRequirements: {
          include: {
            evidenceType: true,
          },
        },
      },
    });

    res.json({ rule: updatedRule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating evidence:', error);
    res.status(500).json({ error: 'Failed to update evidence requirements' });
  }
});

// ============================================
// SINGLE RULE CRUD (for individual updates)
// ============================================

/**
 * POST /api/admin/rule-packs/:id/rules
 * Add a single rule to a rule pack
 */
router.post('/:id/rules', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ruleDefinitionId, isEnabled = true, config, sortOrder = 0 } = req.body;

    // Verify rule pack exists
    const rulePack = await prisma.rulePack.findUnique({ where: { id } });
    if (!rulePack) {
      return res.status(404).json({ error: 'Rule pack not found' });
    }

    // Verify rule definition exists
    const ruleDefinition = await prisma.ruleDefinition.findUnique({
      where: { id: ruleDefinitionId },
    });
    if (!ruleDefinition) {
      return res.status(404).json({ error: 'Rule definition not found' });
    }

    // Check if rule already attached
    const existingRule = await prisma.rulePackRule.findFirst({
      where: { rulePackId: id, ruleDefinitionId },
    });
    if (existingRule) {
      return res.status(409).json({ error: 'Rule already attached to this pack' });
    }

    const rulePackRule = await prisma.rulePackRule.create({
      data: {
        rulePackId: id,
        ruleDefinitionId,
        isEnabled,
        config: config as JsonValue,
        sortOrder,
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

    res.status(201).json({ rule: rulePackRule });
  } catch (error) {
    console.error('Error attaching rule:', error);
    res.status(500).json({ error: 'Failed to attach rule' });
  }
});

/**
 * PATCH /api/admin/rule-packs/:id/rules/:ruleId
 * Update a single rule in a rule pack
 */
router.patch('/:id/rules/:ruleId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, ruleId } = req.params;
    const { isEnabled, config, sortOrder } = req.body;

    // Verify rule exists in this pack
    const existingRule = await prisma.rulePackRule.findFirst({
      where: { id: ruleId, rulePackId: id },
    });

    if (!existingRule) {
      return res.status(404).json({ error: 'Rule not found in this pack' });
    }

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
    console.error('Error updating rule:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

/**
 * DELETE /api/admin/rule-packs/:id/rules/:ruleId
 * Remove a rule from a rule pack
 */
router.delete('/:id/rules/:ruleId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, ruleId } = req.params;

    // Verify rule exists in this pack
    const existingRule = await prisma.rulePackRule.findFirst({
      where: { id: ruleId, rulePackId: id },
    });

    if (!existingRule) {
      return res.status(404).json({ error: 'Rule not found in this pack' });
    }

    await prisma.rulePackRule.delete({
      where: { id: ruleId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error removing rule:', error);
    res.status(500).json({ error: 'Failed to remove rule' });
  }
});

export default router;

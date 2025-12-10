import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';

const router = Router();

// Get active schema for a plan type
router.get('/:planTypeCode', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { planTypeCode } = req.params;

    const planType = await prisma.planType.findFirst({
      where: {
        code: planTypeCode as 'IEP' | 'FIVE_OH_FOUR' | 'BEHAVIOR_PLAN',
      },
    });

    if (!planType) {
      return res.status(404).json({ error: 'Plan type not found' });
    }

    const schema = await prisma.planSchema.findFirst({
      where: {
        planTypeId: planType.id,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!schema) {
      return res.status(404).json({ error: 'No active schema found' });
    }

    res.json({
      schema: {
        id: schema.id,
        version: schema.version,
        name: schema.name,
        description: schema.description,
        fields: schema.fields,
        effectiveFrom: schema.effectiveFrom,
      },
    });
  } catch (error) {
    console.error('Schema fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

export default router;

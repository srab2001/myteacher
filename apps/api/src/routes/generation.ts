import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { generateDraftContent, hasReferenceContent, getGeneratableSections } from '../services/contentGeneration.js';
import { queryChunksForGeneration } from '../services/ingestion.js';

const router = Router();

// POST /plans/:planId/generate-draft - Generate draft content for a plan field
router.post('/plans/:planId/generate-draft', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { planId } = req.params;

    const bodySchema = z.object({
      sectionKey: z.string(),
      fieldKey: z.string(),
      needDescription: z.string().optional(),
      userPrompt: z.string().optional(),
    });

    const data = bodySchema.parse(req.body);

    // Verify plan exists and user has access
    const plan = await prisma.planInstance.findFirst({
      where: {
        id: planId,
        student: {
          teacherId: req.user!.id,
        },
      },
      include: {
        planType: true,
        student: true,
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Generate draft content
    const draft = await generateDraftContent({
      planId,
      sectionKey: data.sectionKey,
      fieldKey: data.fieldKey,
      studentContext: {
        grade: plan.student.grade,
        firstName: plan.student.firstName,
        needDescription: data.needDescription,
      },
      userPrompt: data.userPrompt,
    });

    if (!draft) {
      return res.status(404).json({
        error: 'No reference content available for this section',
        suggestion: 'Ask your administrator to upload best practice documents for this plan type.',
      });
    }

    res.json({
      draft: {
        text: draft.text,
        sectionTag: draft.sectionTag,
        sourceCount: draft.sourceChunkIds.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Draft generation error:', error);
    res.status(500).json({ error: 'Failed to generate draft' });
  }
});

// GET /plans/:planId/generation-availability - Check if content generation is available
router.get('/plans/:planId/generation-availability', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { planId } = req.params;

    // Verify plan exists and user has access
    const plan = await prisma.planInstance.findFirst({
      where: {
        id: planId,
        student: {
          teacherId: req.user!.id,
        },
      },
      include: {
        planType: true,
        student: true,
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Get available section tags for this plan type
    const sectionTags = getGeneratableSections(plan.planType.code);

    // Check which sections have reference content
    const availability: Record<string, boolean> = {};
    for (const tag of sectionTags) {
      availability[tag] = await hasReferenceContent({
        planTypeCode: plan.planType.code,
        sectionTag: tag,
        jurisdictionId: plan.student.jurisdictionId,
      });
    }

    res.json({
      planType: plan.planType.code,
      sections: availability,
    });
  } catch (error) {
    console.error('Generation availability error:', error);
    res.status(500).json({ error: 'Failed to check generation availability' });
  }
});

// GET /generation/reference-preview - Preview reference chunks (for debugging/admin)
router.get('/generation/reference-preview', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const querySchema = z.object({
      planTypeCode: z.enum(['IEP', 'FIVE_OH_FOUR', 'BEHAVIOR_PLAN']),
      sectionTag: z.string(),
      jurisdictionId: z.string().optional(),
      gradeBand: z.string().optional(),
      limit: z.coerce.number().min(1).max(10).optional().default(3),
    });

    const params = querySchema.parse(req.query);

    const chunks = await queryChunksForGeneration({
      planTypeCode: params.planTypeCode,
      sectionTag: params.sectionTag,
      jurisdictionId: params.jurisdictionId,
      gradeBand: params.gradeBand,
      limit: params.limit,
    });

    res.json({
      count: chunks.length,
      chunks: chunks.map(c => ({
        id: c.id,
        preview: c.text.substring(0, 200) + (c.text.length > 200 ? '...' : ''),
        sectionTag: c.sectionTag,
        gradeBand: c.gradeBand,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid parameters', details: error.errors });
    }
    console.error('Reference preview error:', error);
    res.status(500).json({ error: 'Failed to fetch reference chunks' });
  }
});

export default router;

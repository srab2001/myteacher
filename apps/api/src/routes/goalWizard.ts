import { Router } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { requireStudentAccess } from '../middleware/permissions.js';
import {
  generatePresentLevels,
  getPresentLevelsHelpers,
  gatherStudentContext,
} from '../services/presentLevelsService.js';
import {
  generateGoalDraft,
  getGoalTemplates,
  continueWizardChat,
  saveGoalDraft,
  finalizeGoal,
  WizardSession,
  GoalDraft,
} from '../services/goalWizardService.js';
import {
  validateGoalBasic,
  validateGoalWithAI,
  getQuickValidationStatus,
  suggestGoalImprovements,
  GoalForValidation,
} from '../services/goalValidationService.js';

const router = Router();

// Store wizard sessions in memory (could be moved to Redis for production)
const wizardSessions = new Map<string, WizardSession>();

// ============================================
// PRESENT LEVELS ENDPOINTS
// ============================================

// Get present levels helpers (quick context without GPT)
router.get(
  '/students/:studentId/present-levels/helpers',
  requireAuth,
  requireOnboarded,
  requireStudentAccess('studentId'),
  async (req, res) => {
    try {
      const { goalArea } = req.query;
      const helpers = await getPresentLevelsHelpers(
        req.params.studentId,
        goalArea as string | undefined
      );
      res.json(helpers);
    } catch (error) {
      console.error('Present levels helpers error:', error);
      res.status(500).json({ error: 'Failed to get present levels helpers' });
    }
  }
);

// Generate present levels with GPT
const generatePresentLevelsSchema = z.object({
  goalArea: z.string().optional(),
  planId: z.string().optional(),
});

router.post(
  '/students/:studentId/present-levels/generate',
  requireAuth,
  requireOnboarded,
  requireStudentAccess('studentId'),
  async (req, res) => {
    try {
      const data = generatePresentLevelsSchema.parse(req.body);
      const result = await generatePresentLevels({
        studentId: req.params.studentId,
        planId: data.planId,
        goalArea: data.goalArea,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Present levels generation error:', error);
      res.status(500).json({ error: 'Failed to generate present levels' });
    }
  }
);

// Get student context for goal writing
router.get(
  '/students/:studentId/goal-context',
  requireAuth,
  requireOnboarded,
  requireStudentAccess('studentId'),
  async (req, res) => {
    try {
      const { goalArea } = req.query;
      const context = await gatherStudentContext({
        studentId: req.params.studentId,
        goalArea: goalArea as string | undefined,
      });
      res.json(context);
    } catch (error) {
      console.error('Goal context error:', error);
      res.status(500).json({ error: 'Failed to get goal context' });
    }
  }
);

// ============================================
// GOAL WIZARD ENDPOINTS
// ============================================

// Get goal templates
router.get('/goal-templates', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { area, gradeBand } = req.query;

    if (!area) {
      // Return all areas
      const areas = [
        'READING',
        'WRITING',
        'MATH',
        'COMMUNICATION',
        'SOCIAL_EMOTIONAL',
        'BEHAVIOR',
        'MOTOR_SKILLS',
        'DAILY_LIVING',
        'VOCATIONAL',
      ];
      const allTemplates = areas.reduce(
        (acc, a) => {
          acc[a] = getGoalTemplates(a, gradeBand as string | undefined);
          return acc;
        },
        {} as Record<string, Array<{ template: string; comarRef: string }>>
      );
      return res.json({ templates: allTemplates });
    }

    const templates = getGoalTemplates(area as string, gradeBand as string | undefined);
    res.json({ templates });
  } catch (error) {
    console.error('Goal templates error:', error);
    res.status(500).json({ error: 'Failed to get goal templates' });
  }
}
);

// Generate a goal draft
const generateGoalDraftSchema = z.object({
  planId: z.string(),
  goalArea: z.string(),
  userPrompt: z.string().optional(),
  templateId: z.string().optional(),
  linkedArtifactIds: z.array(z.string()).optional(),
  presentLevels: z
    .object({
      currentPerformance: z.string(),
      strengthsNoted: z.array(z.string()),
      challengesNoted: z.array(z.string()),
      recentProgress: z.string(),
      dataSourceSummary: z.string(),
    })
    .optional(),
});

router.post('/goal-wizard/draft', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = generateGoalDraftSchema.parse(req.body);

    // Verify plan access
    const plan = await prisma.planInstance.findFirst({
      where: {
        id: data.planId,
        student: { teacherId: req.user!.id },
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const draft = await generateGoalDraft({
      planId: data.planId,
      goalArea: data.goalArea,
      userPrompt: data.userPrompt,
      templateId: data.templateId,
      linkedArtifactIds: data.linkedArtifactIds,
      presentLevels: data.presentLevels
        ? {
            area: data.goalArea,
            ...data.presentLevels,
            currentPerformance: data.presentLevels.currentPerformance || "",
            strengthsNoted: Array.isArray(data.presentLevels.strengthsNoted) ? data.presentLevels.strengthsNoted : [],
            challengesNoted: Array.isArray(data.presentLevels.challengesNoted) ? data.presentLevels.challengesNoted : [],
            recentProgress: data.presentLevels.recentProgress || "",
            dataSourceSummary: data.presentLevels.dataSourceSummary || "",

          }
        : undefined,
    });

    res.json({ draft });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Goal draft generation error:', error);
    res.status(500).json({ error: 'Failed to generate goal draft' });
  }
});

// Start a wizard chat session
const startWizardSessionSchema = z.object({
  planId: z.string(),
  goalArea: z.string(),
  linkedArtifactIds: z.array(z.string()).optional(),
});

router.post('/goal-wizard/session/start', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = startWizardSessionSchema.parse(req.body);

    // Verify plan access - admins can access all plans, teachers only their own students
    const isAdmin = req.user!.role === 'ADMIN';
    const plan = await prisma.planInstance.findFirst({
      where: {
        id: data.planId,
        ...(isAdmin ? {} : { student: { teacherId: req.user!.id } }),
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Create session
    const sessionId = `${req.user!.id}-${Date.now()}`;
    const session: WizardSession = {
      planId: data.planId,
      goalArea: data.goalArea,
      messages: [],
      currentDraft: null,
      linkedArtifactIds: data.linkedArtifactIds || [],
    };

    wizardSessions.set(sessionId, session);

    // Auto-expire sessions after 1 hour
    setTimeout(() => wizardSessions.delete(sessionId), 60 * 60 * 1000);

    res.json({
      sessionId,
      message: `Let's create a ${data.goalArea} goal. Would you like me to generate an initial draft, or would you prefer to describe what you're looking for first?`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Wizard session start error:', error);
    res.status(500).json({ error: 'Failed to start wizard session' });
  }
});

// Continue wizard chat
const wizardChatSchema = z.object({
  message: z.string().min(1),
});

router.post('/goal-wizard/session/:sessionId/chat', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const session = wizardSessions.get(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    const data = wizardChatSchema.parse(req.body);
    const result = await continueWizardChat(session, data.message);

    if (result.updatedDraft) {
      session.currentDraft = result.updatedDraft;
    }

    res.json({
      response: result.response,
      currentDraft: session.currentDraft,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Wizard chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Get current session state
router.get('/goal-wizard/session/:sessionId', requireAuth, requireOnboarded, async (req, res) => {
  const session = wizardSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  res.json({
    goalArea: session.goalArea,
    currentDraft: session.currentDraft,
    messageCount: session.messages.length,
  });
});

// Save draft from session
router.post('/goal-wizard/session/:sessionId/save', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const session = wizardSessions.get(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (!session.currentDraft) {
      return res.status(400).json({ error: 'No draft to save' });
    }

    const goalId = await saveGoalDraft({
      planId: session.planId,
      draft: session.currentDraft,
      linkedArtifactIds: session.linkedArtifactIds,
      userId: req.user!.id,
    });

    // Clean up session
    wizardSessions.delete(req.params.sessionId);

    res.json({ goalId, message: 'Goal saved successfully' });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: 'Failed to save goal' });
  }
});

// ============================================
// GOAL VALIDATION ENDPOINTS
// ============================================

// Quick validation (real-time feedback)
const quickValidateSchema = z.object({
  goalText: z.string(),
});

router.post('/goal-wizard/validate/quick', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = quickValidateSchema.parse(req.body);
    const result = getQuickValidationStatus(data.goalText);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Full validation (basic rules)
const validateGoalSchema = z.object({
  annualGoalText: z.string(),
  area: z.string(),
  objectives: z
    .array(
      z.object({
        objectiveText: z.string(),
        measurementCriteria: z.string().optional(),
      })
    )
    .optional(),
  baselineDescription: z.string().optional(),
  studentGrade: z.string().optional(),
});

router.post('/goal-wizard/validate', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = validateGoalSchema.parse(req.body);
    const result = validateGoalBasic(data as GoalForValidation);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Validation failed' });
  }
});

// AI-enhanced validation
router.post('/goal-wizard/validate/ai', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = validateGoalSchema.parse(req.body);
    const result = await validateGoalWithAI(data as GoalForValidation);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('AI validation error:', error);
    res.status(500).json({ error: 'AI validation failed' });
  }
});

// Get improvement suggestions
router.post('/goal-wizard/improve', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = validateGoalSchema.parse(req.body);
    const result = await suggestGoalImprovements(data as GoalForValidation);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Goal improvement error:', error);
    res.status(500).json({ error: 'Failed to generate improvements' });
  }
});

// ============================================
// GOAL ARTIFACT LINKING
// ============================================

// Link artifact to goal
const linkArtifactSchema = z.object({
  artifactComparisonId: z.string(),
  relevanceNote: z.string().optional(),
});

router.post('/goals/:goalId/artifacts', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = linkArtifactSchema.parse(req.body);

    // Verify goal access
    const goal = await prisma.goal.findFirst({
      where: {
        id: req.params.goalId,
        planInstance: {
          student: { teacherId: req.user!.id },
        },
      },
      include: {
        planInstance: { select: { studentId: true } },
      },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Verify artifact belongs to same student
    const artifact = await prisma.artifactComparison.findFirst({
      where: {
        id: data.artifactComparisonId,
        studentId: goal.planInstance.studentId,
      },
    });

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    const link = await prisma.goalArtifactLink.create({
      data: {
        goalId: goal.id,
        artifactComparisonId: artifact.id,
        relevanceNote: data.relevanceNote,
      },
    });

    res.status(201).json({ link });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    if ((error as { code?: string }).code === 'P2002') {
      return res.status(409).json({ error: 'Artifact already linked to this goal' });
    }
    console.error('Link artifact error:', error);
    res.status(500).json({ error: 'Failed to link artifact' });
  }
});

// Get artifacts linked to goal
router.get('/goals/:goalId/artifacts', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const links = await prisma.goalArtifactLink.findMany({
      where: {
        goalId: req.params.goalId,
        goal: {
          planInstance: {
            student: { teacherId: req.user!.id },
          },
        },
      },
      include: {
        artifactComparison: {
          select: {
            id: true,
            artifactDate: true,
            description: true,
            analysisText: true,
            baselineFileUrl: true,
            compareFileUrl: true,
          },
        },
      },
    });

    res.json({
      artifacts: links.map((l) => ({
        linkId: l.id,
        relevanceNote: l.relevanceNote,
        linkedAt: l.linkedAt,
        ...l.artifactComparison,
      })),
    });
  } catch (error) {
    console.error('Get artifacts error:', error);
    res.status(500).json({ error: 'Failed to get linked artifacts' });
  }
});

// Unlink artifact from goal
router.delete('/goals/:goalId/artifacts/:linkId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const link = await prisma.goalArtifactLink.findFirst({
      where: {
        id: req.params.linkId,
        goalId: req.params.goalId,
        goal: {
          planInstance: {
            student: { teacherId: req.user!.id },
          },
        },
      },
    });

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await prisma.goalArtifactLink.delete({
      where: { id: link.id },
    });

    res.json({ message: 'Artifact unlinked successfully' });
  } catch (error) {
    console.error('Unlink artifact error:', error);
    res.status(500).json({ error: 'Failed to unlink artifact' });
  }
});

// ============================================
// GOAL OBJECTIVES ENDPOINTS
// ============================================

// Get objectives for a goal
router.get('/goals/:goalId/objectives', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const objectives = await prisma.goalObjective.findMany({
      where: {
        goalId: req.params.goalId,
        goal: {
          planInstance: {
            student: { teacherId: req.user!.id },
          },
        },
      },
      orderBy: { sequence: 'asc' },
    });

    res.json({ objectives });
  } catch (error) {
    console.error('Get objectives error:', error);
    res.status(500).json({ error: 'Failed to get objectives' });
  }
});

// Add objective to goal
const addObjectiveSchema = z.object({
  objectiveText: z.string().min(10),
  measurementCriteria: z.string().optional(),
  targetDate: z.string().optional(),
});

router.post('/goals/:goalId/objectives', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = addObjectiveSchema.parse(req.body);

    // Verify goal access
    const goal = await prisma.goal.findFirst({
      where: {
        id: req.params.goalId,
        planInstance: {
          student: { teacherId: req.user!.id },
        },
      },
      include: {
        objectives: {
          orderBy: { sequence: 'desc' },
          take: 1,
        },
      },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const nextSequence = (goal.objectives[0]?.sequence || 0) + 1;

    const objective = await prisma.goalObjective.create({
      data: {
        goalId: goal.id,
        sequence: nextSequence,
        objectiveText: data.objectiveText,
        measurementCriteria: data.measurementCriteria,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      },
    });

    res.status(201).json({ objective });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Add objective error:', error);
    res.status(500).json({ error: 'Failed to add objective' });
  }
});

// Update objective
router.patch('/goals/:goalId/objectives/:objectiveId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const objective = await prisma.goalObjective.findFirst({
      where: {
        id: req.params.objectiveId,
        goalId: req.params.goalId,
        goal: {
          planInstance: {
            student: { teacherId: req.user!.id },
          },
        },
      },
    });

    if (!objective) {
      return res.status(404).json({ error: 'Objective not found' });
    }

    const data = addObjectiveSchema.partial().parse(req.body);

    const updated = await prisma.goalObjective.update({
      where: { id: objective.id },
      data: {
        ...(data.objectiveText && { objectiveText: data.objectiveText }),
        ...(data.measurementCriteria !== undefined && { measurementCriteria: data.measurementCriteria }),
        ...(data.targetDate && { targetDate: new Date(data.targetDate) }),
      },
    });

    res.json({ objective: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Update objective error:', error);
    res.status(500).json({ error: 'Failed to update objective' });
  }
});

// Mark objective as completed
router.post(
  '/goals/:goalId/objectives/:objectiveId/complete',
  requireAuth,
  requireOnboarded,
  async (req, res) => {
    try {
      const objective = await prisma.goalObjective.findFirst({
        where: {
          id: req.params.objectiveId,
          goalId: req.params.goalId,
          goal: {
            planInstance: {
              student: { teacherId: req.user!.id },
            },
          },
        },
      });

      if (!objective) {
        return res.status(404).json({ error: 'Objective not found' });
      }

      const updated = await prisma.goalObjective.update({
        where: { id: objective.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      res.json({ objective: updated });
    } catch (error) {
      console.error('Complete objective error:', error);
      res.status(500).json({ error: 'Failed to complete objective' });
    }
  }
);

// Finalize goal (mark as ready for IEP)
router.post('/goals/:goalId/finalize', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: {
        id: req.params.goalId,
        planInstance: {
          student: { teacherId: req.user!.id },
        },
      },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await finalizeGoal(goal.id);
    res.json({ message: 'Goal finalized successfully' });
  } catch (error) {
    console.error('Finalize goal error:', error);
    res.status(500).json({ error: 'Failed to finalize goal' });
  }
});

export default router;

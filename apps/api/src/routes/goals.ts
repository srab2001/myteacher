import { Router } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';

const router = Router();

// Create a new goal for a plan
const createGoalSchema = z.object({
  goalCode: z.string().min(1),
  area: z.enum(['READING', 'WRITING', 'MATH', 'COMMUNICATION', 'SOCIAL_EMOTIONAL', 'BEHAVIOR', 'MOTOR_SKILLS', 'DAILY_LIVING', 'VOCATIONAL', 'OTHER']),
  annualGoalText: z.string().min(10),
  baselineJson: z.record(z.unknown()).optional(),
  shortTermObjectives: z.array(z.string()).optional(),
  progressSchedule: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']).optional(),
  targetDate: z.string().optional(),
});

router.post('/plans/:planId/goals', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = createGoalSchema.parse(req.body);

    // Verify plan belongs to teacher
    const plan = await prisma.planInstance.findFirst({
      where: {
        id: req.params.planId,
        student: {
          teacherId: req.user!.id,
        },
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const goal = await prisma.goal.create({
      data: {
        planInstanceId: plan.id,
        goalCode: data.goalCode,
        area: data.area,
        annualGoalText: data.annualGoalText,
        baselineJson: (data.baselineJson || {}) as Prisma.InputJsonValue,
        shortTermObjectives: data.shortTermObjectives || [],
        progressSchedule: data.progressSchedule,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      },
    });

    res.status(201).json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Goal creation error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Get all goals for a plan
router.get('/plans/:planId/goals', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: {
        planInstanceId: req.params.planId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
      include: {
        progressRecords: {
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            recordedBy: {
              select: { displayName: true },
            },
          },
        },
        workSamples: {
          orderBy: { capturedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { goalCode: 'asc' },
    });

    res.json({ goals });
  } catch (error) {
    console.error('Goals fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Get a single goal
router.get('/:goalId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: {
        id: req.params.goalId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
      include: {
        progressRecords: {
          orderBy: { date: 'desc' },
          include: {
            recordedBy: {
              select: { displayName: true },
            },
          },
        },
        workSamples: {
          orderBy: { capturedAt: 'desc' },
        },
        planInstance: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ goal });
  } catch (error) {
    console.error('Goal fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch goal' });
  }
});

// Update a goal
router.patch('/:goalId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: {
        id: req.params.goalId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const data = createGoalSchema.partial().parse(req.body);

    const updatedGoal = await prisma.goal.update({
      where: { id: goal.id },
      data: {
        ...(data.area && { area: data.area }),
        ...(data.annualGoalText && { annualGoalText: data.annualGoalText }),
        ...(data.baselineJson && { baselineJson: data.baselineJson as Prisma.InputJsonValue }),
        ...(data.shortTermObjectives && { shortTermObjectives: data.shortTermObjectives }),
        ...(data.progressSchedule && { progressSchedule: data.progressSchedule }),
        ...(data.targetDate && { targetDate: new Date(data.targetDate) }),
      },
    });

    res.json({ goal: updatedGoal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Goal update error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Quick progress entry (one-tap)
const quickProgressSchema = z.object({
  quickSelect: z.enum(['NOT_ADDRESSED', 'FULL_SUPPORT', 'SOME_SUPPORT', 'LOW_SUPPORT', 'MET_TARGET']),
  comment: z.string().optional(),
  date: z.string().optional(),
});

router.post('/:goalId/progress/quick', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = quickProgressSchema.parse(req.body);

    const goal = await prisma.goal.findFirst({
      where: {
        id: req.params.goalId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const progress = await prisma.goalProgress.create({
      data: {
        goalId: goal.id,
        quickSelect: data.quickSelect,
        comment: data.comment,
        date: data.date ? new Date(data.date) : new Date(),
        recordedById: req.user!.id,
      },
      include: {
        recordedBy: {
          select: { displayName: true },
        },
      },
    });

    res.status(201).json({ progress });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Quick progress error:', error);
    res.status(500).json({ error: 'Failed to record progress' });
  }
});

// Dictation progress entry
const dictationProgressSchema = z.object({
  quickSelect: z.enum(['NOT_ADDRESSED', 'FULL_SUPPORT', 'SOME_SUPPORT', 'LOW_SUPPORT', 'MET_TARGET']),
  comment: z.string().min(1), // Transcribed text
  measureJson: z.record(z.unknown()).optional(),
  date: z.string().optional(),
});

router.post('/:goalId/progress/dictation', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = dictationProgressSchema.parse(req.body);

    const goal = await prisma.goal.findFirst({
      where: {
        id: req.params.goalId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const progress = await prisma.goalProgress.create({
      data: {
        goalId: goal.id,
        quickSelect: data.quickSelect,
        comment: data.comment,
        measureJson: (data.measureJson || {}) as Prisma.InputJsonValue,
        isDictated: true,
        date: data.date ? new Date(data.date) : new Date(),
        recordedById: req.user!.id,
      },
      include: {
        recordedBy: {
          select: { displayName: true },
        },
      },
    });

    res.status(201).json({ progress });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Dictation progress error:', error);
    res.status(500).json({ error: 'Failed to record progress' });
  }
});

// Get all progress for a goal
router.get('/:goalId/progress', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const progressRecords = await prisma.goalProgress.findMany({
      where: {
        goalId: req.params.goalId,
        goal: {
          planInstance: {
            student: {
              teacherId: req.user!.id,
            },
          },
        },
      },
      include: {
        recordedBy: {
          select: { displayName: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ progress: progressRecords });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { prisma, BehaviorMeasurementType, Prisma } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';

const router = Router();

// Get behavior plan by plan instance ID
router.get('/plans/:planId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const behaviorPlan = await prisma.behaviorPlan.findFirst({
      where: {
        planInstanceId: req.params.planId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
      include: {
        planInstance: {
          include: {
            student: true,
            planType: true,
            schema: true,
            fieldValues: true,
          },
        },
        targets: {
          include: {
            events: {
              orderBy: { eventDate: 'desc' },
              take: 10,
            },
          },
          orderBy: { code: 'asc' },
        },
      },
    });

    if (!behaviorPlan) {
      return res.status(404).json({ error: 'Behavior plan not found' });
    }

    res.json({ behaviorPlan });
  } catch (error) {
    console.error('Behavior plan fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch behavior plan' });
  }
});

// Create a behavior target
const createTargetSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  definition: z.string().min(10),
  examples: z.string().optional(),
  nonExamples: z.string().optional(),
  measurementType: z.nativeEnum(BehaviorMeasurementType),
});

router.post('/plans/:planId/targets', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = createTargetSchema.parse(req.body);

    // Find the behavior plan and verify access
    const behaviorPlan = await prisma.behaviorPlan.findFirst({
      where: {
        planInstanceId: req.params.planId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
    });

    if (!behaviorPlan) {
      return res.status(404).json({ error: 'Behavior plan not found' });
    }

    const target = await prisma.behaviorTarget.create({
      data: {
        behaviorPlanId: behaviorPlan.id,
        code: data.code,
        name: data.name,
        definition: data.definition,
        examples: data.examples,
        nonExamples: data.nonExamples,
        measurementType: data.measurementType,
      },
    });

    res.status(201).json({ target });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Target creation error:', error);
    res.status(500).json({ error: 'Failed to create target' });
  }
});

// Get all behavior targets for a plan
router.get('/plans/:planId/targets', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const behaviorPlan = await prisma.behaviorPlan.findFirst({
      where: {
        planInstanceId: req.params.planId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
    });

    if (!behaviorPlan) {
      return res.status(404).json({ error: 'Behavior plan not found' });
    }

    const targets = await prisma.behaviorTarget.findMany({
      where: {
        behaviorPlanId: behaviorPlan.id,
        isActive: true,
      },
      include: {
        events: {
          orderBy: { eventDate: 'desc' },
          take: 5,
          include: {
            recordedBy: {
              select: { displayName: true },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    res.json({ targets });
  } catch (error) {
    console.error('Targets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch targets' });
  }
});

// Update a behavior target
router.patch('/targets/:targetId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const target = await prisma.behaviorTarget.findFirst({
      where: {
        id: req.params.targetId,
        behaviorPlan: {
          planInstance: {
            student: {
              teacherId: req.user!.id,
            },
          },
        },
      },
    });

    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const data = createTargetSchema.partial().parse(req.body);

    const updatedTarget = await prisma.behaviorTarget.update({
      where: { id: target.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.definition && { definition: data.definition }),
        ...(data.examples !== undefined && { examples: data.examples }),
        ...(data.nonExamples !== undefined && { nonExamples: data.nonExamples }),
        ...(data.measurementType && { measurementType: data.measurementType }),
      },
    });

    res.json({ target: updatedTarget });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Target update error:', error);
    res.status(500).json({ error: 'Failed to update target' });
  }
});

// Delete (deactivate) a behavior target
router.delete('/targets/:targetId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const target = await prisma.behaviorTarget.findFirst({
      where: {
        id: req.params.targetId,
        behaviorPlan: {
          planInstance: {
            student: {
              teacherId: req.user!.id,
            },
          },
        },
      },
    });

    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    // Soft delete by setting isActive to false
    await prisma.behaviorTarget.update({
      where: { id: target.id },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Target delete error:', error);
    res.status(500).json({ error: 'Failed to delete target' });
  }
});

// Create a behavior event
const createEventSchema = z.object({
  eventDate: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  count: z.number().optional(),
  rating: z.number().min(1).max(5).optional(),
  durationSeconds: z.number().optional(),
  contextJson: z.record(z.unknown()).optional(),
});

router.post('/targets/:targetId/events', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = createEventSchema.parse(req.body);

    // Verify target access
    const target = await prisma.behaviorTarget.findFirst({
      where: {
        id: req.params.targetId,
        behaviorPlan: {
          planInstance: {
            student: {
              teacherId: req.user!.id,
            },
          },
        },
      },
    });

    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    // Validate that the event data matches the measurement type
    if (target.measurementType === 'FREQUENCY' && data.count === undefined) {
      return res.status(400).json({ error: 'Count is required for frequency measurement' });
    }
    if (target.measurementType === 'DURATION' && data.durationSeconds === undefined) {
      return res.status(400).json({ error: 'Duration is required for duration measurement' });
    }
    if (target.measurementType === 'RATING' && data.rating === undefined) {
      return res.status(400).json({ error: 'Rating is required for rating measurement' });
    }

    const event = await prisma.behaviorEvent.create({
      data: {
        behaviorTargetId: target.id,
        eventDate: new Date(data.eventDate),
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        count: data.count,
        rating: data.rating,
        durationSeconds: data.durationSeconds,
        contextJson: (data.contextJson || {}) as Prisma.InputJsonValue,
        recordedById: req.user!.id,
      },
      include: {
        recordedBy: {
          select: { displayName: true },
        },
      },
    });

    res.status(201).json({ event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get events for a behavior target
router.get('/targets/:targetId/events', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { from, to } = req.query;

    // Verify target access
    const target = await prisma.behaviorTarget.findFirst({
      where: {
        id: req.params.targetId,
        behaviorPlan: {
          planInstance: {
            student: {
              teacherId: req.user!.id,
            },
          },
        },
      },
    });

    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from && typeof from === 'string') {
      dateFilter.gte = new Date(from);
    }
    if (to && typeof to === 'string') {
      dateFilter.lte = new Date(to);
    }

    const events = await prisma.behaviorEvent.findMany({
      where: {
        behaviorTargetId: target.id,
        ...(Object.keys(dateFilter).length > 0 && { eventDate: dateFilter }),
      },
      include: {
        recordedBy: {
          select: { displayName: true },
        },
      },
      orderBy: { eventDate: 'desc' },
    });

    // Calculate summary statistics
    const summary = {
      totalEvents: events.length,
      totalCount: events.reduce((sum, e) => sum + (e.count || 0), 0),
      totalDurationSeconds: events.reduce((sum, e) => sum + (e.durationSeconds || 0), 0),
      averageRating: events.length > 0
        ? events.filter(e => e.rating !== null).reduce((sum, e) => sum + (e.rating || 0), 0) /
          events.filter(e => e.rating !== null).length || 0
        : 0,
    };

    res.json({ events, summary, measurementType: target.measurementType });
  } catch (error) {
    console.error('Events fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Delete a behavior event
router.delete('/events/:eventId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const event = await prisma.behaviorEvent.findFirst({
      where: {
        id: req.params.eventId,
        target: {
          behaviorPlan: {
            planInstance: {
              student: {
                teacherId: req.user!.id,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await prisma.behaviorEvent.delete({
      where: { id: event.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Event delete error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;

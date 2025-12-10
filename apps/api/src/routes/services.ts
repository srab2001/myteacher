import { Router } from 'express';
import { z } from 'zod';
import { prisma, ServiceType, ServiceSetting } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';

const router = Router();

// Create a service log
const createServiceLogSchema = z.object({
  date: z.string(),
  minutes: z.number().min(1).max(480),
  serviceType: z.nativeEnum(ServiceType),
  setting: z.nativeEnum(ServiceSetting),
  notes: z.string().optional(),
});

router.post('/plans/:planId/services', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = createServiceLogSchema.parse(req.body);

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

    const serviceLog = await prisma.serviceLog.create({
      data: {
        planInstanceId: plan.id,
        date: new Date(data.date),
        minutes: data.minutes,
        serviceType: data.serviceType,
        setting: data.setting,
        notes: data.notes,
        providerId: req.user!.id,
      },
      include: {
        provider: {
          select: { displayName: true },
        },
      },
    });

    res.status(201).json({ serviceLog });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Service log creation error:', error);
    res.status(500).json({ error: 'Failed to create service log' });
  }
});

// Get all service logs for a plan
router.get('/plans/:planId/services', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const serviceLogs = await prisma.serviceLog.findMany({
      where: {
        planInstanceId: req.params.planId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
      include: {
        provider: {
          select: { displayName: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate totals by service type
    const totalsByType: Record<string, number> = {};
    for (const log of serviceLogs) {
      const key = log.serviceType;
      totalsByType[key] = (totalsByType[key] || 0) + log.minutes;
    }

    // Calculate weekly totals
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyLogs = serviceLogs.filter(log => new Date(log.date) >= weekStart);
    const weeklyTotal = weeklyLogs.reduce((sum, log) => sum + log.minutes, 0);

    res.json({
      serviceLogs,
      summary: {
        totalMinutes: serviceLogs.reduce((sum, log) => sum + log.minutes, 0),
        weeklyMinutes: weeklyTotal,
        totalsByType,
        logCount: serviceLogs.length,
      },
    });
  } catch (error) {
    console.error('Service logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch service logs' });
  }
});

// Update a service log
router.patch('/:serviceId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const serviceLog = await prisma.serviceLog.findFirst({
      where: {
        id: req.params.serviceId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
    });

    if (!serviceLog) {
      return res.status(404).json({ error: 'Service log not found' });
    }

    const data = createServiceLogSchema.partial().parse(req.body);

    const updated = await prisma.serviceLog.update({
      where: { id: serviceLog.id },
      data: {
        ...(data.date && { date: new Date(data.date) }),
        ...(data.minutes && { minutes: data.minutes }),
        ...(data.serviceType && { serviceType: data.serviceType }),
        ...(data.setting && { setting: data.setting }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        provider: {
          select: { displayName: true },
        },
      },
    });

    res.json({ serviceLog: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Service log update error:', error);
    res.status(500).json({ error: 'Failed to update service log' });
  }
});

// Delete a service log
router.delete('/:serviceId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const serviceLog = await prisma.serviceLog.findFirst({
      where: {
        id: req.params.serviceId,
        planInstance: {
          student: {
            teacherId: req.user!.id,
          },
        },
      },
    });

    if (!serviceLog) {
      return res.status(404).json({ error: 'Service log not found' });
    }

    await prisma.serviceLog.delete({
      where: { id: serviceLog.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Service log delete error:', error);
    res.status(500).json({ error: 'Failed to delete service log' });
  }
});

export default router;

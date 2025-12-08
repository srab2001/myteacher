import { Router } from 'express';
import { z } from 'zod';
import { prisma, StatusScope, StatusCode } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { getAccessibleStudentIds, requireStudentAccess, getUserPermissions } from '../middleware/permissions.js';

const router = Router();

// Get all students for current user (based on permissions)
router.get('/', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const studentIds = await getAccessibleStudentIds(req.user!.id);

    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        isActive: true,
      },
      include: {
        statuses: {
          orderBy: { effectiveDate: 'desc' },
          take: 4, // Get latest status for each scope
          distinct: ['scope'],
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const studentsWithStatus = students.map(s => ({
      id: s.id,
      recordId: s.recordId,
      externalId: s.externalId,
      firstName: s.firstName,
      lastName: s.lastName,
      grade: s.grade,
      schoolName: s.schoolName,
      overallStatus: s.statuses.find(st => st.scope === 'OVERALL') || null,
      statuses: s.statuses,
    }));

    res.json({ students: studentsWithStatus });
  } catch (error) {
    console.error('Students fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /students/status-summary - Get status summary for all accessible students
router.get('/status-summary', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const studentIds = await getAccessibleStudentIds(req.user!.id);

    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        isActive: true,
      },
      include: {
        statuses: {
          where: { scope: 'OVERALL' },
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
        planInstances: {
          where: { status: 'ACTIVE' },
          include: {
            planType: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const statusSummary = students.map(s => {
      const overallStatus = s.statuses[0] || null;
      const activePlans = s.planInstances;

      const activeIEP = activePlans.find(p => p.planType.code === 'IEP');
      const active504 = activePlans.find(p => p.planType.code === 'FIVE_OH_FOUR');
      const activeBehavior = activePlans.find(p => p.planType.code === 'BEHAVIOR_PLAN');

      return {
        studentId: s.id,
        recordId: s.recordId,
        firstName: s.firstName,
        lastName: s.lastName,
        gradeLevel: s.grade,
        overallStatus: overallStatus ? {
          code: overallStatus.code,
          summary: overallStatus.summary,
          effectiveDate: overallStatus.effectiveDate,
        } : null,
        hasActiveIEP: !!activeIEP,
        hasActive504: !!active504,
        hasActiveBehaviorPlan: !!activeBehavior,
        activePlanDates: {
          iepStart: activeIEP?.startDate || null,
          iepEnd: activeIEP?.endDate || null,
          sec504Start: active504?.startDate || null,
          sec504End: active504?.endDate || null,
          behaviorStart: activeBehavior?.startDate || null,
        },
      };
    });

    res.json({ students: statusSummary });
  } catch (error) {
    console.error('Status summary fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch status summary' });
  }
});

// Get single student
router.get('/:id', requireAuth, requireOnboarded, requireStudentAccess('id'), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        statuses: {
          orderBy: { effectiveDate: 'desc' },
          take: 10,
        },
        planInstances: {
          include: {
            planType: true,
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      student: {
        id: student.id,
        recordId: student.recordId,
        externalId: student.externalId,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth,
        grade: student.grade,
        schoolName: student.schoolName,
        statuses: student.statuses,
        plans: student.planInstances.map(p => ({
          id: p.id,
          type: p.planType.name,
          startDate: p.startDate,
          endDate: p.endDate,
          status: p.status,
        })),
      },
    });
  } catch (error) {
    console.error('Student fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// Get student statuses
router.get('/:id/status', requireAuth, requireOnboarded, requireStudentAccess('id'), async (req, res) => {
  try {
    // Get latest status for each scope
    const latestStatuses = await prisma.studentStatus.findMany({
      where: { studentId: req.params.id },
      orderBy: { effectiveDate: 'desc' },
      distinct: ['scope'],
      include: {
        updatedBy: {
          select: { displayName: true },
        },
      },
    });

    // Get status history
    const statusHistory = await prisma.studentStatus.findMany({
      where: { studentId: req.params.id },
      orderBy: { effectiveDate: 'desc' },
      take: 20,
      include: {
        updatedBy: {
          select: { displayName: true },
        },
      },
    });

    res.json({
      current: latestStatuses,
      history: statusHistory,
    });
  } catch (error) {
    console.error('Status fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Create new status
const statusSchema = z.object({
  scope: z.nativeEnum(StatusScope),
  code: z.nativeEnum(StatusCode),
  summary: z.string().max(500).optional(),
  effectiveDate: z.string().transform(s => new Date(s)),
});

router.post('/:id/status', requireAuth, requireOnboarded, requireStudentAccess('id'), async (req, res) => {
  try {
    const data = statusSchema.parse(req.body);

    const status = await prisma.studentStatus.create({
      data: {
        studentId: req.params.id,
        scope: data.scope,
        code: data.code,
        summary: data.summary,
        effectiveDate: data.effectiveDate,
        updatedById: req.user!.id,
      },
      include: {
        updatedBy: {
          select: { displayName: true },
        },
      },
    });

    res.status(201).json({ status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Status create error:', error);
    res.status(500).json({ error: 'Failed to create status' });
  }
});

// GET /:id/iep-progress - Get IEP progress report for a student
router.get('/:id/iep-progress', requireAuth, requireOnboarded, requireStudentAccess('id'), async (req, res) => {
  try {
    // Find active IEP plan for this student
    const iepPlan = await prisma.planInstance.findFirst({
      where: {
        studentId: req.params.id,
        planType: { code: 'IEP' },
        status: 'ACTIVE',
      },
      include: {
        goals: {
          include: {
            progressRecords: {
              orderBy: { date: 'desc' },
            },
          },
        },
        student: true,
        planType: true,
      },
    });

    if (!iepPlan) {
      return res.status(404).json({ error: 'No active IEP found for this student' });
    }

    // Calculate progress summary for each goal
    const goalsWithProgress = iepPlan.goals.map(goal => {
      const records = goal.progressRecords;
      const latestRecord = records[0] || null;
      const firstRecord = records[records.length - 1] || null;

      // Calculate trend if there are at least 2 records
      let trend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data';
      if (records.length >= 2) {
        const recentAvg = records.slice(0, Math.min(3, records.length)).reduce((sum, r) => sum + (r.percentCorrect || 0), 0) / Math.min(3, records.length);
        const olderAvg = records.slice(-Math.min(3, records.length)).reduce((sum, r) => sum + (r.percentCorrect || 0), 0) / Math.min(3, records.length);

        if (recentAvg > olderAvg + 5) trend = 'improving';
        else if (recentAvg < olderAvg - 5) trend = 'declining';
        else trend = 'stable';
      }

      return {
        goalId: goal.id,
        goalCode: goal.goalCode,
        area: goal.area,
        annualGoalText: goal.annualGoalText,
        baselineValue: goal.baselineValue,
        targetValue: goal.targetValue,
        targetDate: goal.targetDate,
        progressSummary: {
          totalRecords: records.length,
          latestValue: latestRecord?.percentCorrect || null,
          latestDate: latestRecord?.date || null,
          firstValue: firstRecord?.percentCorrect || null,
          trend,
          isOnTrack: latestRecord ? (latestRecord.percentCorrect || 0) >= (goal.targetValue || 0) * 0.8 : null,
        },
        recentProgress: records.slice(0, 5).map(r => ({
          id: r.id,
          date: r.date,
          percentCorrect: r.percentCorrect,
          trials: r.trials,
          notes: r.notes,
        })),
      };
    });

    res.json({
      studentId: iepPlan.studentId,
      studentName: `${iepPlan.student.firstName} ${iepPlan.student.lastName}`,
      planId: iepPlan.id,
      planStatus: iepPlan.status,
      planStartDate: iepPlan.startDate,
      planEndDate: iepPlan.endDate,
      totalGoals: iepPlan.goals.length,
      goals: goalsWithProgress,
    });
  } catch (error) {
    console.error('IEP progress fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch IEP progress' });
  }
});

// GET /:id/service-minutes - Get service minutes report for a student
router.get('/:id/service-minutes', requireAuth, requireOnboarded, requireStudentAccess('id'), async (req, res) => {
  try {
    const { from, to } = req.query;

    // Default to current school year if no dates provided
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth() >= 8 ? 8 : -4, 1); // Sept 1 or prev Sept 1
    const defaultTo = now;

    const fromDate = from && typeof from === 'string' ? new Date(from) : defaultFrom;
    const toDate = to && typeof to === 'string' ? new Date(to) : defaultTo;

    // Find active IEP for this student
    const iepPlan = await prisma.planInstance.findFirst({
      where: {
        studentId: req.params.id,
        planType: { code: 'IEP' },
        status: 'ACTIVE',
      },
      include: {
        serviceLogs: {
          where: {
            date: {
              gte: fromDate,
              lte: toDate,
            },
          },
          include: {
            provider: {
              select: { displayName: true },
            },
          },
          orderBy: { date: 'desc' },
        },
        student: true,
      },
    });

    if (!iepPlan) {
      return res.status(404).json({ error: 'No active IEP found for this student' });
    }

    // Group service logs by service type
    const serviceGroups: Record<string, {
      serviceType: string;
      totalMinutes: number;
      sessionCount: number;
      logs: Array<{
        id: string;
        date: Date;
        minutes: number;
        notes: string | null;
        provider: string | null;
      }>;
    }> = {};

    for (const log of iepPlan.serviceLogs) {
      if (!serviceGroups[log.serviceType]) {
        serviceGroups[log.serviceType] = {
          serviceType: log.serviceType,
          totalMinutes: 0,
          sessionCount: 0,
          logs: [],
        };
      }
      serviceGroups[log.serviceType].totalMinutes += log.minutes;
      serviceGroups[log.serviceType].sessionCount += 1;
      serviceGroups[log.serviceType].logs.push({
        id: log.id,
        date: log.date,
        minutes: log.minutes,
        notes: log.notes,
        provider: log.provider?.displayName || null,
      });
    }

    const totalMinutes = Object.values(serviceGroups).reduce((sum, g) => sum + g.totalMinutes, 0);
    const totalSessions = Object.values(serviceGroups).reduce((sum, g) => sum + g.sessionCount, 0);

    res.json({
      studentId: iepPlan.studentId,
      studentName: `${iepPlan.student.firstName} ${iepPlan.student.lastName}`,
      planId: iepPlan.id,
      dateRange: {
        from: fromDate,
        to: toDate,
      },
      summary: {
        totalMinutes,
        totalSessions,
        averageMinutesPerSession: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0,
      },
      services: Object.values(serviceGroups),
    });
  } catch (error) {
    console.error('Service minutes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch service minutes' });
  }
});

export default router;

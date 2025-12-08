import { Router } from 'express';
import { z } from 'zod';
import { prisma, StatusScope, StatusCode } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';

const router = Router();

// Get all students for current teacher
router.get('/', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        teacherId: req.user!.id,
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

// Get single student
router.get('/:id', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const student = await prisma.student.findFirst({
      where: {
        id: req.params.id,
        teacherId: req.user!.id,
      },
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
router.get('/:id/status', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const student = await prisma.student.findFirst({
      where: {
        id: req.params.id,
        teacherId: req.user!.id,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

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

router.post('/:id/status', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = statusSchema.parse(req.body);

    const student = await prisma.student.findFirst({
      where: {
        id: req.params.id,
        teacherId: req.user!.id,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

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

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db.js';

const router = Router();

/**
 * GET /reference/states
 * Returns all active states for dropdown selection
 */
router.get('/states', async (_req: Request, res: Response) => {
  try {
    const states = await prisma.state.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    res.json(states);
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

/**
 * GET /reference/states/:stateId/districts
 * Returns all active districts for a given state
 */
router.get('/states/:stateId/districts', async (req: Request, res: Response) => {
  try {
    const { stateId } = req.params;

    const districts = await prisma.district.findMany({
      where: {
        stateId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        stateId: true,
      },
    });

    res.json(districts);
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

/**
 * GET /reference/districts/:districtId/schools
 * Returns all active schools for a given district
 */
router.get('/districts/:districtId/schools', async (req: Request, res: Response) => {
  try {
    const { districtId } = req.params;

    const schools = await prisma.school.findMany({
      where: {
        districtId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        schoolType: true,
        districtId: true,
      },
    });

    res.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

/**
 * GET /reference/schools/:schoolId
 * Returns a single school with its district and state info
 */
router.get('/schools/:schoolId', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        code: true,
        name: true,
        schoolType: true,
        district: {
          select: {
            id: true,
            code: true,
            name: true,
            state: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(school);
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

export default router;

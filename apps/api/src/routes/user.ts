import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Schema for onboarding update - use z.enum with literal values since UserRole is a type alias
const onboardingSchema = z.object({
  role: z.enum(['TEACHER', 'CASE_MANAGER', 'ADMIN']),
  stateCode: z.string().min(2).max(2),
  districtName: z.string().min(1),
  schoolName: z.string().min(1),
});

// Update user profile (onboarding)
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const data = onboardingSchema.parse(req.body);

    // Find jurisdiction
    const jurisdiction = await prisma.jurisdiction.findFirst({
      where: {
        stateCode: data.stateCode,
        districtName: data.districtName,
      },
    });

    const updatedUser = await prisma.appUser.update({
      where: { id: req.user!.id },
      data: {
        role: data.role,
        stateCode: data.stateCode,
        districtName: data.districtName,
        schoolName: data.schoolName,
        jurisdictionId: jurisdiction?.id,
        isOnboarded: true,
      },
    });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl,
        role: updatedUser.role,
        stateCode: updatedUser.stateCode,
        districtName: updatedUser.districtName,
        schoolName: updatedUser.schoolName,
        isOnboarded: updatedUser.isOnboarded,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get available jurisdictions for onboarding
router.get('/jurisdictions', requireAuth, async (_req, res) => {
  try {
    const jurisdictions = await prisma.jurisdiction.findMany({
      select: {
        id: true,
        stateCode: true,
        stateName: true,
        districtCode: true,
        districtName: true,
      },
      orderBy: [{ stateName: 'asc' }, { districtName: 'asc' }],
    });

    // Group by state
    const byState = jurisdictions.reduce(
      (acc, j) => {
        if (!acc[j.stateCode]) {
          acc[j.stateCode] = {
            stateCode: j.stateCode,
            stateName: j.stateName,
            districts: [],
          };
        }
        acc[j.stateCode].districts.push({
          code: j.districtCode,
          name: j.districtName,
        });
        return acc;
      },
      {} as Record<string, { stateCode: string; stateName: string; districts: { code: string; name: string }[] }>
    );

    res.json({ states: Object.values(byState) });
  } catch (error) {
    console.error('Jurisdictions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch jurisdictions' });
  }
});

export default router;

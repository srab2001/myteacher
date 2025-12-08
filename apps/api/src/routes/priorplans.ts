import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma, PlanTypeCode } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';

const router = Router();

// Configure multer for file uploads
// Use /tmp for serverless environments (Vercel), otherwise use local uploads dir
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const uploadDir = process.env.UPLOAD_DIR || (isServerless ? '/tmp/uploads/prior-plans' : './uploads/prior-plans');

// Ensure upload directory exists (wrapped in try-catch for serverless)
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.warn('Could not create upload directory:', error);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `prior-plan-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow PDF, DOCX, DOC, and common image formats
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, JPEG, PNG, GIF, WEBP'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

// GET /students/:studentId/prior-plans - List prior plans for a student
router.get('/students/:studentId/prior-plans', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists and belongs to this teacher
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        teacherId: req.user!.id,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const priorPlans = await prisma.priorPlanDocument.findMany({
      where: {
        studentId,
      },
      include: {
        planType: {
          select: { code: true, name: true },
        },
        uploadedBy: {
          select: { displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      priorPlans: priorPlans.map(p => ({
        id: p.id,
        planType: p.planType.code,
        planTypeName: p.planType.name,
        fileName: p.fileName,
        planDate: p.planDate,
        notes: p.notes,
        source: p.source,
        uploadedBy: p.uploadedBy.displayName,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('Prior plans fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch prior plans' });
  }
});

// POST /students/:studentId/prior-plans - Upload a prior plan
router.post(
  '/students/:studentId/prior-plans',
  requireAuth,
  requireOnboarded,
  upload.single('file'),
  async (req, res) => {
    try {
      const { studentId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }

      // Validate request body
      const bodySchema = z.object({
        planType: z.enum(['IEP', 'FIVE_OH_FOUR', 'BEHAVIOR_PLAN']),
        planDate: z.string().optional(),
        notes: z.string().optional(),
      });

      const data = bodySchema.parse(req.body);

      // Verify student exists and belongs to this teacher
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          teacherId: req.user!.id,
        },
        include: {
          jurisdiction: true,
        },
      });

      if (!student) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Student not found' });
      }

      // Get the plan type for this jurisdiction
      const planType = await prisma.planType.findFirst({
        where: {
          code: data.planType as PlanTypeCode,
          jurisdictionId: student.jurisdictionId,
        },
      });

      if (!planType) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Plan type not found for this jurisdiction' });
      }

      // Create prior plan document record
      const priorPlan = await prisma.priorPlanDocument.create({
        data: {
          studentId,
          planTypeId: planType.id,
          fileName: req.file.originalname,
          storageKey: req.file.filename,
          planDate: data.planDate ? new Date(data.planDate) : null,
          notes: data.notes,
          source: 'UPLOADED',
          uploadedById: req.user!.id,
        },
        include: {
          planType: {
            select: { code: true, name: true },
          },
          uploadedBy: {
            select: { displayName: true },
          },
        },
      });

      res.status(201).json({
        priorPlan: {
          id: priorPlan.id,
          planType: priorPlan.planType.code,
          planTypeName: priorPlan.planType.name,
          fileName: priorPlan.fileName,
          planDate: priorPlan.planDate,
          notes: priorPlan.notes,
          source: priorPlan.source,
          uploadedBy: priorPlan.uploadedBy.displayName,
          createdAt: priorPlan.createdAt,
        },
      });
    } catch (error) {
      // Clean up file if it was uploaded
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // Ignore cleanup errors
        }
      }

      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Prior plan upload error:', error);
      res.status(500).json({ error: 'Failed to upload prior plan' });
    }
  }
);

// GET /prior-plans/:id/download - Download a prior plan file
router.get('/:id/download', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the prior plan and verify access
    const priorPlan = await prisma.priorPlanDocument.findFirst({
      where: {
        id,
        student: {
          teacherId: req.user!.id,
        },
      },
    });

    if (!priorPlan) {
      return res.status(404).json({ error: 'Prior plan not found' });
    }

    const filePath = path.join(uploadDir, priorPlan.storageKey);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set content disposition for download
    res.setHeader('Content-Disposition', `attachment; filename="${priorPlan.fileName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Prior plan download error:', error);
    res.status(500).json({ error: 'Failed to download prior plan' });
  }
});

// DELETE /prior-plans/:id - Delete a prior plan
router.delete('/:id', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the prior plan and verify access
    const priorPlan = await prisma.priorPlanDocument.findFirst({
      where: {
        id,
        student: {
          teacherId: req.user!.id,
        },
      },
    });

    if (!priorPlan) {
      return res.status(404).json({ error: 'Prior plan not found' });
    }

    // Delete the file
    const filePath = path.join(uploadDir, priorPlan.storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the database record
    await prisma.priorPlanDocument.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Prior plan delete error:', error);
    res.status(500).json({ error: 'Failed to delete prior plan' });
  }
});

export default router;

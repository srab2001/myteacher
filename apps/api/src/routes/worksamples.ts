import { Router } from 'express';
import { z } from 'zod';
import { prisma, WorkSampleRating } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  },
});

// Upload a work sample
router.post(
  '/:goalId/work-samples',
  requireAuth,
  requireOnboarded,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { rating, comment } = req.body;

      if (!rating || !Object.values(WorkSampleRating).includes(rating)) {
        return res.status(400).json({ error: 'Invalid rating' });
      }

      // Verify goal belongs to teacher
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
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Goal not found' });
      }

      // In production, you would upload to S3/GCP/Azure and get a URL
      // For now, we'll use local file path as URL
      const fileUrl = `/uploads/${req.file.filename}`;

      const workSample = await prisma.workSample.create({
        data: {
          goalId: goal.id,
          fileUrl,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          rating: rating as WorkSampleRating,
          comment: comment || null,
          uploadedById: req.user!.id,
        },
        include: {
          uploadedBy: {
            select: { displayName: true },
          },
        },
      });

      res.status(201).json({ workSample });
    } catch (error) {
      console.error('Work sample upload error:', error);
      res.status(500).json({ error: 'Failed to upload work sample' });
    }
  }
);

// Get all work samples for a goal
router.get('/:goalId/work-samples', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const workSamples = await prisma.workSample.findMany({
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
        uploadedBy: {
          select: { displayName: true },
        },
      },
      orderBy: { capturedAt: 'desc' },
    });

    res.json({ workSamples });
  } catch (error) {
    console.error('Work samples fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch work samples' });
  }
});

// Update work sample metadata
const updateWorkSampleSchema = z.object({
  rating: z.nativeEnum(WorkSampleRating).optional(),
  comment: z.string().optional(),
});

router.patch('/work-samples/:sampleId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = updateWorkSampleSchema.parse(req.body);

    const workSample = await prisma.workSample.findFirst({
      where: {
        id: req.params.sampleId,
        goal: {
          planInstance: {
            student: {
              teacherId: req.user!.id,
            },
          },
        },
      },
    });

    if (!workSample) {
      return res.status(404).json({ error: 'Work sample not found' });
    }

    const updated = await prisma.workSample.update({
      where: { id: workSample.id },
      data: {
        ...(data.rating && { rating: data.rating }),
        ...(data.comment !== undefined && { comment: data.comment }),
      },
      include: {
        uploadedBy: {
          select: { displayName: true },
        },
      },
    });

    res.json({ workSample: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Work sample update error:', error);
    res.status(500).json({ error: 'Failed to update work sample' });
  }
});

// Delete a work sample
router.delete('/work-samples/:sampleId', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const workSample = await prisma.workSample.findFirst({
      where: {
        id: req.params.sampleId,
        goal: {
          planInstance: {
            student: {
              teacherId: req.user!.id,
            },
          },
        },
      },
    });

    if (!workSample) {
      return res.status(404).json({ error: 'Work sample not found' });
    }

    // Delete the file
    const filePath = path.join(uploadDir, path.basename(workSample.fileUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.workSample.delete({
      where: { id: workSample.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Work sample delete error:', error);
    res.status(500).json({ error: 'Failed to delete work sample' });
  }
});

export default router;

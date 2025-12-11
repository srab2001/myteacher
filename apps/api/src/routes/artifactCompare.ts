import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { requirePlanAccess, requireUpdatePlanPermission, requireStudentAccess } from '../middleware/permissions.js';
import { compareArtifacts, compareArtifactsWithImages, extractTextFromFile, isImageMimeType } from '../services/artifactCompareService.js';
import { Errors } from '../errors.js';

const router = Router();

// Configure multer for artifact file uploads
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const uploadDir = process.env.UPLOAD_DIR || (isServerless ? '/tmp/uploads/artifacts' : './uploads/artifacts');

// Ensure upload directory exists
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.warn('Could not create artifact upload directory:', error);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `artifact-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow PDF, DOCX, DOC, TXT, images, and common document formats
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/rtf',
    // Image formats for GPT-4 Vision
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, MD, RTF, JPEG, PNG, GIF, WEBP'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

// Helper to get file URL (relative path for now, could be S3 URL later)
function getFileUrl(filename: string): string {
  return `/uploads/artifacts/${filename}`;
}

// ============================================
// GET /plans/:planId/artifact-compare - List comparisons for a plan
// ============================================
router.get(
  '/plans/:planId/artifact-compare',
  requireAuth,
  requireOnboarded,
  requirePlanAccess('planId'),
  async (req, res) => {
    try {
      const { planId } = req.params;

      const comparisons = await prisma.artifactComparison.findMany({
        where: { planInstanceId: planId },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { displayName: true },
          },
        },
      });

      res.json({
        comparisons: comparisons.map((c) => ({
          id: c.id,
          artifactDate: c.artifactDate,
          description: c.description,
          baselineFileUrl: c.baselineFileUrl,
          compareFileUrl: c.compareFileUrl,
          analysisText: c.analysisText,
          createdBy: c.createdBy.displayName,
          createdAt: c.createdAt,
        })),
      });
    } catch (error) {
      console.error('Artifact comparisons fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch artifact comparisons' });
    }
  }
);

// ============================================
// POST /plans/:planId/artifact-compare - Create comparison and upload files
// ============================================
router.post(
  '/plans/:planId/artifact-compare',
  requireAuth,
  requireOnboarded,
  requirePlanAccess('planId'),
  requireUpdatePlanPermission,
  upload.fields([
    { name: 'baselineFile', maxCount: 1 },
    { name: 'compareFile', maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    try {
      const { planId } = req.params;

      // Validate files
      if (!files?.baselineFile?.[0] || !files?.compareFile?.[0]) {
        // Clean up any uploaded files
        if (files?.baselineFile?.[0]) fs.unlinkSync(files.baselineFile[0].path);
        if (files?.compareFile?.[0]) fs.unlinkSync(files.compareFile[0].path);
        return res.status(400).json({ error: 'Both baseline and compare files are required' });
      }

      // Validate request body
      const bodySchema = z.object({
        artifactDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: 'Invalid date format',
        }),
        description: z.string().optional(),
      });

      const data = bodySchema.parse(req.body);

      // Get plan with student and plan type info
      const plan = await prisma.planInstance.findUnique({
        where: { id: planId },
        include: {
          student: true,
          planType: true,
        },
      });

      if (!plan) {
        // Clean up files
        fs.unlinkSync(files.baselineFile[0].path);
        fs.unlinkSync(files.compareFile[0].path);
        return res.status(404).json({ error: 'Plan not found' });
      }

      const baselineFile = files.baselineFile[0];
      const compareFile = files.compareFile[0];

      // Create artifact comparison record
      const comparison = await prisma.artifactComparison.create({
        data: {
          planInstanceId: plan.id,
          studentId: plan.studentId,
          planTypeId: plan.planTypeId,
          artifactDate: new Date(data.artifactDate),
          description: data.description || null,
          baselineFileUrl: getFileUrl(baselineFile.filename),
          compareFileUrl: getFileUrl(compareFile.filename),
          createdById: req.user!.id,
        },
      });

      res.status(201).json({
        id: comparison.id,
        planInstanceId: comparison.planInstanceId,
        artifactDate: comparison.artifactDate,
        description: comparison.description,
        baselineFileUrl: comparison.baselineFileUrl,
        compareFileUrl: comparison.compareFileUrl,
        analysisText: comparison.analysisText,
      });
    } catch (error) {
      // Clean up files on error
      if (files?.baselineFile?.[0]) {
        try {
          fs.unlinkSync(files.baselineFile[0].path);
        } catch {}
      }
      if (files?.compareFile?.[0]) {
        try {
          fs.unlinkSync(files.compareFile[0].path);
        } catch {}
      }

      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Artifact comparison creation error:', error);
      res.status(500).json({ error: 'Failed to create artifact comparison' });
    }
  }
);

// ============================================
// POST /plans/:planId/artifact-compare/:comparisonId/compare - Trigger ChatGPT comparison
// ============================================
router.post(
  '/plans/:planId/artifact-compare/:comparisonId/compare',
  requireAuth,
  requireOnboarded,
  requirePlanAccess('planId'),
  requireUpdatePlanPermission,
  async (req, res) => {
    try {
      const { planId, comparisonId } = req.params;
      const force = req.body?.force === true;

      // Load the artifact comparison
      const comparison = await prisma.artifactComparison.findFirst({
        where: {
          id: comparisonId,
          planInstanceId: planId,
        },
        include: {
          student: true,
          planType: true,
        },
      });

      if (!comparison) {
        return res.status(404).json({ error: 'Artifact comparison not found' });
      }

      // Check if already analyzed (unless force=true)
      if (comparison.analysisText && !force) {
        return res.json({
          id: comparison.id,
          analysisText: comparison.analysisText,
          message: 'Analysis already exists. Use force=true to regenerate.',
        });
      }

      // Get file paths from URLs
      const baselineFilename = path.basename(comparison.baselineFileUrl);
      const compareFilename = path.basename(comparison.compareFileUrl);
      const baselineFilePath = path.join(uploadDir, baselineFilename);
      const compareFilePath = path.join(uploadDir, compareFilename);

      // Check files exist
      if (!fs.existsSync(baselineFilePath) || !fs.existsSync(compareFilePath)) {
        return res.status(404).json({ error: 'Artifact files not found. They may have been deleted.' });
      }

      // Read files
      const baselineBuffer = fs.readFileSync(baselineFilePath);
      const compareBuffer = fs.readFileSync(compareFilePath);

      // Detect MIME types from file extensions
      const baselineMime = getMimeType(baselineFilename);
      const compareMime = getMimeType(compareFilename);

      // Check if either file is an image
      const baselineIsImage = isImageMimeType(baselineMime);
      const compareIsImage = isImageMimeType(compareMime);

      const studentName = `${comparison.student.firstName} ${comparison.student.lastName}`;
      const planTypeCode = comparison.planType.code;
      const artifactDate = comparison.artifactDate.toISOString().split('T')[0];

      let analysisText: string;

      // If either file is an image, use GPT-4 Vision
      if (baselineIsImage || compareIsImage) {
        // Prepare content for each file
        type ContentType = { type: 'text'; text: string } | { type: 'image'; buffer: Buffer; mimeType: string };

        let baselineContent: ContentType;
        let compareContent: ContentType;

        if (baselineIsImage) {
          baselineContent = { type: 'image', buffer: baselineBuffer, mimeType: baselineMime };
        } else {
          const text = await extractTextFromFile(baselineBuffer, baselineMime, baselineFilename);
          if (!text.trim()) {
            return res.status(400).json({ error: 'Could not extract text from baseline file' });
          }
          baselineContent = { type: 'text', text };
        }

        if (compareIsImage) {
          compareContent = { type: 'image', buffer: compareBuffer, mimeType: compareMime };
        } else {
          const text = await extractTextFromFile(compareBuffer, compareMime, compareFilename);
          if (!text.trim()) {
            return res.status(400).json({ error: 'Could not extract text from compare file' });
          }
          compareContent = { type: 'text', text };
        }

        // Use GPT-4 Vision for comparison
        analysisText = await compareArtifactsWithImages({
          studentName,
          planTypeCode,
          artifactDate,
          description: comparison.description,
          baselineContent,
          compareContent,
        });
      } else {
        // Both files are documents - extract text and use standard comparison
        const baselineText = await extractTextFromFile(baselineBuffer, baselineMime, baselineFilename);
        const compareText = await extractTextFromFile(compareBuffer, compareMime, compareFilename);

        if (!baselineText.trim()) {
          return res.status(400).json({ error: 'Could not extract text from baseline file' });
        }
        if (!compareText.trim()) {
          return res.status(400).json({ error: 'Could not extract text from compare file' });
        }

        analysisText = await compareArtifacts({
          studentName,
          planTypeCode,
          artifactDate,
          description: comparison.description,
          baselineText,
          compareText,
        });
      }

      // Update the comparison with analysis
      const updatedComparison = await prisma.artifactComparison.update({
        where: { id: comparisonId },
        data: { analysisText },
      });

      res.json({
        id: updatedComparison.id,
        artifactDate: updatedComparison.artifactDate,
        description: updatedComparison.description,
        baselineFileUrl: updatedComparison.baselineFileUrl,
        compareFileUrl: updatedComparison.compareFileUrl,
        analysisText: updatedComparison.analysisText,
      });
    } catch (error) {
      console.error('Artifact comparison error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to compare artifacts',
      });
    }
  }
);

// ============================================
// GET /plans/:planId/artifact-compare/:comparisonId - Get a single comparison
// ============================================
router.get(
  '/plans/:planId/artifact-compare/:comparisonId',
  requireAuth,
  requireOnboarded,
  requirePlanAccess('planId'),
  async (req, res) => {
    try {
      const { planId, comparisonId } = req.params;

      const comparison = await prisma.artifactComparison.findFirst({
        where: {
          id: comparisonId,
          planInstanceId: planId,
        },
        include: {
          student: {
            select: { firstName: true, lastName: true },
          },
          planType: {
            select: { code: true, name: true },
          },
          createdBy: {
            select: { displayName: true },
          },
        },
      });

      if (!comparison) {
        return res.status(404).json({ error: 'Artifact comparison not found' });
      }

      res.json({
        id: comparison.id,
        artifactDate: comparison.artifactDate,
        description: comparison.description,
        baselineFileUrl: comparison.baselineFileUrl,
        compareFileUrl: comparison.compareFileUrl,
        analysisText: comparison.analysisText,
        studentName: `${comparison.student.firstName} ${comparison.student.lastName}`,
        planTypeCode: comparison.planType.code,
        planTypeName: comparison.planType.name,
        createdBy: comparison.createdBy.displayName,
        createdAt: comparison.createdAt,
      });
    } catch (error) {
      console.error('Artifact comparison fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch artifact comparison' });
    }
  }
);

// ============================================
// DELETE /plans/:planId/artifact-compare/:comparisonId - Delete a comparison
// ============================================
router.delete(
  '/plans/:planId/artifact-compare/:comparisonId',
  requireAuth,
  requireOnboarded,
  requirePlanAccess('planId'),
  requireUpdatePlanPermission,
  async (req, res) => {
    try {
      const { planId, comparisonId } = req.params;

      const comparison = await prisma.artifactComparison.findFirst({
        where: {
          id: comparisonId,
          planInstanceId: planId,
        },
      });

      if (!comparison) {
        return res.status(404).json({ error: 'Artifact comparison not found' });
      }

      // Delete the files
      const baselineFilename = path.basename(comparison.baselineFileUrl);
      const compareFilename = path.basename(comparison.compareFileUrl);
      const baselineFilePath = path.join(uploadDir, baselineFilename);
      const compareFilePath = path.join(uploadDir, compareFilename);

      if (fs.existsSync(baselineFilePath)) {
        fs.unlinkSync(baselineFilePath);
      }
      if (fs.existsSync(compareFilePath)) {
        fs.unlinkSync(compareFilePath);
      }

      // Delete the database record
      await prisma.artifactComparison.delete({
        where: { id: comparisonId },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Artifact comparison delete error:', error);
      res.status(500).json({ error: 'Failed to delete artifact comparison' });
    }
  }
);

// ============================================
// GET /students/:studentId/artifact-compares - List all comparisons for a student
// ============================================
router.get(
  '/students/:studentId/artifact-compares',
  requireAuth,
  requireOnboarded,
  requireStudentAccess('studentId'),
  async (req, res, next) => {
    try {
      const { studentId } = req.params;

      // Verify student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw Errors.studentNotFound(studentId);
      }

      // Get all artifact comparisons for this student
      const comparisons = await prisma.artifactComparison.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        include: {
          planType: {
            select: { code: true, name: true },
          },
          planInstance: {
            select: { id: true, label: true },
          },
          createdBy: {
            select: { displayName: true },
          },
        },
      });

      res.json({
        comparisons: comparisons.map((c) => ({
          id: c.id,
          planInstanceId: c.planInstanceId,
          planLabel: c.planInstance.label,
          planTypeCode: c.planType.code,
          planTypeName: c.planType.name,
          artifactDate: c.artifactDate,
          description: c.description,
          baselineFileUrl: c.baselineFileUrl,
          compareFileUrl: c.compareFileUrl,
          analysisText: c.analysisText,
          createdBy: c.createdBy.displayName,
          createdAt: c.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper function to get MIME type from filename
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.rtf': 'application/rtf',
    // Image formats
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export default router;

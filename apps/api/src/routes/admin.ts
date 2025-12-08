import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma, PlanTypeCode } from '../lib/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { ingestBestPracticeDocument, getDocumentChunkStats } from '../services/ingestion.js';

const router = Router();

// Configure multer for file uploads
// Use /tmp for serverless environments (Vercel), otherwise use local uploads dir
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const baseUploadDir = process.env.UPLOAD_DIR || (isServerless ? '/tmp/uploads' : './uploads');
const bestPracticeUploadDir = `${baseUploadDir}/best-practices`;
const templateUploadDir = `${baseUploadDir}/form-templates`;

// Ensure upload directories exist (wrapped in try-catch for serverless)
[bestPracticeUploadDir, templateUploadDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create upload directory:', dir, error);
  }
});

const createStorage = (uploadDir: string, prefix: string) => multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, JPEG, PNG'));
  }
};

const bestPracticeUpload = multer({
  storage: createStorage(bestPracticeUploadDir, 'best-practice'),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const templateUpload = multer({
  storage: createStorage(templateUploadDir, 'template'),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ============================================
// BEST PRACTICE DOCUMENTS
// ============================================

// GET /admin/best-practice-docs - List all best practice documents
router.get('/best-practice-docs', requireAdmin, async (req, res) => {
  try {
    const docs = await prisma.bestPracticeDocument.findMany({
      include: {
        planType: { select: { code: true, name: true } },
        jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
        uploadedBy: { select: { displayName: true } },
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      documents: docs.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        planType: d.planType.code,
        planTypeName: d.planType.name,
        gradeBand: d.gradeBand,
        jurisdictionId: d.jurisdictionId,
        jurisdictionName: d.jurisdiction?.districtName || null,
        isActive: d.isActive,
        ingestionStatus: d.ingestionStatus,
        ingestionMessage: d.ingestionMessage,
        ingestionAt: d.ingestionAt,
        chunkCount: d._count.chunks,
        uploadedBy: d.uploadedBy.displayName,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Best practice docs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch best practice documents' });
  }
});

// POST /admin/best-practice-docs - Upload a best practice document
router.post(
  '/best-practice-docs',
  requireAdmin,
  bestPracticeUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const bodySchema = z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        planType: z.enum(['IEP', 'FIVE_OH_FOUR', 'BEHAVIOR_PLAN']),
        gradeBand: z.string().optional(),
        jurisdictionId: z.string().optional(),
      });

      const data = bodySchema.parse(req.body);

      // Get the plan type for the user's jurisdiction (or global)
      const planType = await prisma.planType.findFirst({
        where: {
          code: data.planType as PlanTypeCode,
          jurisdictionId: req.user!.jurisdictionId!,
        },
      });

      if (!planType) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Plan type not found' });
      }

      // Verify jurisdiction if provided
      if (data.jurisdictionId) {
        const jurisdiction = await prisma.jurisdiction.findUnique({
          where: { id: data.jurisdictionId },
        });
        if (!jurisdiction) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ error: 'Jurisdiction not found' });
        }
      }

      const doc = await prisma.bestPracticeDocument.create({
        data: {
          title: data.title,
          description: data.description,
          fileUrl: req.file.filename,
          planTypeId: planType.id,
          gradeBand: data.gradeBand,
          jurisdictionId: data.jurisdictionId || null,
          uploadedById: req.user!.id,
          ingestionStatus: 'PENDING',
        },
        include: {
          planType: { select: { code: true, name: true } },
          jurisdiction: { select: { id: true, districtName: true } },
          uploadedBy: { select: { displayName: true } },
        },
      });

      // Trigger ingestion asynchronously (don't await)
      ingestBestPracticeDocument(doc.id).catch(err => {
        console.error('Background ingestion error:', err);
      });

      res.status(201).json({
        document: {
          id: doc.id,
          title: doc.title,
          description: doc.description,
          planType: doc.planType.code,
          planTypeName: doc.planType.name,
          gradeBand: doc.gradeBand,
          jurisdictionId: doc.jurisdictionId,
          jurisdictionName: doc.jurisdiction?.districtName || null,
          isActive: doc.isActive,
          ingestionStatus: doc.ingestionStatus,
          ingestionMessage: doc.ingestionMessage,
          ingestionAt: doc.ingestionAt,
          chunkCount: 0,
          uploadedBy: doc.uploadedBy.displayName,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      });
    } catch (error) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }

      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Best practice doc upload error:', error);
      res.status(500).json({ error: 'Failed to upload best practice document' });
    }
  }
);

// PATCH /admin/best-practice-docs/:id - Update a best practice document
router.patch('/best-practice-docs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const bodySchema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
    });

    const data = bodySchema.parse(req.body);

    const doc = await prisma.bestPracticeDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updated = await prisma.bestPracticeDocument.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        isActive: data.isActive,
      },
      include: {
        planType: { select: { code: true, name: true } },
        jurisdiction: { select: { id: true, districtName: true } },
        uploadedBy: { select: { displayName: true } },
      },
    });

    // Get chunk count
    const chunkCount = await prisma.bestPracticeChunk.count({
      where: { bestPracticeDocumentId: updated.id },
    });

    res.json({
      document: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        planType: updated.planType.code,
        planTypeName: updated.planType.name,
        gradeBand: updated.gradeBand,
        jurisdictionId: updated.jurisdictionId,
        jurisdictionName: updated.jurisdiction?.districtName || null,
        isActive: updated.isActive,
        ingestionStatus: updated.ingestionStatus,
        ingestionMessage: updated.ingestionMessage,
        ingestionAt: updated.ingestionAt,
        chunkCount,
        uploadedBy: updated.uploadedBy.displayName,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Best practice doc update error:', error);
    res.status(500).json({ error: 'Failed to update best practice document' });
  }
});

// POST /admin/best-practice-docs/:id/reingest - Re-run ingestion for a document
router.post('/best-practice-docs/:id/reingest', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await prisma.bestPracticeDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Trigger ingestion asynchronously
    ingestBestPracticeDocument(id).catch(err => {
      console.error('Re-ingestion error:', err);
    });

    res.json({ success: true, message: 'Ingestion started' });
  } catch (error) {
    console.error('Re-ingestion trigger error:', error);
    res.status(500).json({ error: 'Failed to start re-ingestion' });
  }
});

// GET /admin/best-practice-docs/:id/chunks - Get chunk statistics for a document
router.get('/best-practice-docs/:id/chunks', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await prisma.bestPracticeDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const stats = await getDocumentChunkStats(id);

    res.json(stats);
  } catch (error) {
    console.error('Chunk stats error:', error);
    res.status(500).json({ error: 'Failed to get chunk statistics' });
  }
});

// GET /admin/best-practice-docs/:id/download - Download a best practice document
router.get('/best-practice-docs/:id/download', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await prisma.bestPracticeDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = path.join(bestPracticeUploadDir, doc.fileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.${path.extname(doc.fileUrl)}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Best practice doc download error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// ============================================
// FORM TEMPLATES
// ============================================

// GET /admin/form-templates - List all form templates
router.get('/form-templates', requireAdmin, async (req, res) => {
  try {
    const templates = await prisma.formTemplate.findMany({
      include: {
        planType: { select: { code: true, name: true } },
        jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
        uploadedBy: { select: { displayName: true } },
      },
      orderBy: [{ planTypeId: 'asc' }, { isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      templates: templates.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        planType: t.planType.code,
        planTypeName: t.planType.name,
        jurisdictionId: t.jurisdictionId,
        jurisdictionName: t.jurisdiction?.districtName || null,
        isDefault: t.isDefault,
        uploadedBy: t.uploadedBy.displayName,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Form templates fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch form templates' });
  }
});

// POST /admin/form-templates - Upload a form template
router.post(
  '/form-templates',
  requireAdmin,
  templateUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const bodySchema = z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        planType: z.enum(['IEP', 'FIVE_OH_FOUR', 'BEHAVIOR_PLAN']),
        jurisdictionId: z.string().optional(),
        isDefault: z.preprocess(
          val => val === 'true' || val === true,
          z.boolean().optional().default(false)
        ),
      });

      const data = bodySchema.parse(req.body);

      // Get the plan type
      const planType = await prisma.planType.findFirst({
        where: {
          code: data.planType as PlanTypeCode,
          jurisdictionId: req.user!.jurisdictionId!,
        },
      });

      if (!planType) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Plan type not found' });
      }

      // Verify jurisdiction if provided
      if (data.jurisdictionId) {
        const jurisdiction = await prisma.jurisdiction.findUnique({
          where: { id: data.jurisdictionId },
        });
        if (!jurisdiction) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ error: 'Jurisdiction not found' });
        }
      }

      // If setting as default, unset existing default for this plan type and jurisdiction
      if (data.isDefault) {
        await prisma.formTemplate.updateMany({
          where: {
            planTypeId: planType.id,
            jurisdictionId: data.jurisdictionId || null,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      const template = await prisma.formTemplate.create({
        data: {
          title: data.title,
          description: data.description,
          fileUrl: req.file.filename,
          planTypeId: planType.id,
          jurisdictionId: data.jurisdictionId || null,
          isDefault: data.isDefault || false,
          uploadedById: req.user!.id,
        },
        include: {
          planType: { select: { code: true, name: true } },
          jurisdiction: { select: { id: true, districtName: true } },
          uploadedBy: { select: { displayName: true } },
        },
      });

      res.status(201).json({
        template: {
          id: template.id,
          title: template.title,
          description: template.description,
          planType: template.planType.code,
          planTypeName: template.planType.name,
          jurisdictionId: template.jurisdictionId,
          jurisdictionName: template.jurisdiction?.districtName || null,
          isDefault: template.isDefault,
          uploadedBy: template.uploadedBy.displayName,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        },
      });
    } catch (error) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }

      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Form template upload error:', error);
      res.status(500).json({ error: 'Failed to upload form template' });
    }
  }
);

// PATCH /admin/form-templates/:id - Update a form template
router.patch('/form-templates/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const bodySchema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      isDefault: z.boolean().optional(),
    });

    const data = bodySchema.parse(req.body);

    const template = await prisma.formTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // If setting as default, unset existing default for this plan type and jurisdiction
    if (data.isDefault) {
      await prisma.formTemplate.updateMany({
        where: {
          planTypeId: template.planTypeId,
          jurisdictionId: template.jurisdictionId,
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.formTemplate.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        isDefault: data.isDefault,
      },
      include: {
        planType: { select: { code: true, name: true } },
        jurisdiction: { select: { id: true, districtName: true } },
        uploadedBy: { select: { displayName: true } },
      },
    });

    res.json({
      template: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        planType: updated.planType.code,
        planTypeName: updated.planType.name,
        jurisdictionId: updated.jurisdictionId,
        jurisdictionName: updated.jurisdiction?.districtName || null,
        isDefault: updated.isDefault,
        uploadedBy: updated.uploadedBy.displayName,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Form template update error:', error);
    res.status(500).json({ error: 'Failed to update form template' });
  }
});

// GET /admin/form-templates/:id/download - Download a form template
router.get('/form-templates/:id/download', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.formTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const filePath = path.join(templateUploadDir, template.fileUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${template.title}${path.extname(template.fileUrl)}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Form template download error:', error);
    res.status(500).json({ error: 'Failed to download template' });
  }
});

// GET /admin/jurisdictions - List all jurisdictions (for dropdowns)
router.get('/jurisdictions', requireAdmin, async (_req, res) => {
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

    res.json({ jurisdictions });
  } catch (error) {
    console.error('Jurisdictions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch jurisdictions' });
  }
});

// ============================================
// SCHEMA VIEWER (Admin only)
// ============================================

// GET /admin/schemas - List all plan schemas
router.get('/schemas', requireAdmin, async (req, res) => {
  try {
    const { planType, jurisdictionId, activeOnly } = req.query;

    const where: {
      planType?: { code: string };
      jurisdictionId?: string | null;
      isActive?: boolean;
    } = {};

    if (planType && typeof planType === 'string') {
      where.planType = { code: planType };
    }
    if (jurisdictionId && typeof jurisdictionId === 'string') {
      where.jurisdictionId = jurisdictionId === 'global' ? null : jurisdictionId;
    }
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const schemas = await prisma.planSchema.findMany({
      where,
      include: {
        planType: { select: { code: true, name: true } },
        jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
        _count: { select: { planInstances: true } },
      },
      orderBy: [{ planTypeId: 'asc' }, { version: 'desc' }],
    });

    res.json({
      schemas: schemas.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        version: s.version,
        planType: s.planType.code,
        planTypeName: s.planType.name,
        jurisdictionId: s.jurisdictionId,
        jurisdictionName: s.jurisdiction?.districtName || 'Global',
        isActive: s.isActive,
        planCount: s._count.planInstances,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Schemas fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schemas' });
  }
});

// GET /admin/schemas/:id - Get a specific schema with full field definitions
router.get('/schemas/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const schema = await prisma.planSchema.findUnique({
      where: { id },
      include: {
        planType: { select: { code: true, name: true } },
        jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
        _count: { select: { planInstances: true } },
      },
    });

    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    res.json({
      schema: {
        id: schema.id,
        name: schema.name,
        description: schema.description,
        version: schema.version,
        planType: schema.planType.code,
        planTypeName: schema.planType.name,
        jurisdictionId: schema.jurisdictionId,
        jurisdictionName: schema.jurisdiction?.districtName || 'Global',
        isActive: schema.isActive,
        planCount: schema._count.planInstances,
        fields: schema.fields, // Full field definitions JSON
        createdAt: schema.createdAt,
        updatedAt: schema.updatedAt,
      },
    });
  } catch (error) {
    console.error('Schema fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

// POST /admin/schemas - Create a new schema version
router.post('/schemas', requireAdmin, async (req, res) => {
  try {
    const bodySchema = z.object({
      name: z.string().min(1, 'Name is required'),
      description: z.string().optional(),
      planType: z.enum(['IEP', 'FIVE_OH_FOUR', 'BEHAVIOR_PLAN']),
      jurisdictionId: z.string().optional().nullable(),
      fields: z.object({
        sections: z.array(z.object({
          key: z.string(),
          title: z.string(),
          order: z.number(),
          fields: z.array(z.object({
            key: z.string(),
            type: z.string(),
            label: z.string(),
            required: z.boolean().optional(),
            options: z.array(z.string()).optional(),
            placeholder: z.string().optional(),
          })),
          isGoalsSection: z.boolean().optional(),
          isBehaviorTargetsSection: z.boolean().optional(),
        })),
      }),
    });

    const data = bodySchema.parse(req.body);

    // Get the plan type
    const planType = await prisma.planType.findFirst({
      where: {
        code: data.planType as PlanTypeCode,
      },
    });

    if (!planType) {
      return res.status(404).json({ error: 'Plan type not found' });
    }

    // Get the next version number
    const latestSchema = await prisma.planSchema.findFirst({
      where: {
        planTypeId: planType.id,
        jurisdictionId: data.jurisdictionId || null,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestSchema?.version || 0) + 1;

    const schema = await prisma.planSchema.create({
      data: {
        name: data.name,
        description: data.description,
        version: nextVersion,
        planTypeId: planType.id,
        jurisdictionId: data.jurisdictionId || null,
        fields: data.fields,
        isActive: false, // New schemas start as inactive
      },
      include: {
        planType: { select: { code: true, name: true } },
        jurisdiction: { select: { id: true, districtName: true } },
      },
    });

    res.status(201).json({
      schema: {
        id: schema.id,
        name: schema.name,
        description: schema.description,
        version: schema.version,
        planType: schema.planType.code,
        planTypeName: schema.planType.name,
        jurisdictionId: schema.jurisdictionId,
        jurisdictionName: schema.jurisdiction?.districtName || 'Global',
        isActive: schema.isActive,
        planCount: 0,
        fields: schema.fields,
        createdAt: schema.createdAt,
        updatedAt: schema.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Schema create error:', error);
    res.status(500).json({ error: 'Failed to create schema' });
  }
});

// PATCH /admin/schemas/:id - Update schema (only metadata, not fields for safety)
router.patch('/schemas/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const bodySchema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
    });

    const data = bodySchema.parse(req.body);

    const schema = await prisma.planSchema.findUnique({
      where: { id },
    });

    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    // If activating this schema, deactivate other versions for the same plan type/jurisdiction
    if (data.isActive === true) {
      await prisma.planSchema.updateMany({
        where: {
          planTypeId: schema.planTypeId,
          jurisdictionId: schema.jurisdictionId,
          isActive: true,
          NOT: { id },
        },
        data: { isActive: false },
      });
    }

    const updated = await prisma.planSchema.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      },
      include: {
        planType: { select: { code: true, name: true } },
        jurisdiction: { select: { id: true, districtName: true } },
        _count: { select: { planInstances: true } },
      },
    });

    res.json({
      schema: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        version: updated.version,
        planType: updated.planType.code,
        planTypeName: updated.planType.name,
        jurisdictionId: updated.jurisdictionId,
        jurisdictionName: updated.jurisdiction?.districtName || 'Global',
        isActive: updated.isActive,
        planCount: updated._count.planInstances,
        fields: updated.fields,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Schema update error:', error);
    res.status(500).json({ error: 'Failed to update schema' });
  }
});

// GET /admin/schemas/:id/plans - Get plans using this schema
router.get('/schemas/:id/plans', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = '20', offset = '0' } = req.query;

    const schema = await prisma.planSchema.findUnique({
      where: { id },
    });

    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    const [plans, total] = await Promise.all([
      prisma.planInstance.findMany({
        where: { schemaId: id },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, grade: true } },
          planType: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.planInstance.count({
        where: { schemaId: id },
      }),
    ]);

    res.json({
      plans: plans.map(p => ({
        id: p.id,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        studentId: p.student.id,
        studentName: `${p.student.firstName} ${p.student.lastName}`,
        studentGrade: p.student.grade,
        planType: p.planType.code,
        planTypeName: p.planType.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error) {
    console.error('Schema plans fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schema plans' });
  }
});

export default router;

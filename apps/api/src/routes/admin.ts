import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { prisma, PlanTypeCode, UserRole } from '../lib/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { requireManageUsersPermission, getUserPermissions } from '../middleware/permissions.js';
import { ingestBestPracticeDocument, getDocumentChunkStats } from '../services/ingestion.js';
import { generateStudentRecordId } from '../services/studentIdService.js';

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
        _count: { select: { instances: true } },
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
        planCount: s._count.instances,
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
        _count: { select: { instances: true } },
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
        planCount: schema._count.instances,
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

// GET /admin/schemas/:id/fields - Get schema fields with effective required flags
router.get('/schemas/:id/fields', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const schema = await prisma.planSchema.findUnique({
      where: { id },
      include: {
        planType: { select: { code: true, name: true } },
        fieldConfigs: true,
      },
    });

    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    // Build override map
    const overrideMap = new Map<string, boolean>();
    for (const config of schema.fieldConfigs) {
      if (config.isRequired !== null) {
        overrideMap.set(`${config.sectionKey}:${config.fieldKey}`, config.isRequired);
      }
    }

    // Parse schema fields
    const schemaFields = schema.fields as {
      sections?: Array<{
        key: string;
        title: string;
        order?: number;
        fields?: Array<{
          key: string;
          label: string;
          type: string;
          required?: boolean;
          placeholder?: string;
        }>;
      }>;
    };

    const sections = (schemaFields.sections || []).map(section => ({
      key: section.key,
      title: section.title,
      order: section.order,
      fields: (section.fields || []).map(field => {
        const overrideKey = `${section.key}:${field.key}`;
        const override = overrideMap.get(overrideKey);
        return {
          key: field.key,
          label: field.label,
          type: field.type,
          schemaRequired: !!field.required,
          effectiveRequired: override !== undefined ? override : !!field.required,
          hasOverride: override !== undefined,
        };
      }),
    }));

    res.json({
      id: schema.id,
      planTypeCode: schema.planType.code,
      sections,
    });
  } catch (error) {
    console.error('Schema fields fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schema fields' });
  }
});

// PATCH /admin/schemas/:id/fields - Update field requirement overrides
router.patch('/schemas/:id/fields', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const bodySchema = z.object({
      updates: z.array(z.object({
        sectionKey: z.string(),
        fieldKey: z.string(),
        isRequired: z.boolean(),
      })),
    });

    const data = bodySchema.parse(req.body);

    const schema = await prisma.planSchema.findUnique({
      where: { id },
    });

    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    // Upsert each field config
    for (const update of data.updates) {
      await prisma.planFieldConfig.upsert({
        where: {
          planSchemaId_sectionKey_fieldKey: {
            planSchemaId: id,
            sectionKey: update.sectionKey,
            fieldKey: update.fieldKey,
          },
        },
        create: {
          planSchemaId: id,
          sectionKey: update.sectionKey,
          fieldKey: update.fieldKey,
          isRequired: update.isRequired,
        },
        update: {
          isRequired: update.isRequired,
        },
      });
    }

    res.json({ success: true, message: `Updated ${data.updates.length} field configurations` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Schema fields update error:', error);
    res.status(500).json({ error: 'Failed to update schema fields' });
  }
});

// POST /admin/schemas/:id/fields - Add a new field to a schema section
router.post('/schemas/:id/fields', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const bodySchema = z.object({
      sectionKey: z.string().min(1, 'Section key is required'),
      fieldKey: z.string().min(1, 'Field key is required'),
      label: z.string().min(1, 'Label is required'),
      type: z.enum(['text', 'textarea', 'date', 'select', 'checkbox', 'number']),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional(), // For select type
    });

    const data = bodySchema.parse(req.body);

    const schema = await prisma.planSchema.findUnique({
      where: { id },
    });

    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    // Parse existing schema fields
    const schemaFields = schema.fields as {
      sections?: Array<{
        key: string;
        title: string;
        order?: number;
        isGoalsSection?: boolean;
        fields?: Array<{
          key: string;
          label: string;
          type: string;
          required?: boolean;
          placeholder?: string;
          options?: string[];
        }>;
      }>;
    };

    if (!schemaFields.sections) {
      return res.status(400).json({ error: 'Schema has no sections defined' });
    }

    // Find the target section
    const sectionIndex = schemaFields.sections.findIndex(s => s.key === data.sectionKey);
    if (sectionIndex === -1) {
      return res.status(404).json({ error: `Section "${data.sectionKey}" not found in schema` });
    }

    // Check if field key already exists in section
    const existingFields = schemaFields.sections[sectionIndex].fields || [];
    if (existingFields.some(f => f.key === data.fieldKey)) {
      return res.status(409).json({ error: `Field with key "${data.fieldKey}" already exists in this section` });
    }

    // Create the new field object
    const newField: {
      key: string;
      label: string;
      type: string;
      required?: boolean;
      options?: string[];
    } = {
      key: data.fieldKey,
      label: data.label,
      type: data.type,
      required: data.required,
    };

    // Add options for select type
    if (data.type === 'select' && data.options && data.options.length > 0) {
      newField.options = data.options;
    }

    // Add the new field to the section
    if (!schemaFields.sections[sectionIndex].fields) {
      schemaFields.sections[sectionIndex].fields = [];
    }
    schemaFields.sections[sectionIndex].fields!.push(newField);

    // Update the schema with the new fields
    await prisma.planSchema.update({
      where: { id },
      data: {
        fields: schemaFields,
      },
    });

    res.json({
      success: true,
      message: `Field "${data.label}" added to section "${schemaFields.sections[sectionIndex].title}"`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Add field error:', error);
    res.status(500).json({ error: 'Failed to add field' });
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
        _count: { select: { instances: true } },
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
        planCount: updated._count.instances,
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

// ============================================
// USER MANAGEMENT
// ============================================

// GET /admin/users - List all users with permissions
router.get('/users', requireManageUsersPermission, async (req, res) => {
  try {
    const { role, search } = req.query;

    const where: {
      role?: UserRole;
      OR?: { email?: { contains: string; mode: 'insensitive' }; displayName?: { contains: string; mode: 'insensitive' } }[];
    } = {};

    if (role && typeof role === 'string' && Object.values(UserRole).includes(role as UserRole)) {
      where.role = role as UserRole;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.appUser.findMany({
      where,
      include: {
        permission: true,
        jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
        _count: { select: { studentAccess: true } },
      },
      orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
    });

    res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        isActive: u.isActive,
        jurisdictionId: u.jurisdictionId,
        jurisdictionName: u.jurisdiction?.districtName || null,
        permissions: u.permission ? {
          canCreatePlans: u.permission.canCreatePlans,
          canUpdatePlans: u.permission.canUpdatePlans,
          canReadAll: u.permission.canReadAll,
          canManageUsers: (u.permission as { canManageUsers?: boolean }).canManageUsers ?? false,
          canManageDocs: u.permission.canManageDocs,
        } : null,
        studentAccessCount: u._count.studentAccess,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /admin/users - Create a new user
router.post('/users', requireManageUsersPermission, async (req, res) => {
  try {
    const bodySchema = z.object({
      email: z.string().email('Invalid email'),
      displayName: z.string().min(1, 'Display name is required'),
      role: z.enum(['TEACHER', 'CASE_MANAGER', 'ADMIN']),
      jurisdictionId: z.string().optional().nullable(),
      permissions: z.object({
        canCreatePlans: z.boolean().default(false),
        canUpdatePlans: z.boolean().default(false),
        canReadAll: z.boolean().default(false),
        canManageUsers: z.boolean().default(false),
        canManageDocs: z.boolean().default(false),
      }).optional(),
    });

    const data = bodySchema.parse(req.body);

    // Check if user with email already exists
    const existingUser = await prisma.appUser.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Verify jurisdiction if provided
    if (data.jurisdictionId) {
      const jurisdiction = await prisma.jurisdiction.findUnique({
        where: { id: data.jurisdictionId },
      });
      if (!jurisdiction) {
        return res.status(404).json({ error: 'Jurisdiction not found' });
      }
    }

    // Create user with permissions
    const user = await prisma.appUser.create({
      data: {
        email: data.email,
        displayName: data.displayName,
        role: data.role as UserRole,
        jurisdictionId: data.jurisdictionId || null,
        isActive: true,
        permission: data.permissions ? {
          create: {
            canCreatePlans: data.permissions.canCreatePlans,
            canUpdatePlans: data.permissions.canUpdatePlans,
            canReadAll: data.permissions.canReadAll,
            canManageUsers: data.permissions.canManageUsers,
            canManageDocs: data.permissions.canManageDocs,
          },
        } : undefined,
      },
      include: {
        permission: true,
        jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
      },
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        jurisdictionId: user.jurisdictionId,
        jurisdictionName: user.jurisdiction?.districtName || null,
        permissions: user.permission ? {
          canCreatePlans: user.permission.canCreatePlans,
          canUpdatePlans: user.permission.canUpdatePlans,
          canReadAll: user.permission.canReadAll,
          canManageUsers: (user.permission as { canManageUsers?: boolean }).canManageUsers ?? false,
          canManageDocs: user.permission.canManageDocs,
        } : null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('User create error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /admin/users/:userId - Get user details
router.get('/users/:userId', requireManageUsersPermission, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      include: {
        permission: true,
        jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
        studentAccess: {
          include: {
            student: { select: { id: true, recordId: true, firstName: true, lastName: true, grade: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        jurisdictionId: user.jurisdictionId,
        jurisdictionName: user.jurisdiction?.districtName || null,
        permissions: user.permission ? {
          canCreatePlans: user.permission.canCreatePlans,
          canUpdatePlans: user.permission.canUpdatePlans,
          canReadAll: user.permission.canReadAll,
          canManageUsers: (user.permission as { canManageUsers?: boolean }).canManageUsers ?? false,
          canManageDocs: user.permission.canManageDocs,
        } : null,
        studentAccess: user.studentAccess.map(sa => ({
          id: sa.id,
          studentId: sa.student.id,
          recordId: sa.student.recordId,
          studentName: `${sa.student.firstName} ${sa.student.lastName}`,
          grade: sa.student.grade,
          canEdit: sa.canEdit,
          grantedAt: sa.createdAt,
        })),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /admin/users/:userId - Update user details
router.patch('/users/:userId', requireManageUsersPermission, async (req, res) => {
  try {
    const { userId } = req.params;

    const bodySchema = z.object({
      displayName: z.string().min(1).optional(),
      role: z.enum(['TEACHER', 'CASE_MANAGER', 'ADMIN']).optional(),
      isActive: z.boolean().optional(),
      jurisdictionId: z.string().optional().nullable(),
    });

    const data = bodySchema.parse(req.body);

    const user = await prisma.appUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify jurisdiction if provided
    if (data.jurisdictionId) {
      const jurisdiction = await prisma.jurisdiction.findUnique({
        where: { id: data.jurisdictionId },
      });
      if (!jurisdiction) {
        return res.status(404).json({ error: 'Jurisdiction not found' });
      }
    }

    const updated = await prisma.appUser.update({
      where: { id: userId },
      data: {
        displayName: data.displayName,
        role: data.role as UserRole,
        isActive: data.isActive,
        jurisdictionId: data.jurisdictionId,
      },
      include: {
        permission: true,
        jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
      },
    });

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        role: updated.role,
        isActive: updated.isActive,
        jurisdictionId: updated.jurisdictionId,
        jurisdictionName: updated.jurisdiction?.districtName || null,
        permissions: updated.permission ? {
          canCreatePlans: updated.permission.canCreatePlans,
          canUpdatePlans: updated.permission.canUpdatePlans,
          canReadAll: updated.permission.canReadAll,
          canManageUsers: (updated.permission as { canManageUsers?: boolean }).canManageUsers ?? false,
          canManageDocs: updated.permission.canManageDocs,
        } : null,
        createdAt: updated.createdAt,
        lastLoginAt: updated.lastLoginAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('User update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PATCH /admin/users/:userId/permissions - Update user permissions
router.patch('/users/:userId/permissions', requireManageUsersPermission, async (req, res) => {
  try {
    const { userId } = req.params;

    const bodySchema = z.object({
      canCreatePlans: z.boolean().optional(),
      canUpdatePlans: z.boolean().optional(),
      canReadAll: z.boolean().optional(),
      canManageUsers: z.boolean().optional(),
      canManageDocs: z.boolean().optional(),
    });

    const data = bodySchema.parse(req.body);

    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      include: { permission: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Upsert permissions
    const permission = await prisma.userPermission.upsert({
      where: { userId },
      update: {
        canCreatePlans: data.canCreatePlans ?? user.permission?.canCreatePlans ?? false,
        canUpdatePlans: data.canUpdatePlans ?? user.permission?.canUpdatePlans ?? false,
        canReadAll: data.canReadAll ?? user.permission?.canReadAll ?? false,
        canManageUsers: data.canManageUsers ?? (user.permission as { canManageUsers?: boolean })?.canManageUsers ?? false,
        canManageDocs: data.canManageDocs ?? user.permission?.canManageDocs ?? false,
      },
      create: {
        userId,
        canCreatePlans: data.canCreatePlans ?? false,
        canUpdatePlans: data.canUpdatePlans ?? false,
        canReadAll: data.canReadAll ?? false,
        canManageUsers: data.canManageUsers ?? false,
        canManageDocs: data.canManageDocs ?? false,
      },
    });

    res.json({
      permissions: {
        canCreatePlans: permission.canCreatePlans,
        canUpdatePlans: permission.canUpdatePlans,
        canReadAll: permission.canReadAll,
        canManageUsers: (permission as { canManageUsers?: boolean }).canManageUsers ?? false,
        canManageDocs: permission.canManageDocs,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Permissions update error:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// ============================================
// STUDENT MANAGEMENT
// ============================================

// GET /admin/students - List all students
router.get('/students', requireManageUsersPermission, async (req, res) => {
  try {
    const { search, limit = '50', offset = '0' } = req.query;

    const where: { OR?: Array<{ firstName?: { contains: string; mode: 'insensitive' }; lastName?: { contains: string; mode: 'insensitive' }; recordId?: { contains: string; mode: 'insensitive' } }> } = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { recordId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: { lastName: 'asc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        select: {
          id: true,
          recordId: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          grade: true,
          schoolName: true,
          districtName: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.student.count({ where }),
    ]);

    res.json({
      students: students.map(s => ({
        ...s,
        dateOfBirth: s.dateOfBirth?.toISOString().split('T')[0] || null,
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Students list error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST /admin/students - Create a new student
router.post('/students', requireManageUsersPermission, async (req, res) => {
  try {
    const createStudentSchema = z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      dateOfBirth: z.string().optional(),
      grade: z.string().optional(),
      schoolName: z.string().optional(),
      districtName: z.string().optional(),
      jurisdictionId: z.string().optional(),
    });

    const data = createStudentSchema.parse(req.body);

    // Generate a unique record ID
    const recordId = await generateStudentRecordId();

    // Find jurisdiction - use provided ID, lookup by district name, or use user's jurisdiction
    let jurisdictionId = data.jurisdictionId;

    if (!jurisdictionId && data.districtName) {
      // Try to find jurisdiction by district name (case-insensitive)
      const jurisdiction = await prisma.jurisdiction.findFirst({
        where: {
          districtName: {
            contains: data.districtName,
            mode: 'insensitive',
          },
        },
      });
      if (jurisdiction) {
        jurisdictionId = jurisdiction.id;
      }
    }

    if (!jurisdictionId) {
      // Fall back to user's jurisdiction
      jurisdictionId = req.user?.jurisdictionId || undefined;
    }

    if (!jurisdictionId) {
      return res.status(400).json({ error: 'No jurisdiction found. Please provide a valid district name or jurisdiction ID.' });
    }

    const student = await prisma.student.create({
      data: {
        recordId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        grade: data.grade || null,
        schoolName: data.schoolName || null,
        districtName: data.districtName || null,
        jurisdiction: { connect: { id: jurisdictionId } },
        teacher: { connect: { id: req.user!.id } },
        isActive: true,
      },
    });

    res.status(201).json({
      student: {
        id: student.id,
        recordId: student.recordId,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: student.dateOfBirth?.toISOString().split('T')[0] || null,
        grade: student.grade,
        schoolName: student.schoolName,
        districtName: student.districtName,
        isActive: student.isActive,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Student create error:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// ============================================
// STUDENT ACCESS MANAGEMENT
// ============================================

// GET /admin/users/:userId/students - Get user's student access list
router.get('/users/:userId/students', requireManageUsersPermission, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      include: { permission: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has canReadAll (ignore StudentAccess table)
    const canReadAll = user.permission?.canReadAll ?? false;

    if (canReadAll) {
      return res.json({
        canReadAll: true,
        studentAccess: [],
        message: 'User has canReadAll permission and can access all students',
      });
    }

    const studentAccess = await prisma.studentAccess.findMany({
      where: { userId },
      include: {
        student: {
          select: {
            id: true,
            recordId: true,
            firstName: true,
            lastName: true,
            grade: true,
            schoolName: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      canReadAll: false,
      studentAccess: studentAccess.map(sa => ({
        id: sa.id,
        studentId: sa.student.id,
        recordId: sa.student.recordId,
        firstName: sa.student.firstName,
        lastName: sa.student.lastName,
        studentName: `${sa.student.firstName} ${sa.student.lastName}`,
        grade: sa.student.grade,
        schoolName: sa.student.schoolName,
        isActive: sa.student.isActive,
        canEdit: sa.canEdit,
        grantedAt: sa.createdAt,
      })),
    });
  } catch (error) {
    console.error('Student access fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch student access' });
  }
});

// POST /admin/users/:userId/students - Add student access by recordId
router.post('/users/:userId/students', requireManageUsersPermission, async (req, res) => {
  try {
    const { userId } = req.params;

    const bodySchema = z.object({
      recordId: z.string().min(1, 'Record ID is required'),
      canEdit: z.boolean().default(false),
    });

    const data = bodySchema.parse(req.body);

    // Verify user exists
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find student by recordId
    const student = await prisma.student.findFirst({
      where: { recordId: data.recordId },
    });

    if (!student) {
      return res.status(404).json({ error: `Student with recordId "${data.recordId}" not found` });
    }

    // Check if access already exists
    const existingAccess = await prisma.studentAccess.findFirst({
      where: {
        userId,
        studentId: student.id,
      },
    });

    if (existingAccess) {
      return res.status(409).json({ error: 'User already has access to this student' });
    }

    // Create student access
    const access = await prisma.studentAccess.create({
      data: {
        userId,
        studentId: student.id,
        canEdit: data.canEdit,
      },
      include: {
        student: {
          select: {
            id: true,
            recordId: true,
            firstName: true,
            lastName: true,
            grade: true,
            schoolName: true,
          },
        },
      },
    });

    res.status(201).json({
      studentAccess: {
        id: access.id,
        studentId: access.student.id,
        recordId: access.student.recordId,
        firstName: access.student.firstName,
        lastName: access.student.lastName,
        studentName: `${access.student.firstName} ${access.student.lastName}`,
        grade: access.student.grade,
        schoolName: access.student.schoolName,
        canEdit: access.canEdit,
        grantedAt: access.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Student access create error:', error);
    res.status(500).json({ error: 'Failed to create student access' });
  }
});

// PATCH /admin/users/:userId/students/:accessId - Update student access
router.patch('/users/:userId/students/:accessId', requireManageUsersPermission, async (req, res) => {
  try {
    const { userId, accessId } = req.params;

    const bodySchema = z.object({
      canEdit: z.boolean(),
    });

    const data = bodySchema.parse(req.body);

    // Verify access exists and belongs to user
    const access = await prisma.studentAccess.findFirst({
      where: {
        id: accessId,
        userId,
      },
    });

    if (!access) {
      return res.status(404).json({ error: 'Student access not found' });
    }

    const updated = await prisma.studentAccess.update({
      where: { id: accessId },
      data: { canEdit: data.canEdit },
      include: {
        student: {
          select: {
            id: true,
            recordId: true,
            firstName: true,
            lastName: true,
            grade: true,
            schoolName: true,
          },
        },
      },
    });

    res.json({
      studentAccess: {
        id: updated.id,
        studentId: updated.student.id,
        recordId: updated.student.recordId,
        firstName: updated.student.firstName,
        lastName: updated.student.lastName,
        studentName: `${updated.student.firstName} ${updated.student.lastName}`,
        grade: updated.student.grade,
        schoolName: updated.student.schoolName,
        canEdit: updated.canEdit,
        grantedAt: updated.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Student access update error:', error);
    res.status(500).json({ error: 'Failed to update student access' });
  }
});

// DELETE /admin/users/:userId/students/:accessId - Remove student access
router.delete('/users/:userId/students/:accessId', requireManageUsersPermission, async (req, res) => {
  try {
    const { userId, accessId } = req.params;

    // Verify access exists and belongs to user
    const access = await prisma.studentAccess.findFirst({
      where: {
        id: accessId,
        userId,
      },
    });

    if (!access) {
      return res.status(404).json({ error: 'Student access not found' });
    }

    await prisma.studentAccess.delete({
      where: { id: accessId },
    });

    res.json({ success: true, message: 'Student access removed' });
  } catch (error) {
    console.error('Student access delete error:', error);
    res.status(500).json({ error: 'Failed to remove student access' });
  }
});

// ============================================
// STATE MANAGEMENT (Reference Data)
// ============================================

// GET /admin/states - List all states
router.get('/states', requireAdmin, async (_req, res) => {
  try {
    const states = await prisma.state.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { districts: true } },
      },
    });

    res.json({
      states: states.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        isActive: s.isActive,
        districtCount: s._count.districts,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('States fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

// POST /admin/states - Create a new state
router.post('/states', requireAdmin, async (req, res) => {
  try {
    const bodySchema = z.object({
      code: z.string().min(2).max(2, 'State code must be 2 characters'),
      name: z.string().min(1, 'State name is required'),
    });

    const data = bodySchema.parse(req.body);

    // Check if state code already exists
    const existing = await prisma.state.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      return res.status(409).json({ error: `State with code "${data.code}" already exists` });
    }

    const state = await prisma.state.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        isActive: true,
      },
    });

    res.status(201).json({ state });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('State create error:', error);
    res.status(500).json({ error: 'Failed to create state' });
  }
});

// PATCH /admin/states/:stateId - Update a state
router.patch('/states/:stateId', requireAdmin, async (req, res) => {
  try {
    const { stateId } = req.params;

    const bodySchema = z.object({
      name: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
    });

    const data = bodySchema.parse(req.body);

    const state = await prisma.state.findUnique({
      where: { id: stateId },
    });

    if (!state) {
      return res.status(404).json({ error: 'State not found' });
    }

    const updated = await prisma.state.update({
      where: { id: stateId },
      data: {
        name: data.name,
        isActive: data.isActive,
      },
    });

    res.json({ state: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('State update error:', error);
    res.status(500).json({ error: 'Failed to update state' });
  }
});

// ============================================
// DISTRICT MANAGEMENT (Reference Data)
// ============================================

// GET /admin/states/:stateId/districts - List all districts for a state
router.get('/states/:stateId/districts', requireAdmin, async (req, res) => {
  try {
    const { stateId } = req.params;

    const districts = await prisma.district.findMany({
      where: { stateId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { schools: true } },
      },
    });

    res.json({
      districts: districts.map(d => ({
        id: d.id,
        code: d.code,
        name: d.name,
        stateId: d.stateId,
        isActive: d.isActive,
        schoolCount: d._count.schools,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Districts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

// POST /admin/states/:stateId/districts - Create a new district
router.post('/states/:stateId/districts', requireAdmin, async (req, res) => {
  try {
    const { stateId } = req.params;

    const bodySchema = z.object({
      code: z.string().min(1, 'District code is required'),
      name: z.string().min(1, 'District name is required'),
    });

    const data = bodySchema.parse(req.body);

    // Verify state exists
    const state = await prisma.state.findUnique({
      where: { id: stateId },
    });

    if (!state) {
      return res.status(404).json({ error: 'State not found' });
    }

    // Check if district code already exists in this state
    const existing = await prisma.district.findFirst({
      where: { stateId, code: data.code.toUpperCase() },
    });

    if (existing) {
      return res.status(409).json({ error: `District with code "${data.code}" already exists in this state` });
    }

    const district = await prisma.district.create({
      data: {
        stateId,
        code: data.code.toUpperCase(),
        name: data.name,
        isActive: true,
      },
    });

    res.status(201).json({ district });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('District create error:', error);
    res.status(500).json({ error: 'Failed to create district' });
  }
});

// PATCH /admin/districts/:districtId - Update a district
router.patch('/districts/:districtId', requireAdmin, async (req, res) => {
  try {
    const { districtId } = req.params;

    const bodySchema = z.object({
      name: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
    });

    const data = bodySchema.parse(req.body);

    const district = await prisma.district.findUnique({
      where: { id: districtId },
    });

    if (!district) {
      return res.status(404).json({ error: 'District not found' });
    }

    const updated = await prisma.district.update({
      where: { id: districtId },
      data: {
        name: data.name,
        isActive: data.isActive,
      },
    });

    res.json({ district: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('District update error:', error);
    res.status(500).json({ error: 'Failed to update district' });
  }
});

// ============================================
// SCHOOL MANAGEMENT (Reference Data)
// ============================================

// GET /admin/districts/:districtId/schools - List all schools for a district
router.get('/districts/:districtId/schools', requireAdmin, async (req, res) => {
  try {
    const { districtId } = req.params;

    const schools = await prisma.school.findMany({
      where: { districtId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { students: true } },
      },
    });

    res.json({
      schools: schools.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        schoolType: s.schoolType,
        districtId: s.districtId,
        isActive: s.isActive,
        studentCount: s._count.students,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Schools fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// POST /admin/districts/:districtId/schools - Create a new school
router.post('/districts/:districtId/schools', requireAdmin, async (req, res) => {
  try {
    const { districtId } = req.params;

    const bodySchema = z.object({
      name: z.string().min(1, 'School name is required'),
      code: z.string().optional(),
      schoolType: z.enum(['ELEMENTARY', 'MIDDLE', 'HIGH', 'K8', 'K12', 'OTHER']).default('OTHER'),
    });

    const data = bodySchema.parse(req.body);

    // Verify district exists
    const district = await prisma.district.findUnique({
      where: { id: districtId },
    });

    if (!district) {
      return res.status(404).json({ error: 'District not found' });
    }

    // Check if school name already exists in this district
    const existing = await prisma.school.findFirst({
      where: { districtId, name: data.name },
    });

    if (existing) {
      return res.status(409).json({ error: `School with name "${data.name}" already exists in this district` });
    }

    const school = await prisma.school.create({
      data: {
        districtId,
        name: data.name,
        code: data.code || null,
        schoolType: data.schoolType,
        isActive: true,
      },
    });

    res.status(201).json({ school });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('School create error:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// PATCH /admin/schools/:schoolId - Update a school
router.patch('/schools/:schoolId', requireAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;

    const bodySchema = z.object({
      name: z.string().min(1).optional(),
      code: z.string().optional().nullable(),
      schoolType: z.enum(['ELEMENTARY', 'MIDDLE', 'HIGH', 'K8', 'K12', 'OTHER']).optional(),
      isActive: z.boolean().optional(),
    });

    const data = bodySchema.parse(req.body);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        name: data.name,
        code: data.code,
        schoolType: data.schoolType,
        isActive: data.isActive,
      },
    });

    res.json({ school: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('School update error:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

export default router;

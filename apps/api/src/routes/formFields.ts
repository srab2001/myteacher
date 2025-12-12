import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireOnboarded, requireAdmin } from '../middleware/auth.js';
import { FormType, ControlType, OptionsEditableBy, UserRole } from '@prisma/client';

const router = Router();

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check if a user role can edit a field value
 */
function canEditFieldValue(userRole: UserRole | null | undefined, valueEditableBy: string[]): boolean {
  if (!userRole) return false;
  return valueEditableBy.includes(userRole) || valueEditableBy.includes('ADMIN') && userRole === 'ADMIN';
}

/**
 * Check if a user role can edit field options
 */
function canEditFieldOptions(userRole: UserRole | null | undefined, optionsEditableBy: OptionsEditableBy): boolean {
  if (!userRole) return false;
  if (optionsEditableBy === 'ADMIN_ONLY') {
    return userRole === 'ADMIN';
  }
  if (optionsEditableBy === 'TEACHER_ALLOWED') {
    return userRole === 'ADMIN' || userRole === 'TEACHER' || userRole === 'CASE_MANAGER';
  }
  return false;
}

// ============================================
// PUBLIC ROUTES (Authenticated Users)
// ============================================

// GET /forms/fields - Get all field definitions for a form type
router.get('/forms/fields', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const formType = (req.query.formType as FormType) || 'IEP';

    const fields = await prisma.formFieldDefinition.findMany({
      where: {
        formType,
        isActive: true,
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [
        { sectionOrder: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    // Group fields by section
    const sections: Record<string, typeof fields> = {};
    for (const field of fields) {
      if (!sections[field.section]) {
        sections[field.section] = [];
      }
      sections[field.section].push(field);
    }

    res.json({
      formType,
      fields,
      sections,
      totalFields: fields.length,
    });
  } catch (error) {
    console.error('Get form fields error:', error);
    res.status(500).json({ error: 'Failed to get form fields' });
  }
});

// GET /forms/fields/:fieldKey - Get a single field definition
router.get('/forms/fields/:fieldKey', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { fieldKey } = req.params;
    const formType = (req.query.formType as FormType) || 'IEP';

    const field = await prisma.formFieldDefinition.findUnique({
      where: {
        formType_fieldKey: {
          formType,
          fieldKey,
        },
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    // Add permission info for the current user
    const userRole = req.user?.role;
    const canEditValue = canEditFieldValue(userRole, field.valueEditableBy as string[]);
    const canEditOptions = canEditFieldOptions(userRole, field.optionsEditableBy);

    res.json({
      field,
      permissions: {
        canEditValue,
        canEditOptions,
      },
    });
  } catch (error) {
    console.error('Get form field error:', error);
    res.status(500).json({ error: 'Failed to get form field' });
  }
});

// GET /schools - Get all schools (for dropdowns)
router.get('/schools', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json({ schools });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ error: 'Failed to get schools' });
  }
});

// ============================================
// FIELD VALUE ROUTES
// ============================================

// POST /forms/values - Save field values (with permission check)
const saveFieldValuesSchema = z.object({
  planId: z.string().optional(),
  studentId: z.string().optional(),
  formType: z.nativeEnum(FormType),
  values: z.array(z.object({
    fieldKey: z.string(),
    value: z.unknown(),
  })),
});

router.post('/forms/values', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = saveFieldValuesSchema.parse(req.body);
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Get field definitions to check permissions
    const fieldKeys = data.values.map(v => v.fieldKey);
    const fieldDefs = await prisma.formFieldDefinition.findMany({
      where: {
        formType: data.formType,
        fieldKey: { in: fieldKeys },
      },
    });

    const fieldDefMap = new Map(fieldDefs.map(f => [f.fieldKey, f]));
    const errors: Array<{ fieldKey: string; message: string }> = [];
    const savedValues: Array<{ fieldKey: string; value: unknown }> = [];

    for (const { fieldKey, value } of data.values) {
      const fieldDef = fieldDefMap.get(fieldKey);

      if (!fieldDef) {
        errors.push({ fieldKey, message: 'Field definition not found' });
        continue;
      }

      // Check permission
      const canEdit = canEditFieldValue(userRole, fieldDef.valueEditableBy as string[]);
      if (!canEdit) {
        errors.push({ fieldKey, message: `Permission denied: ${userRole} cannot edit this field` });
        continue;
      }

      // Save based on whether it's plan-specific or student-specific
      if (data.planId) {
        // Save to PlanFieldValue
        await prisma.planFieldValue.upsert({
          where: {
            planInstanceId_fieldKey: {
              planInstanceId: data.planId,
              fieldKey,
            },
          },
          update: {
            value: value as any,
          },
          create: {
            planInstanceId: data.planId,
            fieldKey,
            value: value as any,
          },
        });
      } else if (data.studentId) {
        // Save to StudentFieldValue
        await prisma.studentFieldValue.upsert({
          where: {
            studentId_fieldKey: {
              studentId: data.studentId,
              fieldKey,
            },
          },
          update: {
            value: value as any,
          },
          create: {
            studentId: data.studentId,
            fieldKey,
            value: value as any,
            createdById: userId,
          },
        });
      } else {
        errors.push({ fieldKey, message: 'Either planId or studentId is required' });
        continue;
      }

      savedValues.push({ fieldKey, value });
    }

    if (errors.length > 0 && savedValues.length === 0) {
      return res.status(403).json({ error: 'Permission denied', errors });
    }

    res.json({
      saved: savedValues.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Save field values error:', error);
    res.status(500).json({ error: 'Failed to save field values' });
  }
});

// GET /forms/values - Get field values for a plan or student
router.get('/forms/values', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const { planId, studentId, formType } = req.query;

    if (!planId && !studentId) {
      return res.status(400).json({ error: 'Either planId or studentId is required' });
    }

    let values: Array<{ fieldKey: string; value: unknown }> = [];

    if (planId) {
      const planValues = await prisma.planFieldValue.findMany({
        where: { planInstanceId: planId as string },
      });
      values = planValues.map(v => ({ fieldKey: v.fieldKey, value: v.value }));
    } else if (studentId) {
      const studentValues = await prisma.studentFieldValue.findMany({
        where: { studentId: studentId as string },
      });
      values = studentValues.map(v => ({ fieldKey: v.fieldKey, value: v.value }));
    }

    res.json({ values });
  } catch (error) {
    console.error('Get field values error:', error);
    res.status(500).json({ error: 'Failed to get field values' });
  }
});

// ============================================
// FINALIZATION WITH REQUIRED FIELD VALIDATION
// ============================================

// POST /forms/validate-required - Validate required fields before finalization
const validateRequiredSchema = z.object({
  planId: z.string().optional(),
  studentId: z.string().optional(),
  formType: z.nativeEnum(FormType),
});

router.post('/forms/validate-required', requireAuth, requireOnboarded, async (req, res) => {
  try {
    const data = validateRequiredSchema.parse(req.body);

    // Get all required field definitions
    const requiredFields = await prisma.formFieldDefinition.findMany({
      where: {
        formType: data.formType,
        isRequired: true,
        isActive: true,
      },
    });

    // Get current values
    let values: Map<string, unknown> = new Map();

    if (data.planId) {
      const planValues = await prisma.planFieldValue.findMany({
        where: { planInstanceId: data.planId },
      });
      planValues.forEach(v => values.set(v.fieldKey, v.value));
    }

    if (data.studentId) {
      const studentValues = await prisma.studentFieldValue.findMany({
        where: { studentId: data.studentId },
      });
      studentValues.forEach(v => values.set(v.fieldKey, v.value));
    }

    // Check which required fields are missing
    const missingFields: Array<{ section: string; fieldKey: string; fieldLabel: string }> = [];

    for (const field of requiredFields) {
      const value = values.get(field.fieldKey);

      // Check if value is empty/missing
      const isEmpty = value === null ||
        value === undefined ||
        value === '' ||
        (typeof value === 'object' && Object.keys(value as object).length === 0);

      if (isEmpty) {
        missingFields.push({
          section: field.section,
          fieldKey: field.fieldKey,
          fieldLabel: field.fieldLabel,
        });
      }
    }

    const isValid = missingFields.length === 0;

    res.json({
      isValid,
      missingFields: isValid ? undefined : missingFields,
      message: isValid
        ? 'All required fields are complete'
        : `Missing ${missingFields.length} required field(s)`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Validate required error:', error);
    res.status(500).json({ error: 'Failed to validate required fields' });
  }
});

// ============================================
// ADMIN ROUTES - Field Definition Management
// ============================================

// POST /admin/forms/seed - Seed field definitions from JSON (admin only)
router.post('/admin/forms/seed', requireAdmin, async (req, res) => {
  try {
    // This endpoint allows admin to trigger a re-seed of field definitions
    // In production, you might want to pass the seed data in the request body
    res.json({
      message: 'Use prisma db seed to seed field definitions',
      hint: 'Run: npx prisma db seed',
    });
  } catch (error) {
    console.error('Seed form fields error:', error);
    res.status(500).json({ error: 'Failed to seed form fields' });
  }
});

// POST /admin/forms/fields - Create a new field definition (admin only)
const createFieldSchema = z.object({
  formType: z.nativeEnum(FormType),
  section: z.string().min(1),
  sectionOrder: z.number().int().default(0),
  fieldKey: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Field key must be lowercase snake_case'),
  fieldLabel: z.string().min(1),
  controlType: z.nativeEnum(ControlType),
  isRequired: z.boolean().default(false),
  valueEditableBy: z.array(z.string()),
  optionsEditableBy: z.nativeEnum(OptionsEditableBy).default('NONE'),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

router.post('/admin/forms/fields', requireAdmin, async (req, res) => {
  try {
    const data = createFieldSchema.parse(req.body);

    // Check if field already exists
    const existing = await prisma.formFieldDefinition.findUnique({
      where: {
        formType_fieldKey: {
          formType: data.formType,
          fieldKey: data.fieldKey,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Field with this key already exists' });
    }

    const field = await prisma.formFieldDefinition.create({
      data: {
        formType: data.formType,
        section: data.section,
        sectionOrder: data.sectionOrder,
        fieldKey: data.fieldKey,
        fieldLabel: data.fieldLabel,
        controlType: data.controlType,
        isRequired: data.isRequired,
        valueEditableBy: data.valueEditableBy,
        optionsEditableBy: data.optionsEditableBy,
        helpText: data.helpText,
        placeholder: data.placeholder,
        sortOrder: data.sortOrder,
      },
    });

    res.status(201).json({ field });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Create form field error:', error);
    res.status(500).json({ error: 'Failed to create form field' });
  }
});

// PATCH /admin/forms/fields/:id - Update a field definition (admin only)
const updateFieldSchema = z.object({
  section: z.string().min(1).optional(),
  sectionOrder: z.number().int().optional(),
  fieldLabel: z.string().min(1).optional(),
  controlType: z.nativeEnum(ControlType).optional(),
  isRequired: z.boolean().optional(),
  valueEditableBy: z.array(z.string()).optional(),
  optionsEditableBy: z.nativeEnum(OptionsEditableBy).optional(),
  helpText: z.string().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

router.patch('/admin/forms/fields/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateFieldSchema.parse(req.body);

    const field = await prisma.formFieldDefinition.update({
      where: { id },
      data,
    });

    res.json({ field });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Update form field error:', error);
    res.status(500).json({ error: 'Failed to update form field' });
  }
});

// DELETE /admin/forms/fields/:id - Soft delete a field definition (admin only)
router.delete('/admin/forms/fields/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.formFieldDefinition.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Field deactivated' });
  } catch (error) {
    console.error('Delete form field error:', error);
    res.status(500).json({ error: 'Failed to delete form field' });
  }
});

// ============================================
// ADMIN ROUTES - Field Options Management
// ============================================

// POST /admin/forms/fields/:fieldId/options - Add option to a field (admin only)
const createOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  sortOrder: z.number().int().default(0),
  isDefault: z.boolean().default(false),
});

router.post('/admin/forms/fields/:fieldId/options', requireAdmin, async (req, res) => {
  try {
    const { fieldId } = req.params;
    const data = createOptionSchema.parse(req.body);

    // Verify field exists and is DROPDOWN or RADIO
    const field = await prisma.formFieldDefinition.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    if (field.controlType !== 'DROPDOWN' && field.controlType !== 'RADIO') {
      return res.status(400).json({ error: 'Options can only be added to DROPDOWN or RADIO fields' });
    }

    const option = await prisma.formFieldOption.create({
      data: {
        fieldDefinitionId: fieldId,
        value: data.value,
        label: data.label,
        sortOrder: data.sortOrder,
        isDefault: data.isDefault,
      },
    });

    res.status(201).json({ option });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Create field option error:', error);
    res.status(500).json({ error: 'Failed to create field option' });
  }
});

// PATCH /admin/forms/options/:id - Update an option (admin only)
const updateOptionSchema = z.object({
  value: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

router.patch('/admin/forms/options/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateOptionSchema.parse(req.body);

    const option = await prisma.formFieldOption.update({
      where: { id },
      data,
    });

    res.json({ option });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Update field option error:', error);
    res.status(500).json({ error: 'Failed to update field option' });
  }
});

// DELETE /admin/forms/options/:id - Soft delete an option (admin only)
router.delete('/admin/forms/options/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.formFieldOption.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Option deactivated' });
  } catch (error) {
    console.error('Delete field option error:', error);
    res.status(500).json({ error: 'Failed to delete field option' });
  }
});

// ============================================
// ADMIN ROUTES - School Management
// ============================================

// GET /admin/schools - Get all schools including inactive (admin only)
router.get('/admin/schools', requireAdmin, async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({ schools });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ error: 'Failed to get schools' });
  }
});

// POST /admin/schools - Create a new school (admin only)
const createSchoolSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  stateCode: z.string().optional(),
  districtId: z.string().optional(),
  address: z.string().optional(),
});

router.post('/admin/schools', requireAdmin, async (req, res) => {
  try {
    const data = createSchoolSchema.parse(req.body);

    const school = await prisma.school.create({
      data: {
        name: data.name,
        code: data.code,
        stateCode: data.stateCode,
        districtId: data.districtId,
        address: data.address,
      },
    });

    res.status(201).json({ school });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Create school error:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// PATCH /admin/schools/:id - Update a school (admin only)
const updateSchoolSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().nullable().optional(),
  stateCode: z.string().nullable().optional(),
  districtId: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

router.patch('/admin/schools/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateSchoolSchema.parse(req.body);

    const school = await prisma.school.update({
      where: { id },
      data,
    });

    res.json({ school });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Update school error:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

// DELETE /admin/schools/:id - Soft delete a school (admin only)
router.delete('/admin/schools/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.school.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'School deactivated' });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ error: 'Failed to delete school' });
  }
});

export default router;

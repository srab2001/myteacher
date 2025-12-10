import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { requireStudentAccess, requirePlanAccess, requireCreatePlanPermission, requireUpdatePlanPermission } from '../middleware/permissions.js';
import { generateIepPdf, generate504Pdf, getStudentInfoForPlan } from '../services/pdfExport.js';

const router = Router();

// Create a new plan for a student
router.post('/students/:studentId/plans/:planTypeCode', requireAuth, requireOnboarded, requireStudentAccess('studentId'), requireCreatePlanPermission, async (req, res) => {
  try {
    const { studentId, planTypeCode } = req.params;

    // Student access already verified by middleware
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get plan type
    const planType = await prisma.planType.findFirst({
      where: {
        code: planTypeCode as 'IEP' | 'FIVE_OH_FOUR' | 'BEHAVIOR_PLAN',
      },
    });

    if (!planType) {
      return res.status(404).json({ error: 'Plan type not found' });
    }

    // Get active schema
    const schema = await prisma.planSchema.findFirst({
      where: {
        planTypeId: planType.id,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!schema) {
      return res.status(404).json({ error: 'No active schema found' });
    }

    // Create new plan instance
    const plan = await prisma.planInstance.create({
      data: {
        studentId,
        planTypeId: planType.id,
        schemaId: schema.id,
        startDate: new Date(),
        status: 'DRAFT',
      },
      include: {
        schema: true,
        planType: true,
        student: true,
      },
    });

    // If this is a BEHAVIOR_PLAN, also create the BehaviorPlan record
    if (planTypeCode === 'BEHAVIOR_PLAN') {
      await prisma.behaviorPlan.create({
        data: {
          planInstanceId: plan.id,
        },
      });
    }

    // Prefill student information fields for all plan types
    const studentInfoFields = [
      { fieldKey: 'student_name', value: `${student.firstName} ${student.lastName}` },
      { fieldKey: 'grade_level', value: student.grade || '' },
      { fieldKey: 'date_of_birth', value: student.dateOfBirth ? student.dateOfBirth.toISOString().split('T')[0] : '' },
    ];

    // Create field values for student info
    await Promise.all(
      studentInfoFields.map(field =>
        prisma.planFieldValue.create({
          data: {
            planInstanceId: plan.id,
            fieldKey: field.fieldKey,
            value: field.value,
          },
        })
      )
    );

    res.status(201).json({
      plan: {
        id: plan.id,
        status: plan.status,
        startDate: plan.startDate,
        endDate: plan.endDate,
        planType: plan.planType.name,
        schema: {
          id: plan.schema.id,
          name: plan.schema.name,
          fields: plan.schema.fields,
        },
        student: {
          id: plan.student.id,
          firstName: plan.student.firstName,
          lastName: plan.student.lastName,
        },
      },
    });
  } catch (error) {
    console.error('Plan creation error:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Get a plan by ID
router.get('/:planId', requireAuth, requireOnboarded, requirePlanAccess('planId'), async (req, res) => {
  try {
    const plan = await prisma.planInstance.findUnique({
      where: { id: req.params.planId },
      include: {
        schema: true,
        planType: true,
        student: true,
        fieldValues: true,
        goals: {
          include: {
            progressRecords: {
              orderBy: { date: 'desc' },
              take: 5,
            },
            workSamples: {
              orderBy: { capturedAt: 'desc' },
              take: 5,
            },
          },
        },
        serviceLogs: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Convert field values to a map
    const fieldValuesMap: Record<string, unknown> = {};
    for (const fv of plan.fieldValues) {
      fieldValuesMap[fv.fieldKey] = fv.value;
    }

    res.json({
      plan: {
        id: plan.id,
        status: plan.status,
        startDate: plan.startDate,
        endDate: plan.endDate,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        planType: {
          code: plan.planType.code,
          name: plan.planType.name,
        },
        schema: {
          id: plan.schema.id,
          name: plan.schema.name,
          version: plan.schema.version,
          fields: plan.schema.fields,
        },
        student: {
          id: plan.student.id,
          firstName: plan.student.firstName,
          lastName: plan.student.lastName,
          dateOfBirth: plan.student.dateOfBirth,
          grade: plan.student.grade,
        },
        fieldValues: fieldValuesMap,
        goals: plan.goals,
        serviceLogs: plan.serviceLogs,
      },
    });
  } catch (error) {
    console.error('Plan fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// Update plan fields
const updateFieldsSchema = z.object({
  fields: z.record(z.unknown()),
});

router.patch('/:planId/fields', requireAuth, requireOnboarded, requirePlanAccess('planId'), requireUpdatePlanPermission, async (req, res) => {
  try {
    const data = updateFieldsSchema.parse(req.body);

    // Plan access already verified by middleware
    const plan = await prisma.planInstance.findUnique({
      where: { id: req.params.planId },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Upsert each field value
    const updates = Object.entries(data.fields).map(([fieldKey, value]) =>
      prisma.planFieldValue.upsert({
        where: {
          planInstanceId_fieldKey: {
            planInstanceId: plan.id,
            fieldKey,
          },
        },
        update: { value: value as object },
        create: {
          planInstanceId: plan.id,
          fieldKey,
          value: value as object,
        },
      })
    );

    await Promise.all(updates);

    // Update plan timestamp
    await prisma.planInstance.update({
      where: { id: plan.id },
      data: { updatedAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Field update error:', error);
    res.status(500).json({ error: 'Failed to update fields' });
  }
});

// Finalize a plan (validate required fields)
router.post('/:planId/finalize', requireAuth, requireOnboarded, requirePlanAccess('planId'), requireUpdatePlanPermission, async (req, res) => {
  try {
    const plan = await prisma.planInstance.findUnique({
      where: { id: req.params.planId },
      include: {
        schema: true,
        fieldValues: true,
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (plan.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft plans can be finalized' });
    }

    // Validate required fields
    const schemaFields = plan.schema.fields as { sections?: Array<{ fields: Array<{ key: string; required: boolean }> }> };
    const missingFields: string[] = [];

    if (schemaFields.sections) {
      for (const section of schemaFields.sections) {
        for (const field of section.fields) {
          if (field.required) {
            const hasValue = plan.fieldValues.some(
              fv => fv.fieldKey === field.key && fv.value !== null && fv.value !== ''
            );
            if (!hasValue) {
              missingFields.push(field.key);
            }
          }
        }
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields,
      });
    }

    // Update plan status
    const updatedPlan = await prisma.planInstance.update({
      where: { id: plan.id },
      data: { status: 'ACTIVE' },
    });

    res.json({
      plan: {
        id: updatedPlan.id,
        status: updatedPlan.status,
      },
    });
  } catch (error) {
    console.error('Finalize error:', error);
    res.status(500).json({ error: 'Failed to finalize plan' });
  }
});

// Get all plans for a student
router.get('/students/:studentId/plans', requireAuth, requireOnboarded, requireStudentAccess('studentId'), async (req, res) => {
  try {
    const plans = await prisma.planInstance.findMany({
      where: {
        studentId: req.params.studentId,
      },
      include: {
        planType: true,
        schema: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      plans: plans.map(p => ({
        id: p.id,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        planType: p.planType.name,
        planTypeCode: p.planType.code,
        schemaName: p.schema.name,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('Plans fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// ============================================
// PDF EXPORT ROUTES
// ============================================

// Generate IEP PDF for a plan
router.get('/students/:studentId/plans/:planId/iep-pdf', requireAuth, requireOnboarded, requireStudentAccess('studentId'), requirePlanAccess('planId'), async (req, res) => {
  try {
    const { planId, studentId } = req.params;

    // Verify plan belongs to student and is IEP type
    const plan = await prisma.planInstance.findUnique({
      where: { id: planId },
      include: {
        planType: true,
        student: true,
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (plan.studentId !== studentId) {
      return res.status(403).json({ error: 'Plan does not belong to this student' });
    }

    if (plan.planType.code !== 'IEP') {
      return res.status(400).json({ error: 'This is not an IEP plan' });
    }

    // Generate PDF
    const pdfBytes = await generateIepPdf(planId);

    // Set response headers
    const fileName = `IEP-${plan.student.lastName}-${plan.student.firstName}-${planId.slice(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);

    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('IEP PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate IEP PDF' });
  }
});

// Generate 504 PDF for a plan
router.get('/students/:studentId/plans/:planId/504-pdf', requireAuth, requireOnboarded, requireStudentAccess('studentId'), requirePlanAccess('planId'), async (req, res) => {
  try {
    const { planId, studentId } = req.params;

    // Verify plan belongs to student and is 504 type
    const plan = await prisma.planInstance.findUnique({
      where: { id: planId },
      include: {
        planType: true,
        student: true,
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (plan.studentId !== studentId) {
      return res.status(403).json({ error: 'Plan does not belong to this student' });
    }

    if (plan.planType.code !== 'FIVE_OH_FOUR') {
      return res.status(400).json({ error: 'This is not a 504 plan' });
    }

    // Generate PDF
    const pdfBytes = await generate504Pdf(planId);

    // Set response headers
    const fileName = `504-${plan.student.lastName}-${plan.student.firstName}-${planId.slice(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBytes.length);

    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('504 PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate 504 PDF' });
  }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { generatePlanPdf } from '../services/pdfGenerator.js';
import { Errors, ApiError } from '../errors.js';
import { AuditLogger } from '../services/auditLog.js';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Helper to check if user can manage plans
function canManagePlan(userRole: string | null | undefined): boolean {
  return userRole === 'ADMIN' || userRole === 'CASE_MANAGER';
}

// ============================================
// FINALIZE PLAN - Create a new version snapshot
// POST /api/plans/:planId/finalize
// ============================================

const finalizeSchema = z.object({
  versionNotes: z.string().optional(),
  decisions: z.array(z.object({
    decisionType: z.enum([
      'ELIGIBILITY_CATEGORY', 'PLACEMENT_LRE', 'SERVICES_CHANGE', 'GOALS_CHANGE',
      'ACCOMMODATIONS_CHANGE', 'ESY_DECISION', 'ASSESSMENT_PARTICIPATION',
      'BEHAVIOR_SUPPORTS', 'TRANSITION_SERVICES', 'OTHER'
    ]),
    summary: z.string(),
    rationale: z.string(),
    optionsConsidered: z.string().optional(),
    participants: z.string().optional(),
  })).optional(),
  createSignaturePacket: z.boolean().optional().default(true),
  requiredSignatureRoles: z.array(z.enum([
    'PARENT_GUARDIAN', 'CASE_MANAGER', 'SPECIAL_ED_TEACHER', 'GENERAL_ED_TEACHER',
    'RELATED_SERVICE_PROVIDER', 'ADMINISTRATOR', 'STUDENT', 'OTHER'
  ])).optional(),
});

router.post('/plans/:planId/finalize', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    if (!canManagePlan(req.user?.role)) {
      return res.status(403).json({ error: 'Not authorized to finalize plans' });
    }

    const validatedData = finalizeSchema.parse(req.body);

    // Get the plan with all its data
    const plan = await prisma.planInstance.findUnique({
      where: { id: planId },
      include: {
        student: true,
        planType: true,
        schema: true,
        fieldValues: true,
        goals: {
          include: {
            objectives: true,
            progressRecords: { orderBy: { date: 'desc' }, take: 5 },
          },
        },
        iepServices: true,
        iepAccommodations: true,
        iepAssessmentDecisions: true,
        iepTransition: true,
        iepExtendedSchoolYear: true,
        planVersions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Check plan is in draft status
    if (plan.status !== 'DRAFT' && plan.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Plan must be in DRAFT or ACTIVE status to finalize' });
    }

    // Determine next version number
    const nextVersionNumber = plan.planVersions.length > 0
      ? plan.planVersions[0].versionNumber + 1
      : 1;

    // Create snapshot of the plan
    const snapshotJson = {
      planId: plan.id,
      studentId: plan.studentId,
      student: {
        firstName: plan.student.firstName,
        lastName: plan.student.lastName,
        dateOfBirth: plan.student.dateOfBirth,
        grade: plan.student.grade,
        schoolName: plan.student.schoolName,
      },
      planType: {
        code: plan.planType.code,
        name: plan.planType.name,
      },
      schema: {
        id: plan.schema.id,
        name: plan.schema.name,
        version: plan.schema.version,
      },
      startDate: plan.startDate,
      endDate: plan.endDate,
      fieldValues: plan.fieldValues.map(fv => ({
        fieldKey: fv.fieldKey,
        value: fv.value,
      })),
      goals: plan.goals.map(g => ({
        goalCode: g.goalCode,
        area: g.area,
        annualGoalText: g.annualGoalText,
        baselineJson: g.baselineJson,
        targetDate: g.targetDate,
        objectives: g.objectives.map(o => ({
          sequence: o.sequence,
          objectiveText: o.objectiveText,
          targetDate: o.targetDate,
        })),
      })),
      services: plan.iepServices.map(s => ({
        category: s.category,
        serviceType: s.serviceType,
        frequency: s.frequency,
        duration: s.duration,
        location: s.location,
        startDate: s.startDate,
        endDate: s.endDate,
      })),
      accommodations: plan.iepAccommodations.map(a => ({
        accommodationType: a.accommodationType,
        description: a.description,
        setting: a.setting,
        forStateAssessment: a.forStateAssessment,
        forDistrictAssessment: a.forDistrictAssessment,
        forClassroom: a.forClassroom,
      })),
      assessmentDecisions: plan.iepAssessmentDecisions.map(ad => ({
        assessmentName: ad.assessmentName,
        assessmentArea: ad.assessmentArea,
        decision: ad.decision,
        alternateAssessmentRationale: ad.alternateAssessmentRationale,
        accommodationsApplied: ad.accommodationsApplied,
      })),
      transition: plan.iepTransition ? {
        studentVision: plan.iepTransition.studentVision,
        educationTrainingGoal: plan.iepTransition.educationTrainingGoal,
        employmentGoal: plan.iepTransition.employmentGoal,
        independentLivingGoal: plan.iepTransition.independentLivingGoal,
        courseOfStudy: plan.iepTransition.courseOfStudy,
      } : null,
      extendedSchoolYear: plan.iepExtendedSchoolYear ? {
        esyEligible: plan.iepExtendedSchoolYear.esyEligible,
        esyDecisionDate: plan.iepExtendedSchoolYear.esyDecisionDate,
        esyServicesDescription: plan.iepExtendedSchoolYear.esyServicesDescription,
        esyGoals: plan.iepExtendedSchoolYear.esyGoals,
        esyStartDate: plan.iepExtendedSchoolYear.esyStartDate,
        esyEndDate: plan.iepExtendedSchoolYear.esyEndDate,
      } : null,
      finalizedAt: new Date().toISOString(),
      versionNumber: nextVersionNumber,
    };

    // Use transaction to create version, decisions, and signature packet
    const result = await prisma.$transaction(async (tx) => {
      // Mark any previous FINAL versions as SUPERSEDED
      await tx.planVersion.updateMany({
        where: {
          planInstanceId: planId,
          status: 'FINAL',
        },
        data: {
          status: 'SUPERSEDED',
        },
      });

      // Create the new version
      const version = await tx.planVersion.create({
        data: {
          planInstanceId: planId,
          versionNumber: nextVersionNumber,
          status: 'FINAL',
          snapshotJson: snapshotJson as Prisma.InputJsonValue,
          versionNotes: validatedData.versionNotes,
          finalizedByUserId: req.user!.id,
        },
        include: {
          finalizedBy: { select: { id: true, displayName: true } },
        },
      });

      // Create decisions if provided
      if (validatedData.decisions && validatedData.decisions.length > 0) {
        await tx.decisionLedgerEntry.createMany({
          data: validatedData.decisions.map(d => ({
            planInstanceId: planId,
            planVersionId: version.id,
            decisionType: d.decisionType,
            summary: d.summary,
            rationale: d.rationale,
            optionsConsidered: d.optionsConsidered,
            participants: d.participants,
            decidedAt: new Date(),
            decidedByUserId: req.user!.id,
          })),
        });
      }

      // Create signature packet if requested
      let signaturePacket = null;
      if (validatedData.createSignaturePacket) {
        const requiredRoles = validatedData.requiredSignatureRoles || ['CASE_MANAGER'];
        signaturePacket = await tx.signaturePacket.create({
          data: {
            planVersionId: version.id,
            requiredRoles: requiredRoles as Prisma.InputJsonValue,
            createdByUserId: req.user!.id,
          },
        });

        // Pre-create signature records for required roles
        await tx.signatureRecord.createMany({
          data: requiredRoles.map(role => ({
            packetId: signaturePacket!.id,
            role: role,
            signerName: '', // Will be filled when signing
            status: 'PENDING',
          })),
        });
      }

      // Update plan status to ACTIVE if it was DRAFT
      if (plan.status === 'DRAFT') {
        await tx.planInstance.update({
          where: { id: planId },
          data: { status: 'ACTIVE' },
        });
      }

      return { version, signaturePacket };
    });

    // Generate PDF export asynchronously (don't block the response)
    generatePlanPdf(result.version.id, snapshotJson, req.user!.id).catch(err => {
      console.error('Failed to generate PDF for version:', result.version.id, err);
    });

    // Log audit event
    AuditLogger.planFinalized(req.user!, planId, result.version.id, plan.studentId, req).catch(err => {
      console.error('Failed to log audit event:', err);
    });

    res.status(201).json({
      version: result.version,
      signaturePacket: result.signaturePacket,
      message: 'Plan finalized successfully. PDF generation in progress.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error finalizing plan:', error);
    res.status(500).json({ error: 'Failed to finalize plan' });
  }
});

// ============================================
// GET PLAN VERSIONS
// GET /api/plans/:planId/versions
// ============================================

router.get('/plans/:planId/versions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const versions = await prisma.planVersion.findMany({
      where: { planInstanceId: planId },
      orderBy: { versionNumber: 'desc' },
      include: {
        finalizedBy: { select: { id: true, displayName: true } },
        distributedBy: { select: { id: true, displayName: true } },
        exports: {
          select: {
            id: true,
            format: true,
            fileName: true,
            exportedAt: true,
          },
        },
        signaturePacket: {
          include: {
            signatures: {
              select: {
                id: true,
                role: true,
                signerName: true,
                status: true,
                signedAt: true,
              },
            },
          },
        },
      },
    });

    res.json({ versions });
  } catch (error) {
    console.error('Error fetching plan versions:', error);
    res.status(500).json({ error: 'Failed to fetch plan versions' });
  }
});

// ============================================
// GET SINGLE VERSION
// GET /api/plan-versions/:versionId
// ============================================

router.get('/plan-versions/:versionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;

    const version = await prisma.planVersion.findUnique({
      where: { id: versionId },
      include: {
        planInstance: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
            planType: { select: { code: true, name: true } },
          },
        },
        finalizedBy: { select: { id: true, displayName: true } },
        distributedBy: { select: { id: true, displayName: true } },
        exports: true,
        signaturePacket: {
          include: {
            signatures: true,
            createdBy: { select: { id: true, displayName: true } },
          },
        },
        decisions: {
          include: {
            decidedBy: { select: { id: true, displayName: true } },
          },
        },
      },
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json({ version });
  } catch (error) {
    console.error('Error fetching plan version:', error);
    res.status(500).json({ error: 'Failed to fetch plan version' });
  }
});

// ============================================
// DOWNLOAD EXPORT
// GET /api/plan-exports/:exportId/download
// ============================================

router.get('/plan-exports/:exportId/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const { exportId } = req.params;

    const exportRecord = await prisma.planExport.findUnique({
      where: { id: exportId },
      include: {
        planVersion: {
          include: {
            planInstance: {
              include: {
                student: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!exportRecord) {
      return res.status(404).json({ error: 'Export not found' });
    }

    // Check if file exists
    const filePath = path.join(process.cwd(), 'exports', exportRecord.storageKey);
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Export file not found on disk' });
    }

    // Log audit event for download
    AuditLogger.pdfDownloaded(
      req.user!,
      exportId,
      exportRecord.planVersionId,
      exportRecord.planVersion.planInstanceId,
      exportRecord.planVersion.planInstance.studentId,
      req
    ).catch(err => {
      console.error('Failed to log audit event:', err);
    });

    // Set headers for download
    res.setHeader('Content-Type', exportRecord.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportRecord.fileName}"`);
    if (exportRecord.fileSizeBytes) {
      res.setHeader('Content-Length', exportRecord.fileSizeBytes);
    }

    // Stream the file
    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading export:', error);
    res.status(500).json({ error: 'Failed to download export' });
  }
});

// ============================================
// MARK VERSION AS DISTRIBUTED
// POST /api/plan-versions/:versionId/distribute
// ============================================

router.post('/plan-versions/:versionId/distribute', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { versionId } = req.params;

    if (!canManagePlan(req.user?.role)) {
      throw Errors.forbidden('Not authorized to distribute plans');
    }

    const version = await prisma.planVersion.findUnique({
      where: { id: versionId },
      include: {
        signaturePacket: {
          include: {
            signatures: true,
          },
        },
      },
    });

    if (!version) {
      throw Errors.versionNotFound(versionId);
    }

    // Check if already distributed
    if (version.status === 'DISTRIBUTED') {
      throw Errors.versionAlreadyDistributed(versionId);
    }

    // Check if version is in FINAL status
    if (version.status !== 'FINAL') {
      throw Errors.versionStatusInvalid(version.status, 'FINAL');
    }

    // Check if case manager has signed (required for distribution)
    if (version.signaturePacket) {
      const caseManagerSignature = version.signaturePacket.signatures.find(
        s => s.role === 'CASE_MANAGER' && s.status === 'SIGNED'
      );
      if (!caseManagerSignature) {
        throw Errors.versionRequiresCmSignature();
      }
    }

    const updatedVersion = await prisma.planVersion.update({
      where: { id: versionId },
      data: {
        status: 'DISTRIBUTED',
        distributedAt: new Date(),
        distributedByUserId: req.user!.id,
      },
      include: {
        finalizedBy: { select: { id: true, displayName: true } },
        distributedBy: { select: { id: true, displayName: true } },
      },
    });

    res.json({ version: updatedVersion });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error distributing version:', error);
    next(Errors.internal('Failed to distribute version'));
  }
});

export default router;

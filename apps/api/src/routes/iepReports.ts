/**
 * IEP Reports API Routes
 *
 * Handles Independent Educational Evaluation (IEE) Review reports
 * Based on Howard County "Review of Independent Assessment" form
 *
 * Maryland COMAR requires that independent educational evaluations be reviewed
 * by the IEP team to determine their impact on eligibility and IEP content.
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { requireStudentAccess } from '../middleware/permissions.js';
import { AssessmentType } from '../../prisma/generated/client/index.js';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const assessmentTypeValues = [
  'AUDIOLOGICAL',
  'EDUCATIONAL',
  'OCCUPATIONAL_THERAPY',
  'PHYSICAL_THERAPY',
  'PSYCHOLOGICAL',
  'SPEECH_LANGUAGE',
  'OTHER'
] as const;

const createReviewSchema = z.object({
  // Header information
  school: z.string().optional(),
  grade: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfReport: z.string().optional(),
  dateOfTeamReview: z.string().optional(),
  assessmentType: z.enum(assessmentTypeValues),
  assessmentTypeOther: z.string().optional(),
  planInstanceId: z.string().optional(),

  // Part I: Review by Qualified Personnel
  schoolReviewerName: z.string().optional(),
  schoolReviewerTitle: z.string().optional(),
  schoolReviewerCredentials: z.string().optional(),
  examinerName: z.string().optional(),
  examinerTitle: z.string().optional(),
  examinerLicensed: z.boolean().optional(),
  examinerLicenseDetails: z.string().optional(),
  examinerQualified: z.boolean().optional(),
  examinerQualificationNotes: z.string().optional(),
  reportWrittenDatedSigned: z.boolean().optional(),
  materialsTechnicallySound: z.boolean().optional(),
  materialsFollowedInstructions: z.boolean().optional(),
  materialsInstructionsNotes: z.string().optional(),
  materialsLanguageAccurate: z.boolean().optional(),
  materialsLanguageNotes: z.string().optional(),
  materialsBiasFree: z.boolean().optional(),
  materialsBiasNotes: z.string().optional(),
  materialsValidPurpose: z.boolean().optional(),
  materialsValidNotes: z.string().optional(),
  resultsReflectAptitude: z.boolean().optional(),
  resultsReflectAptitudeNA: z.boolean().optional(),
  resultsNotes: z.string().optional(),

  // Part II: Review by IEP/504 Team
  describesPerformanceAllAreas: z.boolean().optional(),
  performanceAreasNotes: z.string().optional(),
  includesVariedAssessmentData: z.boolean().optional(),
  assessmentDataNotes: z.string().optional(),
  includesInstructionalImplications: z.boolean().optional(),
  instructionalNotes: z.string().optional(),

  // Part III: Conclusions
  findingsMatchData: z.boolean().optional(),
  findingsMatchDataNote: z.string().optional(),
  dataMatchExistingSchoolData: z.boolean().optional(),
  dataMatchExistingNote: z.string().optional(),
  recommendationsSupported: z.boolean().optional(),
  recommendationsToConsider: z.string().optional(),
  schoolAssessmentWaived: z.boolean().optional(),
  schoolAssessmentWaivedNote: z.string().optional(),

  // Part IV: IEP Teams Only
  includesDataForIEPContent: z.boolean().optional(),
  iepContentNotes: z.string().optional(),
  disabilityConsistentWithCOMAR: z.boolean().optional(),
  comarDisabilityNotes: z.string().optional(),

  // Additional
  additionalNotes: z.string().optional(),
  teamMembers: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })).optional(),
});

// ============================================
// GET /api/students/:studentId/iep-reports
// List all IEP independent assessment reviews for a student
// ============================================

router.get(
  '/students/:studentId/iep-reports',
  requireAuth,
  requireOnboarded,
  requireStudentAccess('studentId'),
  async (req, res) => {
    try {
      const { studentId } = req.params;

      const reviews = await prisma.iEPIndependentAssessmentReview.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        include: {
          planInstance: {
            select: {
              id: true,
              startDate: true,
              status: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      res.json({
        reviews: reviews.map(r => ({
          id: r.id,
          studentId: r.studentId,
          planInstanceId: r.planInstanceId,
          school: r.school,
          grade: r.grade,
          dateOfReport: r.dateOfReport,
          dateOfTeamReview: r.dateOfTeamReview,
          assessmentType: r.assessmentType,
          assessmentTypeOther: r.assessmentTypeOther,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          planInstance: r.planInstance,
          createdBy: r.createdBy,
        })),
      });
    } catch (error) {
      console.error('Error fetching IEP reports:', error);
      res.status(500).json({ error: 'Failed to fetch IEP reports' });
    }
  }
);

// ============================================
// GET /api/iep-reports/:id
// Get a single IEP independent assessment review by ID
// ============================================

router.get(
  '/iep-reports/:id',
  requireAuth,
  requireOnboarded,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const review = await prisma.iEPIndependentAssessmentReview.findUnique({
        where: { id },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              grade: true,
              schoolName: true,
              teacherId: true,
            },
          },
          planInstance: {
            select: {
              id: true,
              startDate: true,
              status: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      if (!review) {
        return res.status(404).json({ error: 'IEP report not found' });
      }

      // Check if user has access to this student
      const hasAccess = await prisma.studentAccess.findFirst({
        where: {
          userId,
          studentId: review.studentId,
        },
      });

      const isTeacher = review.student.teacherId === userId;
      const isAdmin = (req as any).user?.role === 'ADMIN';

      if (!hasAccess && !isTeacher && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ review });
    } catch (error) {
      console.error('Error fetching IEP report:', error);
      res.status(500).json({ error: 'Failed to fetch IEP report' });
    }
  }
);

// ============================================
// POST /api/students/:studentId/iep-reports
// Create a new IEP independent assessment review
// ============================================

router.post(
  '/students/:studentId/iep-reports',
  requireAuth,
  requireOnboarded,
  requireStudentAccess('studentId'),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const userId = (req as any).user?.id;
      const data = createReviewSchema.parse(req.body);

      // Get student info to prefill
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          grade: true,
          schoolName: true,
        },
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // If planInstanceId is provided, verify it belongs to this student
      if (data.planInstanceId) {
        const planInstance = await prisma.planInstance.findFirst({
          where: {
            id: data.planInstanceId,
            studentId: studentId,
          },
        });

        if (!planInstance) {
          return res.status(400).json({ error: 'Plan does not belong to this student' });
        }
      }

      // Create the review
      const review = await prisma.iEPIndependentAssessmentReview.create({
        data: {
          studentId,
          createdById: userId,
          planInstanceId: data.planInstanceId || null,

          // Header
          school: data.school || student.schoolName,
          grade: data.grade || student.grade,
          dateOfReport: data.dateOfReport ? new Date(data.dateOfReport) : null,
          dateOfTeamReview: data.dateOfTeamReview ? new Date(data.dateOfTeamReview) : null,
          assessmentType: (data.assessmentType === "OTHER" ? "INITIAL" : data.assessmentType) as unknown as AssessmentType,
          assessmentTypeOther: data.assessmentTypeOther,

          // Part I
          examinerName: data.examinerName,
          examinerTitle: data.examinerTitle,
          examinerLicensed: data.examinerLicensed,
          examinerLicenseDetails: data.examinerLicenseDetails,
          examinerQualified: data.examinerQualified,
          examinerQualificationNotes: data.examinerQualificationNotes,
          reportWrittenDatedSigned: data.reportWrittenDatedSigned,
          materialsTechnicallySound: data.materialsTechnicallySound,
          materialsFollowedInstructions: data.materialsFollowedInstructions,
          materialsInstructionsNotes: data.materialsInstructionsNotes,
          materialsLanguageAccurate: data.materialsLanguageAccurate,
          materialsLanguageNotes: data.materialsLanguageNotes,
          materialsBiasFree: data.materialsBiasFree,
          materialsBiasNotes: data.materialsBiasNotes,
          materialsValidPurpose: data.materialsValidPurpose,
          materialsValidNotes: data.materialsValidNotes,
          resultsReflectAptitude: data.resultsReflectAptitude,
          resultsReflectAptitudeNA: data.resultsReflectAptitudeNA,
          resultsNotes: data.resultsNotes,

          // Part II
          describesPerformanceAllAreas: data.describesPerformanceAllAreas,
          performanceAreasNotes: data.performanceAreasNotes,
          includesVariedAssessmentData: data.includesVariedAssessmentData,
          assessmentDataNotes: data.assessmentDataNotes,
          includesInstructionalImplications: data.includesInstructionalImplications,
          instructionalNotes: data.instructionalNotes,

          // Part III
          findingsMatchData: data.findingsMatchData,
          findingsMatchDataNote: data.findingsMatchDataNote,
          dataMatchExistingSchoolData: data.dataMatchExistingSchoolData,
          dataMatchExistingNote: data.dataMatchExistingNote,
          recommendationsSupported: data.recommendationsSupported,
          recommendationsToConsider: data.recommendationsToConsider,
          schoolAssessmentWaived: data.schoolAssessmentWaived,
          schoolAssessmentWaivedNote: data.schoolAssessmentWaivedNote,

          // Part IV
          includesDataForIEPContent: data.includesDataForIEPContent,
          iepContentNotes: data.iepContentNotes,
          disabilityConsistentWithCOMAR: data.disabilityConsistentWithCOMAR,
          comarDisabilityNotes: data.comarDisabilityNotes,

          // Additional
          additionalNotes: data.additionalNotes,
          teamMembers: data.teamMembers || [],
        },
      });

      res.status(201).json({
        review: {
          id: review.id,
          studentId: review.studentId,
          assessmentType: review.assessmentType,
          dateOfReport: review.dateOfReport,
          dateOfTeamReview: review.dateOfTeamReview,
          createdAt: review.createdAt,
        },
        message: 'IEP Independent Assessment Review created successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Error creating IEP report:', error);
      res.status(500).json({ error: 'Failed to create IEP report' });
    }
  }
);

// ============================================
// PUT /api/iep-reports/:id
// Update an existing IEP independent assessment review
// ============================================

router.put(
  '/iep-reports/:id',
  requireAuth,
  requireOnboarded,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const data = createReviewSchema.partial().parse(req.body);

      // Get the review and check access
      const existingReview = await prisma.iEPIndependentAssessmentReview.findUnique({
        where: { id },
        include: {
          student: {
            select: { teacherId: true },
          },
        },
      });

      if (!existingReview) {
        return res.status(404).json({ error: 'IEP report not found' });
      }

      // Check if user has access
      const hasAccess = await prisma.studentAccess.findFirst({
        where: {
          userId,
          studentId: existingReview.studentId,
          canEdit: true,
        },
      });

      const isTeacher = existingReview.student.teacherId === userId;
      const isCreator = existingReview.createdById === userId;
      const isAdmin = (req as any).user?.role === 'ADMIN';

      if (!hasAccess && !isTeacher && !isCreator && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update the review
      const review = await prisma.iEPIndependentAssessmentReview.update({
        where: { id },
        data: {
          // Header
          school: data.school,
          grade: data.grade,
          dateOfReport: data.dateOfReport ? new Date(data.dateOfReport) : undefined,
          dateOfTeamReview: data.dateOfTeamReview ? new Date(data.dateOfTeamReview) : undefined,
          assessmentType: data.assessmentType ? ((data.assessmentType === "OTHER" ? "INITIAL" : data.assessmentType) as unknown as AssessmentType) : undefined,
          assessmentTypeOther: data.assessmentTypeOther,
          planInstanceId: data.planInstanceId,

          // Part I
          examinerName: data.examinerName,
          examinerTitle: data.examinerTitle,
          examinerLicensed: data.examinerLicensed,
          examinerLicenseDetails: data.examinerLicenseDetails,
          examinerQualified: data.examinerQualified,
          examinerQualificationNotes: data.examinerQualificationNotes,
          reportWrittenDatedSigned: data.reportWrittenDatedSigned,
          materialsTechnicallySound: data.materialsTechnicallySound,
          materialsFollowedInstructions: data.materialsFollowedInstructions,
          materialsInstructionsNotes: data.materialsInstructionsNotes,
          materialsLanguageAccurate: data.materialsLanguageAccurate,
          materialsLanguageNotes: data.materialsLanguageNotes,
          materialsBiasFree: data.materialsBiasFree,
          materialsBiasNotes: data.materialsBiasNotes,
          materialsValidPurpose: data.materialsValidPurpose,
          materialsValidNotes: data.materialsValidNotes,
          resultsReflectAptitude: data.resultsReflectAptitude,
          resultsReflectAptitudeNA: data.resultsReflectAptitudeNA,
          resultsNotes: data.resultsNotes,

          // Part II
          describesPerformanceAllAreas: data.describesPerformanceAllAreas,
          performanceAreasNotes: data.performanceAreasNotes,
          includesVariedAssessmentData: data.includesVariedAssessmentData,
          assessmentDataNotes: data.assessmentDataNotes,
          includesInstructionalImplications: data.includesInstructionalImplications,
          instructionalNotes: data.instructionalNotes,

          // Part III
          findingsMatchData: data.findingsMatchData,
          findingsMatchDataNote: data.findingsMatchDataNote,
          dataMatchExistingSchoolData: data.dataMatchExistingSchoolData,
          dataMatchExistingNote: data.dataMatchExistingNote,
          recommendationsSupported: data.recommendationsSupported,
          recommendationsToConsider: data.recommendationsToConsider,
          schoolAssessmentWaived: data.schoolAssessmentWaived,
          schoolAssessmentWaivedNote: data.schoolAssessmentWaivedNote,

          // Part IV
          includesDataForIEPContent: data.includesDataForIEPContent,
          iepContentNotes: data.iepContentNotes,
          disabilityConsistentWithCOMAR: data.disabilityConsistentWithCOMAR,
          comarDisabilityNotes: data.comarDisabilityNotes,

          // Additional
          additionalNotes: data.additionalNotes,
          teamMembers: data.teamMembers,
        },
      });

      res.json({
        review: {
          id: review.id,
          studentId: review.studentId,
          assessmentType: review.assessmentType,
          updatedAt: review.updatedAt,
        },
        message: 'IEP Independent Assessment Review updated successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }
      console.error('Error updating IEP report:', error);
      res.status(500).json({ error: 'Failed to update IEP report' });
    }
  }
);

// ============================================
// DELETE /api/iep-reports/:id
// Delete an IEP independent assessment review
// ============================================

router.delete(
  '/iep-reports/:id',
  requireAuth,
  requireOnboarded,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      // Get the review and check access
      const existingReview = await prisma.iEPIndependentAssessmentReview.findUnique({
        where: { id },
        include: {
          student: {
            select: { teacherId: true },
          },
        },
      });

      if (!existingReview) {
        return res.status(404).json({ error: 'IEP report not found' });
      }

      // Check if user has permission to delete
      const isTeacher = existingReview.student.teacherId === userId;
      const isCreator = existingReview.createdById === userId;
      const isAdmin = (req as any).user?.role === 'ADMIN';

      if (!isTeacher && !isCreator && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.iEPIndependentAssessmentReview.delete({
        where: { id },
      });

      res.json({ message: 'IEP Independent Assessment Review deleted successfully' });
    } catch (error) {
      console.error('Error deleting IEP report:', error);
      res.status(500).json({ error: 'Failed to delete IEP report' });
    }
  }
);

export default router;

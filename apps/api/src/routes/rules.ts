/**
 * Rules Context API
 * Provides resolved rule metadata for GPT and UI consumption
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { RulePlanType } from '../types/prisma-enums.js';
import {
  getActiveRulePack,
  calculateDueDates,
  ResolvedRulePack,
} from '../services/rulesEvaluator.js';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const RulesContextQuerySchema = z.object({
  studentId: z.string().uuid(),
  planType: z.nativeEnum(RulePlanType),
  meetingType: z.string().optional(),
  scheduledAt: z.string().optional().transform((s) => s ? new Date(s) : undefined),
});

// ============================================
// TYPES
// ============================================

interface RuleContextResponse {
  resolved: boolean;
  rulePack: {
    id: string;
    name: string;
    version: number;
    scopeType: string;
    scopeId: string;
    planType: string;
  } | null;
  precedence: {
    searched: { scopeType: string; scopeId: string }[];
    matched: { scopeType: string; scopeId: string } | null;
  };
  gates: {
    key: string;
    name: string;
    enabled: boolean;
    config: Record<string, unknown> | null;
    description: string;
  }[];
  deadlines: {
    preMeetingDocs: {
      standardDeadline: string | null;
      usMailDeadline: string | null;
      businessDays: number;
    };
    postMeetingDocs: {
      standardDeadline: string | null;
      usMailDeadline: string | null;
      businessDays: number;
    };
  } | null;
  evidenceRequirements: {
    key: string;
    name: string;
    isRequired: boolean;
    linkedRule: string;
  }[];
  meetingType: {
    code: string;
    name: string;
    description: string | null;
  } | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

function getRuleDescription(key: string): string {
  const descriptions: Record<string, string> = {
    PRE_MEETING_DOCS_DAYS: 'Requires draft documents to be delivered to parents before the meeting',
    POST_MEETING_DOCS_DAYS: 'Requires final documents to be delivered to parents after the meeting',
    DEFAULT_DELIVERY_METHOD: 'Sets the default method for document delivery to parents',
    US_MAIL_PRE_MEETING_DAYS: 'Additional days when using US Mail for pre-meeting documents',
    US_MAIL_POST_MEETING_DAYS: 'Additional days when using US Mail for post-meeting documents',
    CONFERENCE_NOTES_REQUIRED: 'Requires conference notes before meeting can be closed',
    INITIAL_IEP_CONSENT_GATE: 'Blocks initial IEP implementation until parent consent is obtained',
    CONTINUED_MEETING_NOTICE_DAYS: 'Minimum notice days for continued meetings; waiver required if less',
    CONTINUED_MEETING_MUTUAL_AGREEMENT: 'Requires mutual agreement for continued meeting dates',
    AUDIO_RECORDING_RULE: 'Policy for audio recording during meetings',
  };
  return descriptions[key] || 'No description available';
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/rules/context
 * Get resolved rule context for a student and plan type
 *
 * Returns rule metadata for GPT and UI consumption including:
 * - Active rule pack with precedence info
 * - Gates (consent, conference notes, etc.)
 * - Computed deadlines based on scheduled meeting date
 * - Evidence requirements
 */
router.get('/context', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const parsed = RulesContextQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.errors,
      });
    }

    const { studentId, planType, meetingType, scheduledAt } = parsed.data;

    // Fetch student to get scope information
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: {
          include: {
            district: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Build precedence search order
    const precedenceSearched: { scopeType: string; scopeId: string }[] = [];

    if (student.school) {
      precedenceSearched.push({ scopeType: 'SCHOOL', scopeId: student.school.id });
      if (student.school.district) {
        precedenceSearched.push({ scopeType: 'DISTRICT', scopeId: student.school.district.id });
        precedenceSearched.push({ scopeType: 'STATE', scopeId: student.school.district.stateCode });
      }
    }

    // Get active rule pack with precedence resolution
    let rulePack: ResolvedRulePack | null = null;
    let matchedScope: { scopeType: string; scopeId: string } | null = null;

    for (const scope of precedenceSearched) {
      rulePack = await getActiveRulePack(scope.scopeType, scope.scopeId, planType);
      if (rulePack) {
        matchedScope = scope;
        break;
      }
    }

    // Get meeting type info if specified
    let meetingTypeInfo: { code: string; name: string; description: string | null } | null = null;
    if (meetingType) {
      const mt = await prisma.meetingType.findFirst({
        where: { code: meetingType as 'INITIAL' | 'ANNUAL' | 'REVIEW' | 'AMENDMENT' | 'CONTINUED' },
      });
      if (mt) {
        meetingTypeInfo = {
          code: mt.code,
          name: mt.name,
          description: mt.description,
        };
      }
    }

    // Build response
    const response: RuleContextResponse = {
      resolved: !!rulePack,
      rulePack: rulePack ? {
        id: rulePack.id,
        name: rulePack.name,
        version: rulePack.version,
        scopeType: rulePack.scopeType,
        scopeId: rulePack.scopeId,
        planType: planType,
      } : null,
      precedence: {
        searched: precedenceSearched,
        matched: matchedScope,
      },
      gates: [],
      deadlines: null,
      evidenceRequirements: [],
      meetingType: meetingTypeInfo,
    };

    if (rulePack) {
      // Build gates list
      const gateRules = [
        'CONFERENCE_NOTES_REQUIRED',
        'INITIAL_IEP_CONSENT_GATE',
        'CONTINUED_MEETING_NOTICE_DAYS',
        'CONTINUED_MEETING_MUTUAL_AGREEMENT',
        'AUDIO_RECORDING_RULE',
      ];

      for (const key of gateRules) {
        const rule = rulePack.rules.get(key);
        if (rule) {
          response.gates.push({
            key,
            name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
            enabled: rule.isEnabled,
            config: rule.config,
            description: getRuleDescription(key),
          });
        }
      }

      // Calculate deadlines if scheduledAt is provided
      if (scheduledAt) {
        const dueDates = calculateDueDates(scheduledAt, rulePack);

        const preDocsRule = rulePack.rules.get('PRE_MEETING_DOCS_DAYS');
        const postDocsRule = rulePack.rules.get('POST_MEETING_DOCS_DAYS');

        response.deadlines = {
          preMeetingDocs: {
            standardDeadline: formatDate(dueDates.preDocsDeadline),
            usMailDeadline: formatDate(dueDates.usMailPreDocsDeadline),
            businessDays: (preDocsRule?.config as Record<string, unknown>)?.days as number || 5,
          },
          postMeetingDocs: {
            standardDeadline: formatDate(dueDates.postDocsDeadline),
            usMailDeadline: formatDate(dueDates.usMailPostDocsDeadline),
            businessDays: (postDocsRule?.config as Record<string, unknown>)?.days as number || 5,
          },
        };
      }

      // Build evidence requirements
      const evidenceTypeMap = new Map<string, string>();
      const evidenceTypes = await prisma.ruleEvidenceType.findMany();
      for (const et of evidenceTypes) {
        evidenceTypeMap.set(et.id, et.key);
      }

      for (const [ruleKey, reqs] of rulePack.evidenceRequirements) {
        for (const req of reqs) {
          const evidenceKey = evidenceTypeMap.get(req.evidenceTypeId);
          if (evidenceKey) {
            const evidenceType = evidenceTypes.find(e => e.id === req.evidenceTypeId);
            response.evidenceRequirements.push({
              key: evidenceKey,
              name: evidenceType?.name || evidenceKey,
              isRequired: req.isRequired,
              linkedRule: ruleKey,
            });
          }
        }
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error getting rules context:', error);
    res.status(500).json({ error: 'Failed to get rules context' });
  }
});

/**
 * GET /api/rules/defaults
 * Get system default rule configuration
 */
router.get('/defaults', requireAuth, async (_req: Request, res: Response) => {
  try {
    const defaults = {
      PRE_MEETING_DOCS_DAYS: { days: 5 },
      POST_MEETING_DOCS_DAYS: { days: 5 },
      DEFAULT_DELIVERY_METHOD: { method: 'SEND_HOME' },
      US_MAIL_PRE_MEETING_DAYS: { days: 3 },
      US_MAIL_POST_MEETING_DAYS: { days: 3 },
      CONFERENCE_NOTES_REQUIRED: { required: true },
      INITIAL_IEP_CONSENT_GATE: { enabled: true },
      CONTINUED_MEETING_NOTICE_DAYS: { days: 10 },
      CONTINUED_MEETING_MUTUAL_AGREEMENT: { required: true },
      AUDIO_RECORDING_RULE: { staffMustRecordIfParentRecords: true, markAsNotOfficialRecord: true },
    };

    res.json({ defaults });
  } catch (error) {
    console.error('Error getting rule defaults:', error);
    res.status(500).json({ error: 'Failed to get rule defaults' });
  }
});

export default router;

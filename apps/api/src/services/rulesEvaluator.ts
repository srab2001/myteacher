/**
 * Rules Evaluator Service
 * Evaluates compliance rules for meetings and provides enforcement logic
 */

import { prisma } from '../lib/db.js';
import { RulePlanType, MeetingStatus, ParentDeliveryMethod } from '../types/prisma-enums.js';

// Rule configuration types
export interface PreMeetingDocsConfig {
  days: number;
}

export interface PostMeetingDocsConfig {
  days: number;
}

export interface DeliveryMethodConfig {
  method: ParentDeliveryMethod;
}

export interface USMailOffsetConfig {
  days: number;
}

export interface ConferenceNotesConfig {
  required: boolean;
}

export interface InitialConsentConfig {
  enabled: boolean;
}

export interface ContinuedMeetingConfig {
  days: number;
}

export interface MutualAgreementConfig {
  required: boolean;
}

export interface AudioRecordingConfig {
  staffMustRecordIfParentRecords: boolean;
  markAsNotOfficialRecord: boolean;
}

export interface RuleConfig {
  PRE_MEETING_DOCS_DAYS?: PreMeetingDocsConfig;
  POST_MEETING_DOCS_DAYS?: PostMeetingDocsConfig;
  DEFAULT_DELIVERY_METHOD?: DeliveryMethodConfig;
  US_MAIL_PRE_MEETING_DAYS?: USMailOffsetConfig;
  US_MAIL_POST_MEETING_DAYS?: USMailOffsetConfig;
  CONFERENCE_NOTES_REQUIRED?: ConferenceNotesConfig;
  INITIAL_IEP_CONSENT_GATE?: InitialConsentConfig;
  CONTINUED_MEETING_NOTICE_DAYS?: ContinuedMeetingConfig;
  CONTINUED_MEETING_MUTUAL_AGREEMENT?: MutualAgreementConfig;
  AUDIO_RECORDING_RULE?: AudioRecordingConfig;
}

export interface ResolvedRulePack {
  id: string;
  name: string;
  version: number;
  scopeType: string;
  scopeId: string;
  rules: Map<string, { config: Record<string, unknown> | null; isEnabled: boolean }>;
  evidenceRequirements: Map<string, { evidenceTypeId: string; isRequired: boolean }[]>;
}

export interface EnforcementResult {
  canClose: boolean;
  canImplement: boolean;
  errors: EnforcementError[];
  warnings: EnforcementWarning[];
  requiredEvidence: RequiredEvidenceItem[];
  dueDates: DueDates;
}

export interface EnforcementError {
  code: string;
  message: string;
  ruleKey: string;
}

export interface EnforcementWarning {
  code: string;
  message: string;
  ruleKey: string;
}

export interface RequiredEvidenceItem {
  evidenceTypeKey: string;
  evidenceTypeName: string;
  isRequired: boolean;
  isProvided: boolean;
  ruleKey: string;
}

export interface DueDates {
  preDocsDeadline: Date | null;
  postDocsDeadline: Date | null;
  usMailPreDocsDeadline: Date | null;
  usMailPostDocsDeadline: Date | null;
}

/**
 * Get the active rule pack for a given scope and plan type
 * Falls back through scope hierarchy: SCHOOL -> DISTRICT -> STATE
 */
export async function getActiveRulePack(
  scopeType: string,
  scopeId: string,
  planType: RulePlanType
): Promise<ResolvedRulePack | null> {
  // Build fallback hierarchy
  const scopes: { scopeType: string; scopeId: string }[] = [];

  if (scopeType === 'SCHOOL') {
    scopes.push({ scopeType: 'SCHOOL', scopeId });
    // Extract district from scopeId if possible (assuming format like "SCHOOL-DISTRICT-ID")
    // For now, just try the direct district
    scopes.push({ scopeType: 'DISTRICT', scopeId });
  }
  if (scopeType === 'SCHOOL' || scopeType === 'DISTRICT') {
    scopes.push({ scopeType: 'DISTRICT', scopeId });
  }
  // State level - extract state code (first 2 chars)
  const stateCode = scopeId.substring(0, 2).toUpperCase();
  scopes.push({ scopeType: 'STATE', scopeId: stateCode });

  // Search for matching rule pack
  for (const scope of scopes) {
    const rulePack = await prisma.rulePack.findFirst({
      where: {
        scopeType: scope.scopeType as 'STATE' | 'DISTRICT' | 'SCHOOL',
        scopeId: scope.scopeId,
        AND: [
          {
            OR: [
              { planType: planType },
              { planType: 'ALL' },
            ],
          },
          {
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: new Date() } },
            ],
          },
        ],
        isActive: true,
        effectiveFrom: { lte: new Date() },
      },
      include: {
        rules: {
          where: { isEnabled: true },
          include: {
            ruleDefinition: true,
            evidenceRequirements: {
              include: {
                evidenceType: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { version: 'desc' },
    });

    if (rulePack) {
      // Convert to resolved format
      const rules = new Map<string, { config: Record<string, unknown> | null; isEnabled: boolean }>();
      const evidenceRequirements = new Map<string, { evidenceTypeId: string; isRequired: boolean }[]>();

      for (const rule of rulePack.rules) {
        rules.set(rule.ruleDefinition.key, {
          config: rule.config as Record<string, unknown> | null,
          isEnabled: rule.isEnabled,
        });

        if (rule.evidenceRequirements.length > 0) {
          evidenceRequirements.set(
            rule.ruleDefinition.key,
            rule.evidenceRequirements.map((er) => ({
              evidenceTypeId: er.evidenceType.id,
              isRequired: er.isRequired,
            }))
          );
        }
      }

      return {
        id: rulePack.id,
        name: rulePack.name,
        version: rulePack.version,
        scopeType: rulePack.scopeType,
        scopeId: rulePack.scopeId,
        rules,
        evidenceRequirements,
      };
    }
  }

  return null;
}

/**
 * Calculate business days from a date
 */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  const direction = days >= 0 ? 1 : -1;
  const absDays = Math.abs(days);

  while (added < absDays) {
    result.setDate(result.getDate() + direction);
    const dayOfWeek = result.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }

  return result;
}

/**
 * Calculate due dates based on meeting date and rules
 */
export function calculateDueDates(
  meetingDate: Date,
  rulePack: ResolvedRulePack | null
): DueDates {
  const dueDates: DueDates = {
    preDocsDeadline: null,
    postDocsDeadline: null,
    usMailPreDocsDeadline: null,
    usMailPostDocsDeadline: null,
  };

  if (!rulePack) return dueDates;

  // Pre-meeting docs deadline
  const preDaysRule = rulePack.rules.get('PRE_MEETING_DOCS_DAYS');
  if (preDaysRule?.isEnabled && preDaysRule.config) {
    const days = (preDaysRule.config as unknown as PreMeetingDocsConfig).days || 5;
    dueDates.preDocsDeadline = addBusinessDays(meetingDate, -days);
  }

  // Post-meeting docs deadline
  const postDaysRule = rulePack.rules.get('POST_MEETING_DOCS_DAYS');
  if (postDaysRule?.isEnabled && postDaysRule.config) {
    const days = (postDaysRule.config as unknown as PostMeetingDocsConfig).days || 5;
    dueDates.postDocsDeadline = addBusinessDays(meetingDate, days);
  }

  // US Mail offsets
  const usMailPreRule = rulePack.rules.get('US_MAIL_PRE_MEETING_DAYS');
  if (usMailPreRule?.isEnabled && usMailPreRule.config && dueDates.preDocsDeadline) {
    const extraDays = (usMailPreRule.config as unknown as USMailOffsetConfig).days || 3;
    dueDates.usMailPreDocsDeadline = addBusinessDays(dueDates.preDocsDeadline, -extraDays);
  }

  const usMailPostRule = rulePack.rules.get('US_MAIL_POST_MEETING_DAYS');
  if (usMailPostRule?.isEnabled && usMailPostRule.config && dueDates.postDocsDeadline) {
    const extraDays = (usMailPostRule.config as unknown as USMailOffsetConfig).days || 3;
    dueDates.usMailPostDocsDeadline = addBusinessDays(dueDates.postDocsDeadline, -extraDays);
  }

  return dueDates;
}

/**
 * Evaluate enforcement rules for a meeting
 */
export async function evaluateMeetingEnforcement(
  meetingId: string,
  rulePack: ResolvedRulePack | null
): Promise<EnforcementResult> {
  const result: EnforcementResult = {
    canClose: true,
    canImplement: true,
    errors: [],
    warnings: [],
    requiredEvidence: [],
    dueDates: {
      preDocsDeadline: null,
      postDocsDeadline: null,
      usMailPreDocsDeadline: null,
      usMailPostDocsDeadline: null,
    },
  };

  // Fetch meeting with evidence
  const meeting = await prisma.planMeeting.findUnique({
    where: { id: meetingId },
    include: {
      meetingType: true,
      evidence: {
        include: {
          evidenceType: true,
        },
      },
    },
  });

  if (!meeting) {
    result.canClose = false;
    result.canImplement = false;
    result.errors.push({
      code: 'MEETING_NOT_FOUND',
      message: 'Meeting not found',
      ruleKey: '',
    });
    return result;
  }

  // Calculate due dates
  result.dueDates = calculateDueDates(meeting.scheduledAt, rulePack);

  if (!rulePack) {
    result.warnings.push({
      code: 'NO_RULE_PACK',
      message: 'No active rule pack found for this scope and plan type',
      ruleKey: '',
    });
    return result;
  }

  // Get evidence type mappings
  const evidenceTypes = await prisma.ruleEvidenceType.findMany();
  const evidenceTypeMap = new Map(evidenceTypes.map((et) => [et.key, et]));

  // Track provided evidence
  const providedEvidence = new Set(meeting.evidence.map((e) => e.evidenceType.key));

  // 1. Conference Notes Requirement
  const conferenceNotesRule = rulePack.rules.get('CONFERENCE_NOTES_REQUIRED');
  if (conferenceNotesRule?.isEnabled) {
    const config = conferenceNotesRule.config as unknown as ConferenceNotesConfig | null;
    if (config?.required) {
      const evidenceType = evidenceTypeMap.get('CONFERENCE_NOTES');
      const isProvided = providedEvidence.has('CONFERENCE_NOTES');

      result.requiredEvidence.push({
        evidenceTypeKey: 'CONFERENCE_NOTES',
        evidenceTypeName: evidenceType?.name || 'Conference Notes',
        isRequired: true,
        isProvided,
        ruleKey: 'CONFERENCE_NOTES_REQUIRED',
      });

      if (!isProvided) {
        result.canClose = false;
        result.errors.push({
          code: 'MISSING_CONFERENCE_NOTES',
          message: 'Conference notes are required before closing this meeting',
          ruleKey: 'CONFERENCE_NOTES_REQUIRED',
        });
      }
    }
  }

  // 2. Initial IEP Consent Gate
  const consentGateRule = rulePack.rules.get('INITIAL_IEP_CONSENT_GATE');
  if (consentGateRule?.isEnabled && meeting.meetingType.code === 'INITIAL') {
    const config = consentGateRule.config as unknown as InitialConsentConfig | null;
    if (config?.enabled) {
      const evidenceType = evidenceTypeMap.get('CONSENT_FORM');
      const isProvided = providedEvidence.has('CONSENT_FORM') || meeting.consentStatus === 'OBTAINED';

      result.requiredEvidence.push({
        evidenceTypeKey: 'CONSENT_FORM',
        evidenceTypeName: evidenceType?.name || 'Parent Consent Form',
        isRequired: true,
        isProvided,
        ruleKey: 'INITIAL_IEP_CONSENT_GATE',
      });

      if (!isProvided) {
        result.canImplement = false;
        result.errors.push({
          code: 'MISSING_CONSENT',
          message: 'Parent consent is required before implementing an initial IEP',
          ruleKey: 'INITIAL_IEP_CONSENT_GATE',
        });
      }
    }
  }

  // 3. Continued Meeting Waiver
  if (meeting.isContinued) {
    const continuedRule = rulePack.rules.get('CONTINUED_MEETING_NOTICE_DAYS');
    if (continuedRule?.isEnabled) {
      const config = continuedRule.config as unknown as ContinuedMeetingConfig | null;
      const noticeDays = config?.days || 10;

      // Check if continued meeting was scheduled with sufficient notice
      if (meeting.continuedFromMeetingId) {
        const originalMeeting = await prisma.planMeeting.findUnique({
          where: { id: meeting.continuedFromMeetingId },
        });

        if (originalMeeting) {
          const daysBetween = Math.floor(
            (meeting.scheduledAt.getTime() - originalMeeting.scheduledAt.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysBetween < noticeDays) {
            const evidenceType = evidenceTypeMap.get('NOTICE_WAIVER');
            const isProvided = providedEvidence.has('NOTICE_WAIVER') || meeting.noticeWaiverSigned;

            result.requiredEvidence.push({
              evidenceTypeKey: 'NOTICE_WAIVER',
              evidenceTypeName: evidenceType?.name || 'Notice Waiver',
              isRequired: true,
              isProvided: !!isProvided,
              ruleKey: 'CONTINUED_MEETING_NOTICE_DAYS',
            });

            if (!isProvided) {
              result.canClose = false;
              result.errors.push({
                code: 'MISSING_NOTICE_WAIVER',
                message: `Continued meeting scheduled with less than ${noticeDays} days notice requires a waiver`,
                ruleKey: 'CONTINUED_MEETING_NOTICE_DAYS',
              });
            }
          }
        }
      }

      // Check mutual agreement requirement
      const mutualAgreementRule = rulePack.rules.get('CONTINUED_MEETING_MUTUAL_AGREEMENT');
      if (mutualAgreementRule?.isEnabled) {
        const maConfig = mutualAgreementRule.config as unknown as MutualAgreementConfig | null;
        if (maConfig?.required && meeting.mutualAgreementForContinuedDate === null) {
          result.canClose = false;
          result.errors.push({
            code: 'MISSING_MUTUAL_AGREEMENT',
            message: 'Mutual agreement for continued meeting date must be recorded',
            ruleKey: 'CONTINUED_MEETING_MUTUAL_AGREEMENT',
          });
        }
      }
    }
  }

  // 4. Audio Recording Rule
  const recordingRule = rulePack.rules.get('AUDIO_RECORDING_RULE');
  if (recordingRule?.isEnabled) {
    const config = recordingRule.config as unknown as AudioRecordingConfig | null;
    if (config?.staffMustRecordIfParentRecords && meeting.parentRecording === true) {
      if (!meeting.staffRecording) {
        result.canClose = false;
        result.errors.push({
          code: 'STAFF_RECORDING_REQUIRED',
          message: 'Staff recording is required when parent is recording',
          ruleKey: 'AUDIO_RECORDING_RULE',
        });
      }

      const evidenceType = evidenceTypeMap.get('RECORDING_ACK');
      const isProvided = providedEvidence.has('RECORDING_ACK');

      result.requiredEvidence.push({
        evidenceTypeKey: 'RECORDING_ACK',
        evidenceTypeName: evidenceType?.name || 'Recording Acknowledgment',
        isRequired: true,
        isProvided,
        ruleKey: 'AUDIO_RECORDING_RULE',
      });

      if (!isProvided) {
        result.canClose = false;
        result.errors.push({
          code: 'MISSING_RECORDING_ACK',
          message: 'Recording acknowledgment is required when recording occurs',
          ruleKey: 'AUDIO_RECORDING_RULE',
        });
      }
    }
  }

  // 5. Document Delivery Evidence
  const preDocsRule = rulePack.rules.get('PRE_MEETING_DOCS_DAYS');
  if (preDocsRule?.isEnabled) {
    const evidenceType = evidenceTypeMap.get('PARENT_DOCS_SENT');
    const isProvided = providedEvidence.has('PARENT_DOCS_SENT') || meeting.preDocsDeliveredAt !== null;

    result.requiredEvidence.push({
      evidenceTypeKey: 'PARENT_DOCS_SENT',
      evidenceTypeName: evidenceType?.name || 'Pre-Meeting Documents Sent',
      isRequired: true,
      isProvided: !!isProvided,
      ruleKey: 'PRE_MEETING_DOCS_DAYS',
    });

    if (!isProvided) {
      result.warnings.push({
        code: 'PRE_DOCS_NOT_SENT',
        message: 'Pre-meeting documents have not been marked as sent',
        ruleKey: 'PRE_MEETING_DOCS_DAYS',
      });
    }
  }

  const postDocsRule = rulePack.rules.get('POST_MEETING_DOCS_DAYS');
  if (postDocsRule?.isEnabled && meeting.status === 'HELD') {
    const evidenceType = evidenceTypeMap.get('FINAL_DOC_SENT');
    const isProvided = providedEvidence.has('FINAL_DOC_SENT') || meeting.postDocsDeliveredAt !== null;

    result.requiredEvidence.push({
      evidenceTypeKey: 'FINAL_DOC_SENT',
      evidenceTypeName: evidenceType?.name || 'Final Document Sent',
      isRequired: true,
      isProvided: !!isProvided,
      ruleKey: 'POST_MEETING_DOCS_DAYS',
    });

    if (!isProvided) {
      result.warnings.push({
        code: 'POST_DOCS_NOT_SENT',
        message: 'Post-meeting documents have not been marked as sent',
        ruleKey: 'POST_MEETING_DOCS_DAYS',
      });
    }
  }

  return result;
}

/**
 * Check if a meeting can be closed based on rules
 */
export async function canCloseMeeting(
  meetingId: string,
  scopeType: string,
  scopeId: string,
  planType: RulePlanType
): Promise<{ allowed: boolean; errors: EnforcementError[] }> {
  const rulePack = await getActiveRulePack(scopeType, scopeId, planType);
  const enforcement = await evaluateMeetingEnforcement(meetingId, rulePack);

  return {
    allowed: enforcement.canClose,
    errors: enforcement.errors,
  };
}

/**
 * Check if a plan can be implemented (for initial IEP consent gate)
 */
export async function canImplementPlan(
  meetingId: string,
  scopeType: string,
  scopeId: string,
  planType: RulePlanType
): Promise<{ allowed: boolean; errors: EnforcementError[] }> {
  const rulePack = await getActiveRulePack(scopeType, scopeId, planType);
  const enforcement = await evaluateMeetingEnforcement(meetingId, rulePack);

  return {
    allowed: enforcement.canImplement,
    errors: enforcement.errors.filter((e) => e.ruleKey === 'INITIAL_IEP_CONSENT_GATE'),
  };
}

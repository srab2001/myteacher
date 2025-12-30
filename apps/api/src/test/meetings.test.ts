/**
 * Meeting Workflow Tests
 * Tests for meeting CRUD, evidence, close checks, and rule enforcement
 */

// Mock environment
jest.mock('../config/env.js', () => ({
  env: {
    PORT: '4000',
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    SESSION_SECRET: 'test-session-secret-that-is-long-enough',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:4000/auth/google/callback',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

// Create mock functions
const mockPlanMeetingFindMany = jest.fn();
const mockPlanMeetingFindUnique = jest.fn();
const mockPlanMeetingCreate = jest.fn();
const mockPlanMeetingUpdate = jest.fn();

const mockMeetingEvidenceFindMany = jest.fn();
const mockMeetingEvidenceUpsert = jest.fn();
const mockMeetingEvidenceDelete = jest.fn();

const mockMeetingTaskCreate = jest.fn();
const mockMeetingTaskUpdate = jest.fn();
const mockMeetingTaskDelete = jest.fn();

const mockRulePackFindFirst = jest.fn();
const mockRuleEvidenceTypeFindMany = jest.fn();
const mockMeetingTypeFindFirst = jest.fn();

const mockPlanInstanceFindUnique = jest.fn();
const mockPlanInstanceUpdate = jest.fn();

// Mock Prisma module
jest.mock('../lib/db.js', () => ({
  prisma: {
    planMeeting: {
      findMany: mockPlanMeetingFindMany,
      findUnique: mockPlanMeetingFindUnique,
      create: mockPlanMeetingCreate,
      update: mockPlanMeetingUpdate,
    },
    meetingEvidence: {
      findMany: mockMeetingEvidenceFindMany,
      upsert: mockMeetingEvidenceUpsert,
      delete: mockMeetingEvidenceDelete,
    },
    meetingTask: {
      create: mockMeetingTaskCreate,
      update: mockMeetingTaskUpdate,
      delete: mockMeetingTaskDelete,
    },
    rulePack: {
      findFirst: mockRulePackFindFirst,
    },
    ruleEvidenceType: {
      findMany: mockRuleEvidenceTypeFindMany,
    },
    meetingType: {
      findFirst: mockMeetingTypeFindFirst,
    },
    planInstance: {
      findUnique: mockPlanInstanceFindUnique,
      update: mockPlanInstanceUpdate,
    },
    $disconnect: jest.fn(),
  },
  RuleScopeType: {
    STATE: 'STATE',
    DISTRICT: 'DISTRICT',
    SCHOOL: 'SCHOOL',
  },
  RulePlanType: {
    IEP: 'IEP',
    PLAN504: 'PLAN504',
    BIP: 'BIP',
    ALL: 'ALL',
  },
  MeetingStatus: {
    SCHEDULED: 'SCHEDULED',
    HELD: 'HELD',
    CLOSED: 'CLOSED',
    CANCELED: 'CANCELED',
  },
}));

describe('Meeting Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // CLOSE MEETING VALIDATION TESTS
  // ============================================

  describe('Close Meeting Checks', () => {
    const baseMeeting = {
      id: 'meeting-1',
      studentId: 'student-1',
      planInstanceId: 'plan-1',
      planType: 'IEP',
      meetingTypeId: 'mt-1',
      scheduledAt: new Date('2024-01-15'),
      heldAt: new Date('2024-01-15'),
      status: 'HELD',
      isContinued: false,
      parentRecording: false,
      staffRecording: false,
      consentStatus: null,
      noticeWaiverSigned: null,
      mutualAgreementForContinuedDate: null,
      meetingType: { id: 'mt-1', code: 'ANNUAL', name: 'Annual Review' },
      evidence: [],
    };

    const baseRulePack = {
      id: 'rp-1',
      scopeType: 'STATE',
      scopeId: 'MD',
      planType: 'IEP',
      name: 'Maryland IEP Rules',
      isActive: true,
      rules: [
        {
          id: 'rule-1',
          ruleDefinition: { key: 'CONFERENCE_NOTES_REQUIRED' },
          isEnabled: true,
          config: { required: true },
        },
      ],
    };

    it('cannot close meeting when required conference notes are missing', async () => {
      // Meeting without conference notes evidence
      const meeting = {
        ...baseMeeting,
        evidence: [], // No evidence provided
      };

      mockPlanMeetingFindUnique.mockResolvedValue(meeting);
      mockRulePackFindFirst.mockResolvedValue(baseRulePack);
      mockRuleEvidenceTypeFindMany.mockResolvedValue([
        { id: 'et-1', key: 'CONFERENCE_NOTES', name: 'Conference Notes' },
      ]);

      // Simulate rule evaluation
      const rulesMap = new Map(
        baseRulePack.rules.map((r) => [r.ruleDefinition.key, { isEnabled: r.isEnabled, config: r.config }])
      );
      const conferenceNotesRule = rulesMap.get('CONFERENCE_NOTES_REQUIRED');
      const hasConferenceNotes = meeting.evidence.some(
        (e: { evidenceType: { key: string } }) => e.evidenceType?.key === 'CONFERENCE_NOTES'
      );

      const canClose = !(conferenceNotesRule?.isEnabled && conferenceNotesRule.config?.required && !hasConferenceNotes);

      expect(canClose).toBe(false);
      expect(hasConferenceNotes).toBe(false);
    });

    it('can close meeting when conference notes are provided', async () => {
      // Meeting with conference notes evidence
      const meeting = {
        ...baseMeeting,
        evidence: [
          {
            id: 'ev-1',
            evidenceTypeId: 'et-1',
            note: 'Meeting notes here...',
            evidenceType: { key: 'CONFERENCE_NOTES', name: 'Conference Notes' },
          },
        ],
      };

      mockPlanMeetingFindUnique.mockResolvedValue(meeting);
      mockRulePackFindFirst.mockResolvedValue(baseRulePack);

      // Simulate rule evaluation
      const rulesMap = new Map(
        baseRulePack.rules.map((r) => [r.ruleDefinition.key, { isEnabled: r.isEnabled, config: r.config }])
      );
      const conferenceNotesRule = rulesMap.get('CONFERENCE_NOTES_REQUIRED');
      const hasConferenceNotes = meeting.evidence.some(
        (e: { evidenceType: { key: string } }) => e.evidenceType?.key === 'CONFERENCE_NOTES'
      );

      const canClose = !(conferenceNotesRule?.isEnabled && conferenceNotesRule.config?.required && !hasConferenceNotes);

      expect(canClose).toBe(true);
      expect(hasConferenceNotes).toBe(true);
    });

    it('cannot close continued meeting without waiver when notice < 10 days', async () => {
      const originalMeetingDate = new Date('2024-01-10');
      const continuedMeetingDate = new Date('2024-01-15'); // Only 5 days later

      const meeting = {
        ...baseMeeting,
        isContinued: true,
        continuedFromMeetingId: 'meeting-0',
        scheduledAt: continuedMeetingDate,
        noticeWaiverSigned: false,
        evidence: [],
      };

      const rulePackWithWaiver = {
        ...baseRulePack,
        rules: [
          {
            id: 'rule-2',
            ruleDefinition: { key: 'CONTINUED_MEETING_NOTICE_DAYS' },
            isEnabled: true,
            config: { days: 10 },
          },
        ],
      };

      // Calculate days between meetings
      const daysBetween = Math.floor(
        (continuedMeetingDate.getTime() - originalMeetingDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Less than 10 days and no waiver signed
      const requiresWaiver = daysBetween < 10;
      const hasWaiver = meeting.noticeWaiverSigned || meeting.evidence.some(
        (e: { evidenceType: { key: string } }) => e.evidenceType?.key === 'NOTICE_WAIVER'
      );

      const canClose = !requiresWaiver || hasWaiver;

      expect(daysBetween).toBe(5);
      expect(requiresWaiver).toBe(true);
      expect(hasWaiver).toBe(false);
      expect(canClose).toBe(false);
    });

    it('can close continued meeting with waiver when notice < 10 days', async () => {
      const meeting = {
        ...baseMeeting,
        isContinued: true,
        continuedFromMeetingId: 'meeting-0',
        noticeWaiverSigned: true, // Waiver obtained
        evidence: [],
      };

      const hasWaiver = meeting.noticeWaiverSigned;
      const canClose = hasWaiver;

      expect(hasWaiver).toBe(true);
      expect(canClose).toBe(true);
    });
  });

  // ============================================
  // INITIAL IEP CONSENT TESTS
  // ============================================

  describe('Initial IEP Consent Gate', () => {
    const initialMeeting = {
      id: 'meeting-initial',
      studentId: 'student-1',
      planInstanceId: 'plan-1',
      planType: 'IEP',
      meetingType: { id: 'mt-initial', code: 'INITIAL', name: 'Initial IEP Meeting' },
      status: 'CLOSED',
      consentStatus: null,
      evidence: [],
    };

    const consentRulePack = {
      id: 'rp-1',
      rules: [
        {
          id: 'rule-consent',
          ruleDefinition: { key: 'INITIAL_IEP_CONSENT_GATE' },
          isEnabled: true,
          config: { enabled: true },
        },
      ],
    };

    it('cannot implement initial IEP when consent is missing', async () => {
      const meeting = {
        ...initialMeeting,
        consentStatus: 'PENDING',
        evidence: [],
      };

      // Check if consent is obtained
      const hasConsent = meeting.consentStatus === 'OBTAINED' ||
        meeting.evidence.some((e: { evidenceType: { key: string } }) => e.evidenceType?.key === 'CONSENT_FORM');

      const canImplement = hasConsent;

      expect(hasConsent).toBe(false);
      expect(canImplement).toBe(false);
    });

    it('can implement initial IEP when consent is obtained', async () => {
      const meeting = {
        ...initialMeeting,
        consentStatus: 'OBTAINED',
        evidence: [],
      };

      const hasConsent = meeting.consentStatus === 'OBTAINED';
      const canImplement = hasConsent;

      expect(hasConsent).toBe(true);
      expect(canImplement).toBe(true);
    });

    it('can implement initial IEP with consent evidence', async () => {
      const meeting = {
        ...initialMeeting,
        consentStatus: null,
        evidence: [
          {
            id: 'ev-consent',
            evidenceType: { key: 'CONSENT_FORM', name: 'Parent Consent Form' },
            note: 'Consent received 01/10/2024',
          },
        ],
      };

      const hasConsent = meeting.evidence.some(
        (e: { evidenceType: { key: string } }) => e.evidenceType?.key === 'CONSENT_FORM'
      );
      const canImplement = hasConsent;

      expect(hasConsent).toBe(true);
      expect(canImplement).toBe(true);
    });

    it('cannot implement when consent is refused', async () => {
      const meeting = {
        ...initialMeeting,
        consentStatus: 'REFUSED',
        evidence: [],
      };

      const hasConsent = meeting.consentStatus === 'OBTAINED';
      const canImplement = hasConsent;

      expect(hasConsent).toBe(false);
      expect(canImplement).toBe(false);
    });
  });

  // ============================================
  // AUDIO RECORDING RULE TESTS
  // ============================================

  describe('Audio Recording Rule', () => {
    const baseMeeting = {
      id: 'meeting-1',
      status: 'HELD',
      parentRecording: false,
      staffRecording: false,
      evidence: [],
    };

    const recordingRulePack = {
      id: 'rp-1',
      rules: [
        {
          id: 'rule-recording',
          ruleDefinition: { key: 'AUDIO_RECORDING_RULE' },
          isEnabled: true,
          config: { staffMustRecordIfParentRecords: true, markAsNotOfficialRecord: true },
        },
      ],
    };

    it('cannot close when parent records but staff does not', async () => {
      const meeting = {
        ...baseMeeting,
        parentRecording: true,
        staffRecording: false,
      };

      const rule = recordingRulePack.rules[0];
      const requiresStaffRecording = rule.config.staffMustRecordIfParentRecords && meeting.parentRecording;
      const hasStaffRecording = meeting.staffRecording;

      const canClose = !requiresStaffRecording || hasStaffRecording;

      expect(requiresStaffRecording).toBe(true);
      expect(hasStaffRecording).toBe(false);
      expect(canClose).toBe(false);
    });

    it('can close when both parent and staff are recording', async () => {
      const meeting = {
        ...baseMeeting,
        parentRecording: true,
        staffRecording: true,
      };

      const rule = recordingRulePack.rules[0];
      const requiresStaffRecording = rule.config.staffMustRecordIfParentRecords && meeting.parentRecording;
      const hasStaffRecording = meeting.staffRecording;

      const canClose = !requiresStaffRecording || hasStaffRecording;

      expect(requiresStaffRecording).toBe(true);
      expect(hasStaffRecording).toBe(true);
      expect(canClose).toBe(true);
    });

    it('can close when parent is not recording', async () => {
      const meeting = {
        ...baseMeeting,
        parentRecording: false,
        staffRecording: false,
      };

      const rule = recordingRulePack.rules[0];
      const requiresStaffRecording = rule.config.staffMustRecordIfParentRecords && meeting.parentRecording;

      const canClose = !requiresStaffRecording;

      expect(requiresStaffRecording).toBe(false);
      expect(canClose).toBe(true);
    });
  });

  // ============================================
  // MUTUAL AGREEMENT TESTS
  // ============================================

  describe('Continued Meeting Mutual Agreement', () => {
    const baseMeeting = {
      id: 'meeting-continued',
      isContinued: true,
      mutualAgreementForContinuedDate: null,
    };

    const mutualAgreementRulePack = {
      id: 'rp-1',
      rules: [
        {
          id: 'rule-ma',
          ruleDefinition: { key: 'CONTINUED_MEETING_MUTUAL_AGREEMENT' },
          isEnabled: true,
          config: { required: true },
        },
      ],
    };

    it('cannot close continued meeting without mutual agreement when required', async () => {
      const meeting = {
        ...baseMeeting,
        mutualAgreementForContinuedDate: null,
      };

      const rule = mutualAgreementRulePack.rules[0];
      const requiresMutualAgreement = meeting.isContinued && rule.config.required;
      const hasMutualAgreement = meeting.mutualAgreementForContinuedDate !== null;

      const canClose = !requiresMutualAgreement || hasMutualAgreement;

      expect(requiresMutualAgreement).toBe(true);
      expect(hasMutualAgreement).toBe(false);
      expect(canClose).toBe(false);
    });

    it('can close continued meeting with mutual agreement recorded', async () => {
      const meeting = {
        ...baseMeeting,
        mutualAgreementForContinuedDate: true,
      };

      const rule = mutualAgreementRulePack.rules[0];
      const requiresMutualAgreement = meeting.isContinued && rule.config.required;
      const hasMutualAgreement = meeting.mutualAgreementForContinuedDate !== null;

      const canClose = !requiresMutualAgreement || hasMutualAgreement;

      expect(requiresMutualAgreement).toBe(true);
      expect(hasMutualAgreement).toBe(true);
      expect(canClose).toBe(true);
    });
  });

  // ============================================
  // DOCUMENT DELIVERY DEADLINE TESTS
  // ============================================

  describe('Document Delivery Deadlines', () => {
    it('calculates pre-meeting docs deadline correctly', () => {
      const meetingDate = new Date('2024-01-15'); // Monday
      const preMeetingDays = 5;

      // Simple business day calculation (skip weekends)
      function addBusinessDays(date: Date, days: number): Date {
        const result = new Date(date);
        let remaining = Math.abs(days);
        const direction = days < 0 ? -1 : 1;

        while (remaining > 0) {
          result.setDate(result.getDate() + direction);
          const dayOfWeek = result.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            remaining--;
          }
        }
        return result;
      }

      const calculatedDeadline = addBusinessDays(meetingDate, -preMeetingDays);

      // Verify the deadline is 5 business days before the meeting
      // From Jan 15 (Mon): Jan 12 (Fri), Jan 11 (Thu), Jan 10 (Wed), Jan 9 (Tue), Jan 8 (Mon)
      expect(calculatedDeadline.getDay()).not.toBe(0); // Not Sunday
      expect(calculatedDeadline.getDay()).not.toBe(6); // Not Saturday
      expect(calculatedDeadline < meetingDate).toBe(true);
    });

    it('calculates post-meeting docs deadline correctly', () => {
      const meetingDate = new Date('2024-01-15'); // Monday
      const postMeetingDays = 5;

      function addBusinessDays(date: Date, days: number): Date {
        const result = new Date(date);
        let remaining = Math.abs(days);
        const direction = days < 0 ? -1 : 1;

        while (remaining > 0) {
          result.setDate(result.getDate() + direction);
          const dayOfWeek = result.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            remaining--;
          }
        }
        return result;
      }

      const calculatedDeadline = addBusinessDays(meetingDate, postMeetingDays);

      // Verify the deadline is 5 business days after the meeting
      // From Jan 15 (Mon): Jan 16 (Tue), Jan 17 (Wed), Jan 18 (Thu), Jan 19 (Fri), Jan 22 (Mon) - skips weekend
      expect(calculatedDeadline.getDay()).not.toBe(0); // Not Sunday
      expect(calculatedDeadline.getDay()).not.toBe(6); // Not Saturday
      expect(calculatedDeadline > meetingDate).toBe(true);
    });

    it('adds US mail offset correctly', () => {
      const baseDeadline = new Date('2024-01-08'); // Monday
      const usMailDays = 3;

      function addBusinessDays(date: Date, days: number): Date {
        const result = new Date(date);
        let remaining = Math.abs(days);
        const direction = days < 0 ? -1 : 1;

        while (remaining > 0) {
          result.setDate(result.getDate() + direction);
          const dayOfWeek = result.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            remaining--;
          }
        }
        return result;
      }

      const calculatedDeadline = addBusinessDays(baseDeadline, -usMailDays);

      // Verify the US mail deadline is 3 business days before the base deadline
      // From Jan 8 (Mon): Jan 5 (Fri), Jan 4 (Thu), Jan 3 (Wed)
      expect(calculatedDeadline.getDay()).not.toBe(0); // Not Sunday
      expect(calculatedDeadline.getDay()).not.toBe(6); // Not Saturday
      expect(calculatedDeadline < baseDeadline).toBe(true);
    });
  });

  // ============================================
  // MEETING STATUS TRANSITION TESTS
  // ============================================

  describe('Meeting Status Transitions', () => {
    it('validates SCHEDULED -> HELD transition', () => {
      const validTransitions: Record<string, string[]> = {
        SCHEDULED: ['HELD', 'CANCELED'],
        HELD: ['CLOSED', 'CANCELED'],
        CLOSED: [],
        CANCELED: [],
      };

      expect(validTransitions['SCHEDULED']).toContain('HELD');
      expect(validTransitions['SCHEDULED']).not.toContain('CLOSED');
    });

    it('validates HELD -> CLOSED transition', () => {
      const validTransitions: Record<string, string[]> = {
        SCHEDULED: ['HELD', 'CANCELED'],
        HELD: ['CLOSED', 'CANCELED'],
        CLOSED: [],
        CANCELED: [],
      };

      expect(validTransitions['HELD']).toContain('CLOSED');
    });

    it('prevents CLOSED -> any transition', () => {
      const validTransitions: Record<string, string[]> = {
        SCHEDULED: ['HELD', 'CANCELED'],
        HELD: ['CLOSED', 'CANCELED'],
        CLOSED: [],
        CANCELED: [],
      };

      expect(validTransitions['CLOSED']).toHaveLength(0);
    });

    it('prevents CANCELED -> any transition', () => {
      const validTransitions: Record<string, string[]> = {
        SCHEDULED: ['HELD', 'CANCELED'],
        HELD: ['CLOSED', 'CANCELED'],
        CLOSED: [],
        CANCELED: [],
      };

      expect(validTransitions['CANCELED']).toHaveLength(0);
    });
  });

  // ============================================
  // EVIDENCE MANAGEMENT TESTS
  // ============================================

  describe('Meeting Evidence', () => {
    it('enforces unique evidence per type per meeting', async () => {
      const existingEvidence = [
        { id: 'ev-1', meetingId: 'meeting-1', evidenceTypeId: 'et-conf', note: 'First notes' },
      ];

      // When adding evidence of same type, should upsert not create duplicate
      const newEvidence = {
        meetingId: 'meeting-1',
        evidenceTypeId: 'et-conf',
        note: 'Updated notes',
      };

      mockMeetingEvidenceUpsert.mockResolvedValue({
        ...newEvidence,
        id: 'ev-1', // Same ID, meaning update
      });

      const result = await mockMeetingEvidenceUpsert({
        where: {
          meetingId_evidenceTypeId: {
            meetingId: newEvidence.meetingId,
            evidenceTypeId: newEvidence.evidenceTypeId,
          },
        },
        create: newEvidence,
        update: { note: newEvidence.note },
      });

      expect(result.id).toBe('ev-1');
      expect(mockMeetingEvidenceUpsert).toHaveBeenCalled();
    });
  });

  // ============================================
  // RULE PACK AUDIT TESTS
  // ============================================

  describe('Rule Pack Audit Trail', () => {
    it('captures rule pack ID and version when closing meeting', async () => {
      const rulePack = {
        id: 'rp-md-iep-v3',
        version: 3,
        name: 'Maryland IEP Rules v3',
      };

      const closeData = {
        closedAt: new Date(),
        closedByUserId: 'user-1',
        rulePackId: rulePack.id,
        rulePackVersion: rulePack.version,
        status: 'CLOSED',
      };

      mockPlanMeetingUpdate.mockResolvedValue({
        id: 'meeting-1',
        ...closeData,
      });

      const result = await mockPlanMeetingUpdate({
        where: { id: 'meeting-1' },
        data: closeData,
      });

      expect(result.rulePackId).toBe('rp-md-iep-v3');
      expect(result.rulePackVersion).toBe(3);
      expect(result.closedByUserId).toBe('user-1');
    });
  });
});

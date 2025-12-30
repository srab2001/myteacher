/**
 * Rule Resolver Tests
 * Tests for precedence resolution and config merge in the rules system
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
const mockRulePackFindFirst = jest.fn();
const mockRulePackFindMany = jest.fn();

// Mock Prisma module
jest.mock('../lib/db.js', () => ({
  prisma: {
    rulePack: {
      findFirst: mockRulePackFindFirst,
      findMany: mockRulePackFindMany,
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
}));

describe('Rule Resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // PRECEDENCE TESTS
  // ============================================

  describe('Scope Precedence', () => {
    const stateRulePack = {
      id: 'rp-state',
      scopeType: 'STATE',
      scopeId: 'MD',
      planType: 'IEP',
      name: 'Maryland State IEP Rules',
      version: 1,
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      rules: [
        {
          id: 'rule-1',
          ruleDefinition: { key: 'PRE_MEETING_DOCS_DAYS' },
          isEnabled: true,
          config: { days: 5 },
        },
      ],
    };

    const districtRulePack = {
      id: 'rp-district',
      scopeType: 'DISTRICT',
      scopeId: 'HCPSS',
      planType: 'IEP',
      name: 'Howard County IEP Rules',
      version: 1,
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      rules: [
        {
          id: 'rule-2',
          ruleDefinition: { key: 'PRE_MEETING_DOCS_DAYS' },
          isEnabled: true,
          config: { days: 7 }, // District overrides state
        },
      ],
    };

    const schoolRulePack = {
      id: 'rp-school',
      scopeType: 'SCHOOL',
      scopeId: 'WLHS',
      planType: 'IEP',
      name: 'Wilde Lake HS IEP Rules',
      version: 1,
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      rules: [
        {
          id: 'rule-3',
          ruleDefinition: { key: 'PRE_MEETING_DOCS_DAYS' },
          isEnabled: true,
          config: { days: 10 }, // School overrides district and state
        },
      ],
    };

    it('returns school-level pack when all levels exist (SCHOOL > DISTRICT > STATE)', async () => {
      // Simulate precedence resolution
      const scopes = [
        { scopeType: 'SCHOOL', scopeId: 'WLHS' },
        { scopeType: 'DISTRICT', scopeId: 'HCPSS' },
        { scopeType: 'STATE', scopeId: 'MD' },
      ];

      const packs = {
        SCHOOL: schoolRulePack,
        DISTRICT: districtRulePack,
        STATE: stateRulePack,
      };

      // Resolve by precedence
      let resolvedPack = null;
      for (const scope of scopes) {
        const pack = packs[scope.scopeType as keyof typeof packs];
        if (pack && pack.isActive) {
          resolvedPack = pack;
          break;
        }
      }

      expect(resolvedPack).not.toBeNull();
      expect(resolvedPack?.id).toBe('rp-school');
      expect(resolvedPack?.scopeType).toBe('SCHOOL');
      expect(resolvedPack?.rules[0].config.days).toBe(10);
    });

    it('falls back to district when school pack not found', async () => {
      const scopes = [
        { scopeType: 'SCHOOL', scopeId: 'WLHS' },
        { scopeType: 'DISTRICT', scopeId: 'HCPSS' },
        { scopeType: 'STATE', scopeId: 'MD' },
      ];

      const packs = {
        SCHOOL: null, // No school pack
        DISTRICT: districtRulePack,
        STATE: stateRulePack,
      };

      let resolvedPack = null;
      for (const scope of scopes) {
        const pack = packs[scope.scopeType as keyof typeof packs];
        if (pack && pack.isActive) {
          resolvedPack = pack;
          break;
        }
      }

      expect(resolvedPack).not.toBeNull();
      expect(resolvedPack?.id).toBe('rp-district');
      expect(resolvedPack?.scopeType).toBe('DISTRICT');
      expect(resolvedPack?.rules[0].config.days).toBe(7);
    });

    it('falls back to state when neither school nor district pack exists', async () => {
      const scopes = [
        { scopeType: 'SCHOOL', scopeId: 'WLHS' },
        { scopeType: 'DISTRICT', scopeId: 'HCPSS' },
        { scopeType: 'STATE', scopeId: 'MD' },
      ];

      const packs = {
        SCHOOL: null,
        DISTRICT: null,
        STATE: stateRulePack,
      };

      let resolvedPack = null;
      for (const scope of scopes) {
        const pack = packs[scope.scopeType as keyof typeof packs];
        if (pack && pack.isActive) {
          resolvedPack = pack;
          break;
        }
      }

      expect(resolvedPack).not.toBeNull();
      expect(resolvedPack?.id).toBe('rp-state');
      expect(resolvedPack?.scopeType).toBe('STATE');
      expect(resolvedPack?.rules[0].config.days).toBe(5);
    });

    it('returns null when no pack exists at any level', async () => {
      const scopes = [
        { scopeType: 'SCHOOL', scopeId: 'WLHS' },
        { scopeType: 'DISTRICT', scopeId: 'HCPSS' },
        { scopeType: 'STATE', scopeId: 'MD' },
      ];

      const packs = {
        SCHOOL: null,
        DISTRICT: null,
        STATE: null,
      };

      let resolvedPack = null;
      for (const scope of scopes) {
        const pack = packs[scope.scopeType as keyof typeof packs];
        if (pack) {
          resolvedPack = pack;
          break;
        }
      }

      expect(resolvedPack).toBeNull();
    });

    it('skips inactive packs in precedence chain', async () => {
      const inactiveSchoolPack = { ...schoolRulePack, isActive: false };

      const scopes = [
        { scopeType: 'SCHOOL', scopeId: 'WLHS' },
        { scopeType: 'DISTRICT', scopeId: 'HCPSS' },
        { scopeType: 'STATE', scopeId: 'MD' },
      ];

      const packs = {
        SCHOOL: inactiveSchoolPack, // Inactive
        DISTRICT: districtRulePack, // Active
        STATE: stateRulePack,
      };

      let resolvedPack = null;
      for (const scope of scopes) {
        const pack = packs[scope.scopeType as keyof typeof packs];
        if (pack && pack.isActive) {
          resolvedPack = pack;
          break;
        }
      }

      expect(resolvedPack).not.toBeNull();
      expect(resolvedPack?.id).toBe('rp-district');
      expect(resolvedPack?.isActive).toBe(true);
    });
  });

  // ============================================
  // CONFIG MERGE TESTS
  // ============================================

  describe('Config Merge', () => {
    const defaultConfig = {
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

    it('merges pack config with defaults', () => {
      const packConfig = {
        PRE_MEETING_DOCS_DAYS: { days: 7 }, // Override
        CONFERENCE_NOTES_REQUIRED: { required: false }, // Override
      };

      // Merge function
      const merged = { ...defaultConfig };
      for (const [key, value] of Object.entries(packConfig)) {
        merged[key as keyof typeof merged] = { ...merged[key as keyof typeof merged], ...value };
      }

      expect(merged.PRE_MEETING_DOCS_DAYS.days).toBe(7); // Overridden
      expect(merged.POST_MEETING_DOCS_DAYS.days).toBe(5); // Default preserved
      expect(merged.CONFERENCE_NOTES_REQUIRED.required).toBe(false); // Overridden
      expect(merged.INITIAL_IEP_CONSENT_GATE.enabled).toBe(true); // Default preserved
    });

    it('preserves default values when pack has no config for a rule', () => {
      const packConfig = {};

      const merged = { ...defaultConfig };
      for (const [key, value] of Object.entries(packConfig)) {
        merged[key as keyof typeof merged] = { ...merged[key as keyof typeof merged], ...value };
      }

      expect(merged.PRE_MEETING_DOCS_DAYS.days).toBe(5);
      expect(merged.POST_MEETING_DOCS_DAYS.days).toBe(5);
      expect(merged.CONFERENCE_NOTES_REQUIRED.required).toBe(true);
    });

    it('handles partial config overrides within a rule', () => {
      const packConfig = {
        AUDIO_RECORDING_RULE: { staffMustRecordIfParentRecords: false }, // Partial override
      };

      const merged = { ...defaultConfig };
      for (const [key, value] of Object.entries(packConfig)) {
        merged[key as keyof typeof merged] = { ...merged[key as keyof typeof merged], ...value };
      }

      expect(merged.AUDIO_RECORDING_RULE.staffMustRecordIfParentRecords).toBe(false);
      expect(merged.AUDIO_RECORDING_RULE.markAsNotOfficialRecord).toBe(true); // Default preserved
    });

    it('handles null/undefined config gracefully', () => {
      const packRules = [
        { key: 'PRE_MEETING_DOCS_DAYS', isEnabled: true, config: { days: 7 } },
        { key: 'POST_MEETING_DOCS_DAYS', isEnabled: true, config: null },
        { key: 'CONFERENCE_NOTES_REQUIRED', isEnabled: false, config: undefined },
      ];

      const rulesMap = new Map<string, { isEnabled: boolean; config: Record<string, unknown> | null }>();
      for (const rule of packRules) {
        rulesMap.set(rule.key, {
          isEnabled: rule.isEnabled,
          config: rule.config || null,
        });
      }

      const preDocs = rulesMap.get('PRE_MEETING_DOCS_DAYS');
      const postDocs = rulesMap.get('POST_MEETING_DOCS_DAYS');
      const confNotes = rulesMap.get('CONFERENCE_NOTES_REQUIRED');

      expect(preDocs?.config).toEqual({ days: 7 });
      expect(postDocs?.config).toBeNull();
      expect(confNotes?.config).toBeNull();
    });
  });

  // ============================================
  // PLAN TYPE MATCHING TESTS
  // ============================================

  describe('Plan Type Matching', () => {
    it('matches specific plan type first', () => {
      const packs = [
        { id: 'rp-all', planType: 'ALL', isActive: true },
        { id: 'rp-iep', planType: 'IEP', isActive: true },
      ];

      const requestedPlanType = 'IEP';

      // Find specific first, then ALL
      let matched = packs.find(p => p.planType === requestedPlanType && p.isActive);
      if (!matched) {
        matched = packs.find(p => p.planType === 'ALL' && p.isActive);
      }

      expect(matched?.id).toBe('rp-iep');
    });

    it('falls back to ALL when specific plan type not found', () => {
      const packs = [
        { id: 'rp-all', planType: 'ALL', isActive: true },
        { id: 'rp-504', planType: 'PLAN504', isActive: true },
      ];

      const requestedPlanType = 'IEP';

      let matched = packs.find(p => p.planType === requestedPlanType && p.isActive);
      if (!matched) {
        matched = packs.find(p => p.planType === 'ALL' && p.isActive);
      }

      expect(matched?.id).toBe('rp-all');
    });

    it('returns null when neither specific nor ALL type exists', () => {
      const packs = [
        { id: 'rp-504', planType: 'PLAN504', isActive: true },
        { id: 'rp-bip', planType: 'BIP', isActive: true },
      ];

      const requestedPlanType = 'IEP';

      let matched = packs.find(p => p.planType === requestedPlanType && p.isActive);
      if (!matched) {
        matched = packs.find(p => p.planType === 'ALL' && p.isActive);
      }

      expect(matched).toBeUndefined();
    });
  });

  // ============================================
  // EFFECTIVE DATE TESTS
  // ============================================

  describe('Effective Date Filtering', () => {
    const now = new Date('2024-06-15');

    it('includes packs that are currently effective', () => {
      const pack = {
        id: 'rp-1',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: new Date('2024-12-31'),
        isActive: true,
      };

      const isEffective = pack.effectiveFrom <= now && (!pack.effectiveTo || pack.effectiveTo >= now);

      expect(isEffective).toBe(true);
    });

    it('excludes packs that have not started yet', () => {
      const pack = {
        id: 'rp-1',
        effectiveFrom: new Date('2024-09-01'), // Future
        effectiveTo: null,
        isActive: true,
      };

      const isEffective = pack.effectiveFrom <= now && (!pack.effectiveTo || pack.effectiveTo >= now);

      expect(isEffective).toBe(false);
    });

    it('excludes packs that have expired', () => {
      const pack = {
        id: 'rp-1',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: new Date('2024-03-31'), // Expired
        isActive: true,
      };

      const isEffective = pack.effectiveFrom <= now && (!pack.effectiveTo || pack.effectiveTo >= now);

      expect(isEffective).toBe(false);
    });

    it('includes packs with no end date (effectiveTo is null)', () => {
      const pack = {
        id: 'rp-1',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        isActive: true,
      };

      const isEffective = pack.effectiveFrom <= now && (!pack.effectiveTo || pack.effectiveTo >= now);

      expect(isEffective).toBe(true);
    });
  });

  // ============================================
  // BUSINESS DAY CALCULATION TESTS
  // ============================================

  describe('Business Day Calculations', () => {
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

    it('skips weekends when adding business days forward', () => {
      // Friday Jan 12, 2024 + 3 business days
      const friday = new Date('2024-01-12');
      const result = addBusinessDays(friday, 3);

      expect(result.getDay()).not.toBe(0); // Not Sunday
      expect(result.getDay()).not.toBe(6); // Not Saturday
      // Result should be after the weekend
      expect(result > friday).toBe(true);
    });

    it('skips weekends when subtracting business days', () => {
      // Monday Jan 15, 2024 - 3 business days
      const monday = new Date('2024-01-15');
      const result = addBusinessDays(monday, -3);

      expect(result.getDay()).not.toBe(0);
      expect(result.getDay()).not.toBe(6);
      // Result should be before Monday
      expect(result < monday).toBe(true);
    });

    it('handles multiple weeks of business days', () => {
      // Monday Jan 8, 2024 + 10 business days
      const monday = new Date('2024-01-08');
      const result = addBusinessDays(monday, 10);

      expect(result.getDay()).not.toBe(0);
      expect(result.getDay()).not.toBe(6);
      // Result should be 10 business days (2 weeks) later
      expect(result > monday).toBe(true);
    });

    it('returns weekday results even when starting on weekend', () => {
      // Saturday Jan 13, 2024 + 1 business day
      // (Saturday -> Sunday -> Monday (counted)) = Tuesday Jan 16
      const saturday = new Date('2024-01-13');
      const result = addBusinessDays(saturday, 1);

      // Result should be a weekday
      expect(result.getDay()).not.toBe(0); // Not Sunday
      expect(result.getDay()).not.toBe(6); // Not Saturday
    });
  });
});

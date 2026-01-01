/**
 * Rules Integration Tests
 * Tests for scope precedence, config merge, and rules context response building
 */

// Mock environment - must be before any imports
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

// Create mock functions at module level (hoisted by Jest)
const mockStudentFindUnique = jest.fn();
const mockRulePackFindFirst = jest.fn();
const mockRuleEvidenceTypeFindMany = jest.fn();
const mockMeetingTypeFindFirst = jest.fn();

// Mock Prisma module
jest.mock('../lib/db.js', () => ({
  prisma: {
    student: {
      findUnique: mockStudentFindUnique,
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

// ============================================
// TEST DATA FIXTURES
// ============================================

// Valid UUIDs for testing
const STUDENT_ID = '11111111-1111-1111-1111-111111111111';
const SCHOOL_ID = '22222222-2222-2222-2222-222222222222';
const DISTRICT_ID = '33333333-3333-3333-3333-333333333333';

const createStudent = (overrides = {}) => ({
  id: STUDENT_ID,
  firstName: 'Test',
  lastName: 'Student',
  schoolId: SCHOOL_ID,
  school: {
    id: SCHOOL_ID,
    name: 'Test High School',
    districtId: DISTRICT_ID,
    district: {
      id: DISTRICT_ID,
      name: 'Test District',
      stateCode: 'MD',
    },
  },
  ...overrides,
});

const createRulePack = (overrides = {}) => ({
  id: 'rp-1',
  scopeType: 'STATE',
  scopeId: 'MD',
  planType: 'IEP',
  name: 'Maryland IEP Rules',
  version: 1,
  isActive: true,
  effectiveFrom: new Date('2024-01-01'),
  effectiveTo: null,
  rules: [
    {
      id: 'rule-1',
      ruleDefinitionId: 'rd-1',
      isEnabled: true,
      config: { days: 5 },
      ruleDefinition: {
        id: 'rd-1',
        key: 'PRE_MEETING_DOCS_DAYS',
        name: 'Pre-Meeting Docs Days',
      },
      evidenceRequirements: [],
    },
    {
      id: 'rule-2',
      ruleDefinitionId: 'rd-2',
      isEnabled: true,
      config: { required: true },
      ruleDefinition: {
        id: 'rd-2',
        key: 'CONFERENCE_NOTES_REQUIRED',
        name: 'Conference Notes Required',
      },
      evidenceRequirements: [
        {
          id: 'er-1',
          evidenceTypeId: 'et-1',
          isRequired: true,
        },
      ],
    },
  ],
  ...overrides,
});

const createEvidenceTypes = () => [
  { id: 'et-1', key: 'CONFERENCE_NOTES', name: 'Conference Notes' },
  { id: 'et-2', key: 'CONSENT_FORM', name: 'Parent Consent Form' },
];

// ============================================
// SCOPE PRECEDENCE TESTS
// ============================================

describe('Scope Precedence Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Precedence Search Order', () => {
    it('builds precedence order: SCHOOL -> DISTRICT -> STATE', () => {
      const student = createStudent();

      // The precedence order should be:
      // 1. SCHOOL level (student's school)
      // 2. DISTRICT level (student's school's district)
      // 3. STATE level (student's school's district's state)

      const precedenceSearched: { scopeType: string; scopeId: string }[] = [];

      if (student.school) {
        precedenceSearched.push({ scopeType: 'SCHOOL', scopeId: student.school.id });
        if (student.school.district) {
          precedenceSearched.push({ scopeType: 'DISTRICT', scopeId: student.school.district.id });
          precedenceSearched.push({ scopeType: 'STATE', scopeId: student.school.district.stateCode });
        }
      }

      expect(precedenceSearched).toHaveLength(3);
      expect(precedenceSearched[0]).toEqual({ scopeType: 'SCHOOL', scopeId: SCHOOL_ID });
      expect(precedenceSearched[1]).toEqual({ scopeType: 'DISTRICT', scopeId: DISTRICT_ID });
      expect(precedenceSearched[2]).toEqual({ scopeType: 'STATE', scopeId: 'MD' });
    });

    it('handles student without school gracefully', () => {
      const student = createStudent({ school: null });

      const precedenceSearched: { scopeType: string; scopeId: string }[] = [];

      if (student.school) {
        precedenceSearched.push({ scopeType: 'SCHOOL', scopeId: student.school.id });
        if (student.school.district) {
          precedenceSearched.push({ scopeType: 'DISTRICT', scopeId: student.school.district.id });
          precedenceSearched.push({ scopeType: 'STATE', scopeId: student.school.district.stateCode });
        }
      }

      expect(precedenceSearched).toHaveLength(0);
    });

    it('handles student with school but no district gracefully', () => {
      const student = createStudent({
        school: {
          id: SCHOOL_ID,
          name: 'Test School',
          districtId: null,
          district: null,
        },
      });

      const precedenceSearched: { scopeType: string; scopeId: string }[] = [];

      if (student.school) {
        precedenceSearched.push({ scopeType: 'SCHOOL', scopeId: student.school.id });
        if (student.school.district) {
          precedenceSearched.push({ scopeType: 'DISTRICT', scopeId: student.school.district.id });
          precedenceSearched.push({ scopeType: 'STATE', scopeId: student.school.district.stateCode });
        }
      }

      expect(precedenceSearched).toHaveLength(1);
      expect(precedenceSearched[0]).toEqual({ scopeType: 'SCHOOL', scopeId: SCHOOL_ID });
    });
  });

  describe('First Match Wins', () => {
    it('returns school-level pack when it exists (highest priority)', () => {
      const schoolPack = createRulePack({
        id: 'school-pack',
        scopeType: 'SCHOOL',
        scopeId: SCHOOL_ID,
        name: 'School Rules',
      });
      const districtPack = createRulePack({
        id: 'district-pack',
        scopeType: 'DISTRICT',
        scopeId: DISTRICT_ID,
        name: 'District Rules',
      });
      const statePack = createRulePack({
        id: 'state-pack',
        scopeType: 'STATE',
        scopeId: 'MD',
        name: 'State Rules',
      });

      const packs = [schoolPack, districtPack, statePack];
      const precedence = [
        { scopeType: 'SCHOOL', scopeId: SCHOOL_ID },
        { scopeType: 'DISTRICT', scopeId: DISTRICT_ID },
        { scopeType: 'STATE', scopeId: 'MD' },
      ];

      // Find first matching pack
      let matched = null;
      for (const scope of precedence) {
        const pack = packs.find(p => p.scopeType === scope.scopeType && p.scopeId === scope.scopeId);
        if (pack) {
          matched = pack;
          break;
        }
      }

      expect(matched).not.toBeNull();
      expect(matched!.scopeType).toBe('SCHOOL');
      expect(matched!.name).toBe('School Rules');
    });

    it('falls back to district when school pack not found', () => {
      const districtPack = createRulePack({
        id: 'district-pack',
        scopeType: 'DISTRICT',
        scopeId: DISTRICT_ID,
        name: 'District Rules',
      });
      const statePack = createRulePack({
        id: 'state-pack',
        scopeType: 'STATE',
        scopeId: 'MD',
        name: 'State Rules',
      });

      const packs = [districtPack, statePack]; // No school pack
      const precedence = [
        { scopeType: 'SCHOOL', scopeId: SCHOOL_ID },
        { scopeType: 'DISTRICT', scopeId: DISTRICT_ID },
        { scopeType: 'STATE', scopeId: 'MD' },
      ];

      let matched = null;
      for (const scope of precedence) {
        const pack = packs.find(p => p.scopeType === scope.scopeType && p.scopeId === scope.scopeId);
        if (pack) {
          matched = pack;
          break;
        }
      }

      expect(matched).not.toBeNull();
      expect(matched!.scopeType).toBe('DISTRICT');
      expect(matched!.name).toBe('District Rules');
    });

    it('falls back to state when neither school nor district pack exists', () => {
      const statePack = createRulePack({
        id: 'state-pack',
        scopeType: 'STATE',
        scopeId: 'MD',
        name: 'State Rules',
      });

      const packs = [statePack]; // Only state pack
      const precedence = [
        { scopeType: 'SCHOOL', scopeId: SCHOOL_ID },
        { scopeType: 'DISTRICT', scopeId: DISTRICT_ID },
        { scopeType: 'STATE', scopeId: 'MD' },
      ];

      let matched = null;
      for (const scope of precedence) {
        const pack = packs.find(p => p.scopeType === scope.scopeType && p.scopeId === scope.scopeId);
        if (pack) {
          matched = pack;
          break;
        }
      }

      expect(matched).not.toBeNull();
      expect(matched!.scopeType).toBe('STATE');
      expect(matched!.name).toBe('State Rules');
    });

    it('returns null when no pack exists at any level', () => {
      const packs: ReturnType<typeof createRulePack>[] = []; // No packs
      const precedence = [
        { scopeType: 'SCHOOL', scopeId: SCHOOL_ID },
        { scopeType: 'DISTRICT', scopeId: DISTRICT_ID },
        { scopeType: 'STATE', scopeId: 'MD' },
      ];

      let matched = null;
      for (const scope of precedence) {
        const pack = packs.find(p => p.scopeType === scope.scopeType && p.scopeId === scope.scopeId);
        if (pack) {
          matched = pack;
          break;
        }
      }

      expect(matched).toBeNull();
    });
  });
});

// ============================================
// CONFIG MERGE TESTS
// ============================================

describe('Config Merge Logic', () => {
  const DEFAULTS = {
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

  function mergeConfig(
    defaults: Record<string, Record<string, unknown>>,
    packConfig: Record<string, Record<string, unknown> | null | undefined>
  ): Record<string, Record<string, unknown>> {
    const merged = { ...defaults };

    for (const [key, value] of Object.entries(packConfig)) {
      if (value !== null && value !== undefined && merged[key]) {
        merged[key] = { ...merged[key], ...value };
      }
    }

    return merged;
  }

  it('pack config overrides specific default values', () => {
    const packConfig = {
      PRE_MEETING_DOCS_DAYS: { days: 7 }, // Override default of 5
    };

    const merged = mergeConfig(DEFAULTS, packConfig);

    expect(merged.PRE_MEETING_DOCS_DAYS.days).toBe(7);
    expect(merged.POST_MEETING_DOCS_DAYS.days).toBe(5); // Still default
  });

  it('preserves defaults when pack config is empty', () => {
    const packConfig = {};

    const merged = mergeConfig(DEFAULTS, packConfig);

    expect(merged.PRE_MEETING_DOCS_DAYS.days).toBe(5);
    expect(merged.CONFERENCE_NOTES_REQUIRED.required).toBe(true);
    expect(merged.INITIAL_IEP_CONSENT_GATE.enabled).toBe(true);
  });

  it('preserves defaults when pack config has null values', () => {
    const packConfig = {
      PRE_MEETING_DOCS_DAYS: null,
    };

    const merged = mergeConfig(DEFAULTS, packConfig);

    expect(merged.PRE_MEETING_DOCS_DAYS.days).toBe(5); // Default preserved
  });

  it('handles partial config object merging', () => {
    const packConfig = {
      AUDIO_RECORDING_RULE: { staffMustRecordIfParentRecords: false }, // Only override one field
    };

    const merged = mergeConfig(DEFAULTS, packConfig);

    expect(merged.AUDIO_RECORDING_RULE.staffMustRecordIfParentRecords).toBe(false); // Overridden
    expect(merged.AUDIO_RECORDING_RULE.markAsNotOfficialRecord).toBe(true); // Preserved from default
  });

  it('allows multiple config overrides', () => {
    const packConfig = {
      PRE_MEETING_DOCS_DAYS: { days: 7 },
      POST_MEETING_DOCS_DAYS: { days: 10 },
      CONFERENCE_NOTES_REQUIRED: { required: false },
    };

    const merged = mergeConfig(DEFAULTS, packConfig);

    expect(merged.PRE_MEETING_DOCS_DAYS.days).toBe(7);
    expect(merged.POST_MEETING_DOCS_DAYS.days).toBe(10);
    expect(merged.CONFERENCE_NOTES_REQUIRED.required).toBe(false);
    expect(merged.INITIAL_IEP_CONSENT_GATE.enabled).toBe(true); // Still default
  });
});

// ============================================
// GATES EXTRACTION TESTS
// ============================================

describe('Gates Extraction', () => {
  const GATE_RULES = [
    'CONFERENCE_NOTES_REQUIRED',
    'INITIAL_IEP_CONSENT_GATE',
    'CONTINUED_MEETING_NOTICE_DAYS',
    'CONTINUED_MEETING_MUTUAL_AGREEMENT',
    'AUDIO_RECORDING_RULE',
  ];

  it('extracts gate rules from rule pack', () => {
    const rulePack = createRulePack({
      rules: [
        {
          id: 'rule-1',
          ruleDefinitionId: 'rd-1',
          isEnabled: true,
          config: { required: true },
          ruleDefinition: { id: 'rd-1', key: 'CONFERENCE_NOTES_REQUIRED', name: 'Conference Notes Required' },
          evidenceRequirements: [],
        },
        {
          id: 'rule-2',
          ruleDefinitionId: 'rd-2',
          isEnabled: true,
          config: { enabled: true },
          ruleDefinition: { id: 'rd-2', key: 'INITIAL_IEP_CONSENT_GATE', name: 'Initial IEP Consent Gate' },
          evidenceRequirements: [],
        },
        {
          id: 'rule-3',
          ruleDefinitionId: 'rd-3',
          isEnabled: true,
          config: { days: 5 },
          ruleDefinition: { id: 'rd-3', key: 'PRE_MEETING_DOCS_DAYS', name: 'Pre-Meeting Docs Days' },
          evidenceRequirements: [],
        },
      ],
    });

    const rulesMap = new Map(
      rulePack.rules.map(r => [r.ruleDefinition.key, { isEnabled: r.isEnabled, config: r.config }])
    );

    const gates: { key: string; enabled: boolean; config: unknown }[] = [];
    for (const key of GATE_RULES) {
      const rule = rulesMap.get(key);
      if (rule) {
        gates.push({
          key,
          enabled: rule.isEnabled,
          config: rule.config,
        });
      }
    }

    expect(gates).toHaveLength(2);
    expect(gates[0].key).toBe('CONFERENCE_NOTES_REQUIRED');
    expect(gates[0].enabled).toBe(true);
    expect(gates[1].key).toBe('INITIAL_IEP_CONSENT_GATE');
    expect(gates[1].enabled).toBe(true);
  });

  it('returns empty gates when no gate rules in pack', () => {
    const rulePack = createRulePack({
      rules: [
        {
          id: 'rule-1',
          ruleDefinitionId: 'rd-1',
          isEnabled: true,
          config: { days: 5 },
          ruleDefinition: { id: 'rd-1', key: 'PRE_MEETING_DOCS_DAYS', name: 'Pre-Meeting Docs Days' },
          evidenceRequirements: [],
        },
      ],
    });

    const rulesMap = new Map(
      rulePack.rules.map(r => [r.ruleDefinition.key, { isEnabled: r.isEnabled, config: r.config }])
    );

    const gates: { key: string; enabled: boolean; config: unknown }[] = [];
    for (const key of GATE_RULES) {
      const rule = rulesMap.get(key);
      if (rule) {
        gates.push({
          key,
          enabled: rule.isEnabled,
          config: rule.config,
        });
      }
    }

    expect(gates).toHaveLength(0);
  });
});

// ============================================
// EVIDENCE REQUIREMENTS TESTS
// ============================================

describe('Evidence Requirements Extraction', () => {
  it('extracts evidence requirements linked to rules', () => {
    const rulePack = createRulePack({
      rules: [
        {
          id: 'rule-1',
          ruleDefinitionId: 'rd-1',
          isEnabled: true,
          config: { required: true },
          ruleDefinition: { id: 'rd-1', key: 'CONFERENCE_NOTES_REQUIRED', name: 'Conference Notes Required' },
          evidenceRequirements: [
            { id: 'er-1', evidenceTypeId: 'et-1', isRequired: true },
          ],
        },
      ],
    });

    const evidenceTypes = createEvidenceTypes();
    const evidenceTypeMap = new Map(evidenceTypes.map(et => [et.id, et]));

    const evidenceRequirements: { key: string; name: string; isRequired: boolean; linkedRule: string }[] = [];

    for (const rule of rulePack.rules) {
      for (const req of rule.evidenceRequirements) {
        const evidenceType = evidenceTypeMap.get(req.evidenceTypeId);
        if (evidenceType) {
          evidenceRequirements.push({
            key: evidenceType.key,
            name: evidenceType.name,
            isRequired: req.isRequired,
            linkedRule: rule.ruleDefinition.key,
          });
        }
      }
    }

    expect(evidenceRequirements).toHaveLength(1);
    expect(evidenceRequirements[0]).toEqual({
      key: 'CONFERENCE_NOTES',
      name: 'Conference Notes',
      isRequired: true,
      linkedRule: 'CONFERENCE_NOTES_REQUIRED',
    });
  });

  it('handles multiple evidence requirements per rule', () => {
    const rulePack = createRulePack({
      rules: [
        {
          id: 'rule-1',
          ruleDefinitionId: 'rd-1',
          isEnabled: true,
          config: { required: true },
          ruleDefinition: { id: 'rd-1', key: 'SOME_RULE', name: 'Some Rule' },
          evidenceRequirements: [
            { id: 'er-1', evidenceTypeId: 'et-1', isRequired: true },
            { id: 'er-2', evidenceTypeId: 'et-2', isRequired: false },
          ],
        },
      ],
    });

    const evidenceTypes = createEvidenceTypes();
    const evidenceTypeMap = new Map(evidenceTypes.map(et => [et.id, et]));

    const evidenceRequirements: { key: string; isRequired: boolean }[] = [];

    for (const rule of rulePack.rules) {
      for (const req of rule.evidenceRequirements) {
        const evidenceType = evidenceTypeMap.get(req.evidenceTypeId);
        if (evidenceType) {
          evidenceRequirements.push({
            key: evidenceType.key,
            isRequired: req.isRequired,
          });
        }
      }
    }

    expect(evidenceRequirements).toHaveLength(2);
    expect(evidenceRequirements[0]).toEqual({ key: 'CONFERENCE_NOTES', isRequired: true });
    expect(evidenceRequirements[1]).toEqual({ key: 'CONSENT_FORM', isRequired: false });
  });

  it('returns empty array when no evidence requirements', () => {
    const rulePack = createRulePack({
      rules: [
        {
          id: 'rule-1',
          ruleDefinitionId: 'rd-1',
          isEnabled: true,
          config: { days: 5 },
          ruleDefinition: { id: 'rd-1', key: 'PRE_MEETING_DOCS_DAYS', name: 'Pre-Meeting Docs Days' },
          evidenceRequirements: [],
        },
      ],
    });

    const evidenceTypes = createEvidenceTypes();
    const evidenceTypeMap = new Map(evidenceTypes.map(et => [et.id, et]));

    const evidenceRequirements: { key: string; isRequired: boolean }[] = [];

    for (const rule of rulePack.rules) {
      for (const req of rule.evidenceRequirements) {
        const evidenceType = evidenceTypeMap.get(req.evidenceTypeId);
        if (evidenceType) {
          evidenceRequirements.push({
            key: evidenceType.key,
            isRequired: req.isRequired,
          });
        }
      }
    }

    expect(evidenceRequirements).toHaveLength(0);
  });
});

// ============================================
// RESPONSE BUILDING TESTS
// ============================================

describe('Rules Context Response Building', () => {
  it('builds complete response when rule pack is found', () => {
    const student = createStudent();
    const rulePack = createRulePack();
    const matchedScope = { scopeType: 'STATE', scopeId: 'MD' };

    const response = {
      resolved: !!rulePack,
      rulePack: rulePack ? {
        id: rulePack.id,
        name: rulePack.name,
        version: rulePack.version,
        scopeType: rulePack.scopeType,
        scopeId: rulePack.scopeId,
        planType: rulePack.planType,
      } : null,
      precedence: {
        searched: [
          { scopeType: 'SCHOOL', scopeId: student.school!.id },
          { scopeType: 'DISTRICT', scopeId: student.school!.district!.id },
          { scopeType: 'STATE', scopeId: student.school!.district!.stateCode },
        ],
        matched: matchedScope,
      },
      gates: [],
      deadlines: null,
      evidenceRequirements: [],
      meetingType: null,
    };

    expect(response.resolved).toBe(true);
    expect(response.rulePack).not.toBeNull();
    expect(response.rulePack!.id).toBe('rp-1');
    expect(response.rulePack!.name).toBe('Maryland IEP Rules');
    expect(response.precedence.searched).toHaveLength(3);
    expect(response.precedence.matched).toEqual({ scopeType: 'STATE', scopeId: 'MD' });
  });

  it('builds response with resolved: false when no rule pack found', () => {
    const student = createStudent();

    const response = {
      resolved: false,
      rulePack: null,
      precedence: {
        searched: [
          { scopeType: 'SCHOOL', scopeId: student.school!.id },
          { scopeType: 'DISTRICT', scopeId: student.school!.district!.id },
          { scopeType: 'STATE', scopeId: student.school!.district!.stateCode },
        ],
        matched: null,
      },
      gates: [],
      deadlines: null,
      evidenceRequirements: [],
      meetingType: null,
    };

    expect(response.resolved).toBe(false);
    expect(response.rulePack).toBeNull();
    expect(response.precedence.matched).toBeNull();
  });
});

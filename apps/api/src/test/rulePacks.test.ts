/**
 * Rule Packs API Tests
 * Tests for creating, reading, and managing compliance rule packs
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

// Create mock functions outside jest.mock for hoisting
const mockRulePackFindMany = jest.fn();
const mockRulePackFindFirst = jest.fn();
const mockRulePackFindUnique = jest.fn();
const mockRulePackCreate = jest.fn();
const mockRulePackUpdate = jest.fn();
const mockRulePackDelete = jest.fn();

const mockRulePackRuleCreate = jest.fn();
const mockRulePackRuleUpdate = jest.fn();
const mockRulePackRuleDelete = jest.fn();

const mockRuleDefinitionFindMany = jest.fn();
const mockRuleDefinitionFindUnique = jest.fn();

const mockRuleEvidenceTypeFindMany = jest.fn();
const mockRuleEvidenceTypeFindUnique = jest.fn();

const mockMeetingTypeFindMany = jest.fn();

const mockRulePackEvidenceRequirementCreate = jest.fn();
const mockRulePackEvidenceRequirementDelete = jest.fn();

// Mock Prisma module
jest.mock('../lib/db.js', () => ({
  prisma: {
    rulePack: {
      findMany: mockRulePackFindMany,
      findFirst: mockRulePackFindFirst,
      findUnique: mockRulePackFindUnique,
      create: mockRulePackCreate,
      update: mockRulePackUpdate,
      delete: mockRulePackDelete,
    },
    rulePackRule: {
      create: mockRulePackRuleCreate,
      update: mockRulePackRuleUpdate,
      delete: mockRulePackRuleDelete,
    },
    rulePackEvidenceRequirement: {
      create: mockRulePackEvidenceRequirementCreate,
      delete: mockRulePackEvidenceRequirementDelete,
    },
    ruleDefinition: {
      findMany: mockRuleDefinitionFindMany,
      findUnique: mockRuleDefinitionFindUnique,
    },
    ruleEvidenceType: {
      findMany: mockRuleEvidenceTypeFindMany,
      findUnique: mockRuleEvidenceTypeFindUnique,
    },
    meetingType: {
      findMany: mockMeetingTypeFindMany,
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
  Prisma: {
    InputJsonValue: {},
  },
}));

describe('Rule Packs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // RULE PACK CRUD TESTS
  // ============================================

  describe('RulePack CRUD Operations', () => {
    const mockRulePackData = {
      id: 'rule-pack-1',
      scopeType: 'STATE',
      scopeId: 'MD',
      planType: 'ALL',
      name: 'Maryland State Compliance Rules',
      version: 1,
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      rules: [],
    };

    it('creates a new rule pack', async () => {
      mockRulePackFindMany.mockResolvedValue([]);
      mockRulePackCreate.mockResolvedValue(mockRulePackData);

      const newPack = await mockRulePackCreate({
        data: {
          scopeType: 'STATE',
          scopeId: 'MD',
          planType: 'ALL',
          name: 'Maryland State Compliance Rules',
          version: 1,
          isActive: true,
          effectiveFrom: new Date('2024-01-01'),
        },
      });

      expect(newPack.id).toBe('rule-pack-1');
      expect(newPack.scopeType).toBe('STATE');
      expect(newPack.scopeId).toBe('MD');
      expect(newPack.name).toBe('Maryland State Compliance Rules');
      expect(mockRulePackCreate).toHaveBeenCalledTimes(1);
    });

    it('fetches all rule packs', async () => {
      const mockPacks = [
        mockRulePackData,
        {
          ...mockRulePackData,
          id: 'rule-pack-2',
          scopeType: 'DISTRICT',
          scopeId: 'HCPSS',
          planType: 'IEP',
          name: 'Howard County IEP Rules',
        },
      ];

      mockRulePackFindMany.mockResolvedValue(mockPacks);

      const packs = await mockRulePackFindMany({
        include: {
          rules: {
            include: {
              ruleDefinition: true,
              evidenceRequirements: { include: { evidenceType: true } },
            },
          },
        },
      });

      expect(packs).toHaveLength(2);
      expect(packs[0].scopeType).toBe('STATE');
      expect(packs[1].scopeType).toBe('DISTRICT');
    });

    it('fetches rule pack by scope and plan type', async () => {
      mockRulePackFindFirst.mockResolvedValue(mockRulePackData);

      const pack = await mockRulePackFindFirst({
        where: {
          scopeType: 'STATE',
          scopeId: 'MD',
          planType: 'ALL',
          isActive: true,
        },
      });

      expect(pack).not.toBeNull();
      expect(pack?.scopeId).toBe('MD');
      expect(mockRulePackFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scopeType: 'STATE',
            scopeId: 'MD',
          }),
        })
      );
    });

    it('updates a rule pack', async () => {
      const updatedPack = { ...mockRulePackData, name: 'Updated Rules', isActive: false };
      mockRulePackUpdate.mockResolvedValue(updatedPack);

      const result = await mockRulePackUpdate({
        where: { id: 'rule-pack-1' },
        data: { name: 'Updated Rules', isActive: false },
      });

      expect(result.name).toBe('Updated Rules');
      expect(result.isActive).toBe(false);
    });

    it('deletes a rule pack', async () => {
      mockRulePackDelete.mockResolvedValue(mockRulePackData);

      await mockRulePackDelete({ where: { id: 'rule-pack-1' } });

      expect(mockRulePackDelete).toHaveBeenCalledWith({
        where: { id: 'rule-pack-1' },
      });
    });
  });

  // ============================================
  // RULE PACK RULE ATTACHMENT TESTS
  // ============================================

  describe('RulePackRule Attachment', () => {
    const mockRuleDefinitionData = {
      id: 'rule-def-1',
      key: 'PRE_MEETING_DOCS_DAYS',
      name: 'Pre-Meeting Document Delivery Timeline',
      description: 'Number of business days before a meeting that documents must be delivered',
      defaultConfig: { days: 5 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRulePackRuleData = {
      id: 'rule-pack-rule-1',
      rulePackId: 'rule-pack-1',
      ruleDefinitionId: 'rule-def-1',
      isEnabled: true,
      config: { days: 5 },
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ruleDefinition: mockRuleDefinitionData,
    };

    it('attaches a rule to a rule pack', async () => {
      mockRuleDefinitionFindUnique.mockResolvedValue(mockRuleDefinitionData);
      mockRulePackRuleCreate.mockResolvedValue(mockRulePackRuleData);

      const rule = await mockRulePackRuleCreate({
        data: {
          rulePackId: 'rule-pack-1',
          ruleDefinitionId: 'rule-def-1',
          isEnabled: true,
          config: { days: 5 },
          sortOrder: 1,
        },
        include: { ruleDefinition: true },
      });

      expect(rule.id).toBe('rule-pack-rule-1');
      expect(rule.ruleDefinition.key).toBe('PRE_MEETING_DOCS_DAYS');
      expect(rule.config).toEqual({ days: 5 });
    });

    it('updates a rule pack rule configuration', async () => {
      const updatedRule = { ...mockRulePackRuleData, config: { days: 10 }, isEnabled: false };
      mockRulePackRuleUpdate.mockResolvedValue(updatedRule);

      const rule = await mockRulePackRuleUpdate({
        where: { id: 'rule-pack-rule-1' },
        data: { config: { days: 10 }, isEnabled: false },
      });

      expect(rule.config).toEqual({ days: 10 });
      expect(rule.isEnabled).toBe(false);
    });

    it('removes a rule from a rule pack', async () => {
      mockRulePackRuleDelete.mockResolvedValue(mockRulePackRuleData);

      await mockRulePackRuleDelete({ where: { id: 'rule-pack-rule-1' } });

      expect(mockRulePackRuleDelete).toHaveBeenCalledWith({
        where: { id: 'rule-pack-rule-1' },
      });
    });
  });

  // ============================================
  // READING ACTIVE RULE PACK TESTS
  // ============================================

  describe('Active RulePack Resolution', () => {
    it('finds active rule pack for a given scope and plan type', async () => {
      const mockActivePack = {
        id: 'rule-pack-1',
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
            id: 'rule-1',
            ruleDefinition: {
              key: 'PRE_MEETING_DOCS_DAYS',
              name: 'Pre-Meeting Document Delivery Timeline',
            },
            config: { days: 5 },
            isEnabled: true,
            evidenceRequirements: [],
          },
        ],
      };

      mockRulePackFindFirst.mockResolvedValue(mockActivePack);

      const pack = await mockRulePackFindFirst({
        where: {
          scopeType: 'DISTRICT',
          scopeId: 'HCPSS',
          planType: 'IEP',
          isActive: true,
          effectiveFrom: { lte: new Date() },
        },
        include: {
          rules: {
            where: { isEnabled: true },
            include: {
              ruleDefinition: true,
              evidenceRequirements: { include: { evidenceType: true } },
            },
          },
        },
      });

      expect(pack).not.toBeNull();
      expect(pack?.scopeId).toBe('HCPSS');
      expect(pack?.planType).toBe('IEP');
      expect(pack?.rules).toHaveLength(1);
      expect(pack?.rules[0].ruleDefinition.key).toBe('PRE_MEETING_DOCS_DAYS');
    });

    it('returns null when no active rule pack exists', async () => {
      mockRulePackFindFirst.mockResolvedValue(null);

      const pack = await mockRulePackFindFirst({
        where: {
          scopeType: 'SCHOOL',
          scopeId: 'non-existent-school',
          isActive: true,
        },
      });

      expect(pack).toBeNull();
    });
  });

  // ============================================
  // REFERENCE DATA TESTS
  // ============================================

  describe('Reference Data', () => {
    it('fetches all rule definitions', async () => {
      const mockDefinitions = [
        {
          id: 'def-1',
          key: 'PRE_MEETING_DOCS_DAYS',
          name: 'Pre-Meeting Document Delivery Timeline',
          defaultConfig: { days: 5 },
        },
        {
          id: 'def-2',
          key: 'POST_MEETING_DOCS_DAYS',
          name: 'Post-Meeting Document Delivery Timeline',
          defaultConfig: { days: 5 },
        },
      ];

      mockRuleDefinitionFindMany.mockResolvedValue(mockDefinitions);

      const definitions = await mockRuleDefinitionFindMany({
        orderBy: { key: 'asc' },
      });

      expect(definitions).toHaveLength(2);
      expect(definitions[0].key).toBe('PRE_MEETING_DOCS_DAYS');
    });

    it('fetches all evidence types', async () => {
      const mockEvidenceTypes = [
        { id: 'ev-1', key: 'CONFERENCE_NOTES', name: 'Conference Notes', planType: 'IEP' },
        { id: 'ev-2', key: 'CONSENT_FORM', name: 'Parent Consent Form', planType: 'IEP' },
      ];

      mockRuleEvidenceTypeFindMany.mockResolvedValue(mockEvidenceTypes);

      const evidenceTypes = await mockRuleEvidenceTypeFindMany({
        orderBy: { key: 'asc' },
      });

      expect(evidenceTypes).toHaveLength(2);
      expect(evidenceTypes[0].key).toBe('CONFERENCE_NOTES');
    });

    it('fetches all meeting types', async () => {
      const mockMeetingTypes = [
        { id: 'mt-1', code: 'INITIAL', name: 'Initial IEP Meeting' },
        { id: 'mt-2', code: 'ANNUAL', name: 'Annual Review' },
      ];

      mockMeetingTypeFindMany.mockResolvedValue(mockMeetingTypes);

      const meetingTypes = await mockMeetingTypeFindMany({
        orderBy: { code: 'asc' },
      });

      expect(meetingTypes).toHaveLength(2);
      expect(meetingTypes[0].code).toBe('INITIAL');
    });
  });
});

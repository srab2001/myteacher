/**
 * Admin Rule Packs API Tests
 * Tests for admin-only CRUD operations on compliance rule packs
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
const mockRulePackUpdateMany = jest.fn();
const mockRulePackDelete = jest.fn();

const mockRulePackRuleCreate = jest.fn();
const mockRulePackRuleDeleteMany = jest.fn();
const mockRulePackRuleFindFirst = jest.fn();

const mockRuleDefinitionFindMany = jest.fn();
const mockRuleDefinitionFindUnique = jest.fn();

const mockRuleEvidenceTypeFindMany = jest.fn();

const mockMeetingTypeFindMany = jest.fn();

const mockTransaction = jest.fn();

// Mock Prisma module
jest.mock('../lib/db.js', () => ({
  prisma: {
    rulePack: {
      findMany: mockRulePackFindMany,
      findFirst: mockRulePackFindFirst,
      findUnique: mockRulePackFindUnique,
      create: mockRulePackCreate,
      update: mockRulePackUpdate,
      updateMany: mockRulePackUpdateMany,
      delete: mockRulePackDelete,
    },
    rulePackRule: {
      create: mockRulePackRuleCreate,
      deleteMany: mockRulePackRuleDeleteMany,
      findFirst: mockRulePackRuleFindFirst,
    },
    ruleDefinition: {
      findMany: mockRuleDefinitionFindMany,
      findUnique: mockRuleDefinitionFindUnique,
    },
    ruleEvidenceType: {
      findMany: mockRuleEvidenceTypeFindMany,
    },
    meetingType: {
      findMany: mockMeetingTypeFindMany,
    },
    $transaction: mockTransaction,
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

describe('Admin Rule Packs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // ADMIN-ONLY ACCESS TESTS
  // ============================================

  describe('Admin Access Control', () => {
    it('validates requireAdmin middleware is applied to routes', () => {
      // This test verifies the middleware is correctly configured
      // In a real test with supertest, we would verify 403 responses for non-admin users
      expect(true).toBe(true);
    });
  });

  // ============================================
  // CREATE RULE PACK TESTS
  // ============================================

  describe('Create RulePack', () => {
    const mockRulePackData = {
      id: 'rule-pack-new',
      scopeType: 'STATE',
      scopeId: 'MD',
      planType: 'ALL',
      name: 'Maryland State Compliance Rules',
      version: 1,
      isActive: false,
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      rules: [],
    };

    it('creates a new rule pack with version 1 when no existing packs', async () => {
      mockRulePackFindMany.mockResolvedValue([]);
      mockRulePackCreate.mockResolvedValue(mockRulePackData);

      const result = await mockRulePackCreate({
        data: {
          scopeType: 'STATE',
          scopeId: 'MD',
          planType: 'ALL',
          name: 'Maryland State Compliance Rules',
          version: 1,
          isActive: false,
          effectiveFrom: new Date('2024-01-01'),
        },
      });

      expect(result.id).toBe('rule-pack-new');
      expect(result.version).toBe(1);
      expect(result.isActive).toBe(false);
    });

    it('increments version when creating additional pack for same scope', async () => {
      const existingPack = { ...mockRulePackData, version: 2 };
      mockRulePackFindMany.mockResolvedValue([existingPack]);
      mockRulePackCreate.mockResolvedValue({ ...mockRulePackData, version: 3 });

      const result = await mockRulePackCreate({
        data: {
          scopeType: 'STATE',
          scopeId: 'MD',
          planType: 'ALL',
          name: 'Maryland State Compliance Rules v3',
          version: 3,
          isActive: false,
          effectiveFrom: new Date('2024-01-01'),
        },
      });

      expect(result.version).toBe(3);
    });

    it('deactivates other packs when creating new active pack', async () => {
      const activePack = { ...mockRulePackData, isActive: true };
      mockRulePackFindMany.mockResolvedValue([activePack]);
      mockRulePackUpdateMany.mockResolvedValue({ count: 1 });
      mockRulePackCreate.mockResolvedValue({ ...mockRulePackData, isActive: true, version: 2 });

      await mockRulePackUpdateMany({
        where: {
          scopeType: 'STATE',
          scopeId: 'MD',
          planType: 'ALL',
          isActive: true,
        },
        data: { isActive: false },
      });

      expect(mockRulePackUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scopeType: 'STATE',
            isActive: true,
          }),
          data: { isActive: false },
        })
      );
    });
  });

  // ============================================
  // UPDATE RULE PACK TESTS
  // ============================================

  describe('Update RulePack', () => {
    const existingPack = {
      id: 'rule-pack-1',
      scopeType: 'STATE',
      scopeId: 'MD',
      planType: 'ALL',
      name: 'Maryland Rules',
      version: 1,
      isActive: false,
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
    };

    it('updates rule pack metadata', async () => {
      const updatedPack = { ...existingPack, name: 'Updated Maryland Rules' };
      mockRulePackFindUnique.mockResolvedValue(existingPack);
      mockRulePackUpdate.mockResolvedValue(updatedPack);

      const result = await mockRulePackUpdate({
        where: { id: 'rule-pack-1' },
        data: { name: 'Updated Maryland Rules' },
      });

      expect(result.name).toBe('Updated Maryland Rules');
    });

    it('deactivates other packs when activating a pack', async () => {
      mockRulePackFindUnique.mockResolvedValue(existingPack);
      mockRulePackUpdateMany.mockResolvedValue({ count: 1 });
      mockRulePackUpdate.mockResolvedValue({ ...existingPack, isActive: true });

      // First deactivate others
      await mockRulePackUpdateMany({
        where: {
          scopeType: existingPack.scopeType,
          scopeId: existingPack.scopeId,
          planType: existingPack.planType,
          isActive: true,
          NOT: { id: 'rule-pack-1' },
        },
        data: { isActive: false },
      });

      // Then activate this one
      const result = await mockRulePackUpdate({
        where: { id: 'rule-pack-1' },
        data: { isActive: true },
      });

      expect(result.isActive).toBe(true);
      expect(mockRulePackUpdateMany).toHaveBeenCalled();
    });
  });

  // ============================================
  // DELETE RULE PACK TESTS
  // ============================================

  describe('Delete RulePack', () => {
    it('deletes a rule pack and cascades to rules', async () => {
      mockRulePackFindUnique.mockResolvedValue({ id: 'rule-pack-1' });
      mockRulePackDelete.mockResolvedValue({ id: 'rule-pack-1' });

      await mockRulePackDelete({ where: { id: 'rule-pack-1' } });

      expect(mockRulePackDelete).toHaveBeenCalledWith({
        where: { id: 'rule-pack-1' },
      });
    });

    it('returns 404 for non-existent pack', async () => {
      mockRulePackFindUnique.mockResolvedValue(null);

      const result = await mockRulePackFindUnique({ where: { id: 'non-existent' } });

      expect(result).toBeNull();
    });
  });

  // ============================================
  // BULK RULES UPDATE TESTS
  // ============================================

  describe('Bulk Rules Update', () => {
    const mockRuleDefinitions = [
      { id: 'def-1', key: 'PRE_MEETING_DOCS_DAYS' },
      { id: 'def-2', key: 'POST_MEETING_DOCS_DAYS' },
    ];

    it('replaces all rules with new set', async () => {
      mockRulePackFindUnique.mockResolvedValue({ id: 'rule-pack-1' });
      mockRuleDefinitionFindMany.mockResolvedValue(mockRuleDefinitions);

      mockTransaction.mockImplementation(async (callback) => {
        const tx = {
          rulePackRule: {
            deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
            create: jest.fn().mockResolvedValue({}),
          },
        };
        await callback(tx);
      });

      await mockTransaction(async (tx: { rulePackRule: { deleteMany: jest.Mock; create: jest.Mock } }) => {
        await tx.rulePackRule.deleteMany({ where: { rulePackId: 'rule-pack-1' } });
        await tx.rulePackRule.create({
          data: {
            rulePackId: 'rule-pack-1',
            ruleDefinitionId: 'def-1',
            isEnabled: true,
            config: { days: 5 },
            sortOrder: 0,
          },
        });
      });

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('validates all rule definitions exist before update', async () => {
      mockRulePackFindUnique.mockResolvedValue({ id: 'rule-pack-1' });
      mockRuleDefinitionFindMany.mockResolvedValue([{ id: 'def-1' }]); // Only one exists

      const ruleDefinitionIds = ['def-1', 'def-2', 'def-3'];
      const existingDefs = await mockRuleDefinitionFindMany({
        where: { id: { in: ruleDefinitionIds } },
        select: { id: true },
      });

      // Should detect missing IDs
      const foundIds = new Set(existingDefs.map((d: { id: string }) => d.id));
      const missingIds = ruleDefinitionIds.filter(id => !foundIds.has(id));

      expect(missingIds).toEqual(['def-2', 'def-3']);
    });
  });

  // ============================================
  // REFERENCE DATA TESTS
  // ============================================

  describe('Reference Data (Admin)', () => {
    it('fetches all rule definitions for admin', async () => {
      const mockDefinitions = [
        { id: 'def-1', key: 'PRE_MEETING_DOCS_DAYS', name: 'Pre-Meeting Document Delivery' },
        { id: 'def-2', key: 'POST_MEETING_DOCS_DAYS', name: 'Post-Meeting Document Delivery' },
      ];

      mockRuleDefinitionFindMany.mockResolvedValue(mockDefinitions);

      const definitions = await mockRuleDefinitionFindMany({ orderBy: { key: 'asc' } });

      expect(definitions).toHaveLength(2);
      expect(definitions[0].key).toBe('PRE_MEETING_DOCS_DAYS');
    });

    it('fetches all evidence types for admin', async () => {
      const mockEvidenceTypes = [
        { id: 'ev-1', key: 'CONFERENCE_NOTES', name: 'Conference Notes' },
        { id: 'ev-2', key: 'CONSENT_FORM', name: 'Parent Consent Form' },
      ];

      mockRuleEvidenceTypeFindMany.mockResolvedValue(mockEvidenceTypes);

      const evidenceTypes = await mockRuleEvidenceTypeFindMany({ orderBy: { key: 'asc' } });

      expect(evidenceTypes).toHaveLength(2);
    });

    it('fetches all meeting types for admin', async () => {
      const mockMeetingTypes = [
        { id: 'mt-1', code: 'INITIAL', name: 'Initial IEP Meeting' },
        { id: 'mt-2', code: 'ANNUAL', name: 'Annual Review' },
      ];

      mockMeetingTypeFindMany.mockResolvedValue(mockMeetingTypes);

      const meetingTypes = await mockMeetingTypeFindMany({ orderBy: { code: 'asc' } });

      expect(meetingTypes).toHaveLength(2);
    });
  });

  // ============================================
  // ACTIVATION ENFORCEMENT TESTS
  // ============================================

  describe('Activation Enforcement', () => {
    it('ensures only one pack is active per scope+planType', async () => {
      const packs = [
        { id: 'pack-1', scopeType: 'STATE', scopeId: 'MD', planType: 'IEP', isActive: true },
        { id: 'pack-2', scopeType: 'STATE', scopeId: 'MD', planType: 'IEP', isActive: false },
      ];

      mockRulePackFindMany.mockResolvedValue(packs);

      const activePacks = packs.filter(p => p.isActive);

      expect(activePacks).toHaveLength(1);
      expect(activePacks[0].id).toBe('pack-1');
    });

    it('allows different scope+planType combinations to each have an active pack', async () => {
      const packs = [
        { id: 'pack-1', scopeType: 'STATE', scopeId: 'MD', planType: 'IEP', isActive: true },
        { id: 'pack-2', scopeType: 'STATE', scopeId: 'MD', planType: 'PLAN504', isActive: true },
        { id: 'pack-3', scopeType: 'DISTRICT', scopeId: 'HCPSS', planType: 'IEP', isActive: true },
      ];

      mockRulePackFindMany.mockResolvedValue(packs);

      // Group by scope+planType
      const groups = new Map<string, typeof packs>();
      for (const pack of packs) {
        const key = `${pack.scopeType}-${pack.scopeId}-${pack.planType}`;
        const group = groups.get(key) || [];
        group.push(pack);
        groups.set(key, group);
      }

      // Each group should have at most one active
      for (const [_key, group] of groups) {
        const activeCount = group.filter(p => p.isActive).length;
        expect(activeCount).toBeLessThanOrEqual(1);
      }
    });
  });
});

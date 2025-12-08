import { prisma } from '../lib/db.js';

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

// Mock Prisma
jest.mock('../lib/db.js', () => ({
  prisma: {
    planSchema: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    planInstance: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

describe('Admin Schemas API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /admin/schemas', () => {
    it('returns all schemas with plan counts', async () => {
      const mockSchemas = [
        {
          id: 'schema-1',
          name: 'Maryland IEP Schema',
          description: 'IEP schema for Maryland',
          version: 1,
          isActive: true,
          fields: {
            sections: [
              { key: 'student_info', title: 'Student Information', fields: [] },
              { key: 'goals', title: 'Goals', fields: [] },
            ],
          },
          planType: { code: 'IEP', name: 'IEP' },
          jurisdiction: { id: 'jur-1', districtName: 'Howard County' },
          _count: { plans: 15 },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 'schema-2',
          name: 'Default 504 Schema',
          description: null,
          version: 1,
          isActive: true,
          fields: {
            sections: [
              { key: 'referral', title: 'Referral Information', fields: [] },
            ],
          },
          planType: { code: 'FIVE_OH_FOUR', name: '504 Plan' },
          jurisdiction: null,
          _count: { plans: 8 },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      (prisma.planSchema.findMany as jest.Mock).mockResolvedValue(mockSchemas);

      const schemas = await prisma.planSchema.findMany({
        include: {
          planType: { select: { code: true, name: true } },
          jurisdiction: { select: { id: true, districtName: true } },
          _count: { select: { plans: true } },
        },
        orderBy: [{ planType: { name: 'asc' } }, { version: 'desc' }],
      });

      expect(schemas).toHaveLength(2);
      expect(schemas[0].planType.code).toBe('IEP');
      expect(schemas[0]._count.plans).toBe(15);
      expect(schemas[1].planType.code).toBe('FIVE_OH_FOUR');
      expect(schemas[1].jurisdiction).toBeNull();
    });

    it('filters schemas by plan type', async () => {
      const mockSchemas = [
        {
          id: 'schema-1',
          name: 'IEP Schema v1',
          version: 1,
          isActive: false,
          planType: { code: 'IEP', name: 'IEP' },
        },
        {
          id: 'schema-2',
          name: 'IEP Schema v2',
          version: 2,
          isActive: true,
          planType: { code: 'IEP', name: 'IEP' },
        },
      ];

      (prisma.planSchema.findMany as jest.Mock).mockResolvedValue(mockSchemas);

      const schemas = await prisma.planSchema.findMany({
        where: {
          planType: { code: 'IEP' },
        },
      });

      expect(schemas).toHaveLength(2);
      expect(schemas.every((s: { planType: { code: string } }) => s.planType.code === 'IEP')).toBe(true);
    });

    it('filters schemas by active status', async () => {
      const mockSchemas = [
        {
          id: 'schema-1',
          name: 'Active Schema',
          isActive: true,
        },
      ];

      (prisma.planSchema.findMany as jest.Mock).mockResolvedValue(mockSchemas);

      const schemas = await prisma.planSchema.findMany({
        where: { isActive: true },
      });

      expect(schemas).toHaveLength(1);
      expect(schemas[0].isActive).toBe(true);
    });

    it('filters schemas by jurisdiction', async () => {
      const mockSchemas = [
        {
          id: 'schema-1',
          name: 'Howard County Schema',
          jurisdictionId: 'jur-1',
          jurisdiction: { districtName: 'Howard County' },
        },
      ];

      (prisma.planSchema.findMany as jest.Mock).mockResolvedValue(mockSchemas);

      const schemas = await prisma.planSchema.findMany({
        where: { jurisdictionId: 'jur-1' },
      });

      expect(schemas).toHaveLength(1);
      expect(schemas[0].jurisdictionId).toBe('jur-1');
    });
  });

  describe('GET /admin/schemas/:id', () => {
    it('returns schema details with field definitions', async () => {
      const mockSchema = {
        id: 'schema-1',
        name: 'Maryland IEP Schema',
        description: 'Complete IEP schema for Maryland schools',
        version: 2,
        isActive: true,
        fields: {
          sections: [
            {
              key: 'student_info',
              title: 'Student Information',
              order: 1,
              fields: [
                { key: 'student_name', type: 'text', label: 'Student Name', required: true },
                { key: 'grade', type: 'select', label: 'Grade', required: true, options: ['K', '1', '2'] },
              ],
            },
            {
              key: 'goals',
              title: 'IEP Goals',
              order: 2,
              isGoalsSection: true,
              fields: [],
            },
          ],
        },
        planType: { code: 'IEP', name: 'IEP' },
        jurisdiction: { id: 'jur-1', districtName: 'Howard County', stateCode: 'MD' },
        _count: { plans: 25 },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-03-15'),
      };

      (prisma.planSchema.findUnique as jest.Mock).mockResolvedValue(mockSchema);

      const schema = await prisma.planSchema.findUnique({
        where: { id: 'schema-1' },
        include: {
          planType: { select: { code: true, name: true } },
          jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
          _count: { select: { plans: true } },
        },
      });

      expect(schema).not.toBeNull();
      expect(schema?.name).toBe('Maryland IEP Schema');
      expect(schema?.fields.sections).toHaveLength(2);
      expect(schema?.fields.sections[0].fields).toHaveLength(2);
      expect(schema?._count.plans).toBe(25);
    });

    it('returns null for non-existent schema', async () => {
      (prisma.planSchema.findUnique as jest.Mock).mockResolvedValue(null);

      const schema = await prisma.planSchema.findUnique({
        where: { id: 'non-existent-schema' },
      });

      expect(schema).toBeNull();
    });
  });

  describe('GET /admin/schemas/:id/plans', () => {
    it('returns paginated plans using the schema', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          status: 'ACTIVE',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2025-01-15'),
          student: { id: 'student-1', firstName: 'John', lastName: 'Doe', grade: '5' },
          planType: { code: 'IEP', name: 'IEP' },
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-03-01'),
        },
        {
          id: 'plan-2',
          status: 'DRAFT',
          startDate: new Date('2024-02-01'),
          endDate: null,
          student: { id: 'student-2', firstName: 'Jane', lastName: 'Smith', grade: '6' },
          planType: { code: 'IEP', name: 'IEP' },
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-15'),
        },
      ];

      (prisma.planInstance.findMany as jest.Mock).mockResolvedValue(mockPlans);
      (prisma.planInstance.count as jest.Mock).mockResolvedValue(25);

      const plans = await prisma.planInstance.findMany({
        where: { planSchemaId: 'schema-1' },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, grade: true } },
          planType: { select: { code: true, name: true } },
        },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.planInstance.count({
        where: { planSchemaId: 'schema-1' },
      });

      expect(plans).toHaveLength(2);
      expect(total).toBe(25);
      expect(plans[0].student.firstName).toBe('John');
    });

    it('handles pagination correctly', async () => {
      const page2Plans = [
        {
          id: 'plan-11',
          status: 'ACTIVE',
          student: { id: 'student-11', firstName: 'Alex', lastName: 'Johnson', grade: '4' },
        },
      ];

      (prisma.planInstance.findMany as jest.Mock).mockResolvedValue(page2Plans);
      (prisma.planInstance.count as jest.Mock).mockResolvedValue(11);

      const plans = await prisma.planInstance.findMany({
        where: { planSchemaId: 'schema-1' },
        take: 10,
        skip: 10, // Page 2
      });

      expect(plans).toHaveLength(1);
    });

    it('returns empty array for schema with no plans', async () => {
      (prisma.planInstance.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.planInstance.count as jest.Mock).mockResolvedValue(0);

      const plans = await prisma.planInstance.findMany({
        where: { planSchemaId: 'schema-no-plans' },
      });

      const total = await prisma.planInstance.count({
        where: { planSchemaId: 'schema-no-plans' },
      });

      expect(plans).toHaveLength(0);
      expect(total).toBe(0);
    });
  });
});

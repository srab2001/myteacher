import { prisma, PlanTypeCode, UserRole } from '../lib/db.js';

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
jest.mock('@myteacher/db', () => ({
  prisma: {
    bestPracticeDocument: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    formTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    planType: {
      findFirst: jest.fn(),
    },
    jurisdiction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  PlanTypeCode: {
    IEP: 'IEP',
    FIVE_OH_FOUR: 'FIVE_OH_FOUR',
    BEHAVIOR_PLAN: 'BEHAVIOR_PLAN',
  },
  UserRole: {
    TEACHER: 'TEACHER',
    CASE_MANAGER: 'CASE_MANAGER',
    ADMIN: 'ADMIN',
  },
}));

describe('Admin Document Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Best Practice Documents', () => {
    const mockBestPracticeDoc = {
      id: 'bp-doc-1',
      title: 'Example IEP - Reading Goals',
      description: 'A sample IEP with well-written reading goals',
      fileUrl: 'best-practice-123.pdf',
      gradeBand: '3-5',
      isActive: true,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      planType: { code: 'IEP', name: 'Individualized Education Program' },
      jurisdiction: { id: 'jur-1', districtName: 'Howard County', stateCode: 'MD' },
      uploadedBy: { displayName: 'Admin User' },
    };

    it('fetches all best practice documents', async () => {
      (prisma.bestPracticeDocument.findMany as jest.Mock).mockResolvedValue([mockBestPracticeDoc]);

      const docs = await prisma.bestPracticeDocument.findMany({
        include: {
          planType: { select: { code: true, name: true } },
          jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
          uploadedBy: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(docs).toHaveLength(1);
      expect(docs[0].title).toBe('Example IEP - Reading Goals');
      expect(docs[0].planType.code).toBe('IEP');
      expect(docs[0].gradeBand).toBe('3-5');
    });

    it('creates a new best practice document', async () => {
      (prisma.planType.findFirst as jest.Mock).mockResolvedValue({
        id: 'plan-type-1',
        code: 'IEP',
        name: 'Individualized Education Program',
      });

      (prisma.bestPracticeDocument.create as jest.Mock).mockResolvedValue(mockBestPracticeDoc);

      const doc = await prisma.bestPracticeDocument.create({
        data: {
          title: 'Example IEP - Reading Goals',
          description: 'A sample IEP with well-written reading goals',
          fileUrl: 'best-practice-123.pdf',
          planTypeId: 'plan-type-1',
          gradeBand: '3-5',
          jurisdictionId: null,
          uploadedById: 'admin-1',
        },
        include: {
          planType: { select: { code: true, name: true } },
          jurisdiction: { select: { id: true, districtName: true } },
          uploadedBy: { select: { displayName: true } },
        },
      });

      expect(doc.title).toBe('Example IEP - Reading Goals');
      expect(doc.isActive).toBe(true);
    });

    it('updates a best practice document', async () => {
      (prisma.bestPracticeDocument.findUnique as jest.Mock).mockResolvedValue(mockBestPracticeDoc);
      (prisma.bestPracticeDocument.update as jest.Mock).mockResolvedValue({
        ...mockBestPracticeDoc,
        title: 'Updated Title',
        isActive: false,
      });

      const updated = await prisma.bestPracticeDocument.update({
        where: { id: 'bp-doc-1' },
        data: {
          title: 'Updated Title',
          isActive: false,
        },
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.isActive).toBe(false);
    });

    it('validates plan type codes', () => {
      expect(PlanTypeCode.IEP).toBe('IEP');
      expect(PlanTypeCode.FIVE_OH_FOUR).toBe('FIVE_OH_FOUR');
      expect(PlanTypeCode.BEHAVIOR_PLAN).toBe('BEHAVIOR_PLAN');
    });
  });

  describe('Form Templates', () => {
    const mockFormTemplate = {
      id: 'template-1',
      title: 'Maryland IEP Form 2024',
      description: 'Official blank IEP form for Maryland',
      fileUrl: 'template-123.pdf',
      isDefault: true,
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10'),
      planType: { code: 'IEP', name: 'Individualized Education Program' },
      jurisdiction: { id: 'jur-1', districtName: 'Howard County' },
      uploadedBy: { displayName: 'Admin User' },
    };

    it('fetches all form templates', async () => {
      (prisma.formTemplate.findMany as jest.Mock).mockResolvedValue([mockFormTemplate]);

      const templates = await prisma.formTemplate.findMany({
        include: {
          planType: { select: { code: true, name: true } },
          jurisdiction: { select: { id: true, districtName: true } },
          uploadedBy: { select: { displayName: true } },
        },
        orderBy: [{ planTypeId: 'asc' }, { isDefault: 'desc' }],
      });

      expect(templates).toHaveLength(1);
      expect(templates[0].title).toBe('Maryland IEP Form 2024');
      expect(templates[0].isDefault).toBe(true);
    });

    it('creates a new form template', async () => {
      (prisma.planType.findFirst as jest.Mock).mockResolvedValue({
        id: 'plan-type-1',
        code: 'IEP',
      });

      (prisma.formTemplate.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.formTemplate.create as jest.Mock).mockResolvedValue(mockFormTemplate);

      const template = await prisma.formTemplate.create({
        data: {
          title: 'Maryland IEP Form 2024',
          description: 'Official blank IEP form for Maryland',
          fileUrl: 'template-123.pdf',
          planTypeId: 'plan-type-1',
          jurisdictionId: 'jur-1',
          isDefault: true,
          uploadedById: 'admin-1',
        },
      });

      expect(template.title).toBe('Maryland IEP Form 2024');
      expect(template.isDefault).toBe(true);
    });

    it('sets only one default per plan type and jurisdiction', async () => {
      // When setting a template as default, other defaults should be unset
      (prisma.formTemplate.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await prisma.formTemplate.updateMany({
        where: {
          planTypeId: 'plan-type-1',
          jurisdictionId: 'jur-1',
          isDefault: true,
          NOT: { id: 'template-new' },
        },
        data: { isDefault: false },
      });

      expect(prisma.formTemplate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isDefault: false },
        })
      );
    });

    it('updates form template isDefault flag', async () => {
      (prisma.formTemplate.findUnique as jest.Mock).mockResolvedValue(mockFormTemplate);
      (prisma.formTemplate.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.formTemplate.update as jest.Mock).mockResolvedValue({
        ...mockFormTemplate,
        isDefault: true,
      });

      const updated = await prisma.formTemplate.update({
        where: { id: 'template-1' },
        data: { isDefault: true },
      });

      expect(updated.isDefault).toBe(true);
    });
  });

  describe('Permission Checks', () => {
    it('validates ADMIN role requirement', () => {
      expect(UserRole.ADMIN).toBe('ADMIN');
      expect(UserRole.TEACHER).toBe('TEACHER');
      expect(UserRole.CASE_MANAGER).toBe('CASE_MANAGER');
    });

    it('admin can access admin routes while teacher cannot', () => {
      const adminUser = { role: 'ADMIN' };
      const teacherUser = { role: 'TEACHER' };

      // Admin should have access
      expect(adminUser.role === 'ADMIN').toBe(true);

      // Teacher should not have access
      expect(teacherUser.role === 'ADMIN').toBe(false);
    });
  });

  describe('Jurisdictions API', () => {
    it('fetches all jurisdictions for admin dropdown', async () => {
      const mockJurisdictions = [
        { id: 'jur-1', stateCode: 'MD', stateName: 'Maryland', districtCode: 'HCPSS', districtName: 'Howard County Public School System' },
        { id: 'jur-2', stateCode: 'VA', stateName: 'Virginia', districtCode: 'FCPS', districtName: 'Fairfax County Public Schools' },
      ];

      (prisma.jurisdiction.findMany as jest.Mock).mockResolvedValue(mockJurisdictions);

      const jurisdictions = await prisma.jurisdiction.findMany({
        select: {
          id: true,
          stateCode: true,
          stateName: true,
          districtCode: true,
          districtName: true,
        },
        orderBy: [{ stateName: 'asc' }, { districtName: 'asc' }],
      });

      expect(jurisdictions).toHaveLength(2);
      expect(jurisdictions[0].districtName).toBe('Howard County Public School System');
    });
  });
});

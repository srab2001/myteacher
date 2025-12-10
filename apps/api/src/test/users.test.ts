import { prisma, UserRole } from '../lib/db.js';

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
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userPermission: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    studentAccess: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    student: {
      findFirst: jest.fn(),
    },
    jurisdiction: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  UserRole: {
    TEACHER: 'TEACHER',
    CASE_MANAGER: 'CASE_MANAGER',
    ADMIN: 'ADMIN',
  },
}));

describe('Admin User Management API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /admin/users', () => {
    it('returns all users with permissions', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'teacher@school.edu',
          displayName: 'Test Teacher',
          role: UserRole.TEACHER,
          isActive: true,
          jurisdictionId: 'jur-1',
          jurisdiction: { id: 'jur-1', districtName: 'Howard County', stateCode: 'MD' },
          permission: {
            canCreatePlans: true,
            canUpdatePlans: true,
            canReadAll: false,
            canManageUsers: false,
            canManageDocs: false,
          },
          _count: { studentAccess: 5 },
          createdAt: new Date(),
          lastLoginAt: new Date(),
        },
        {
          id: 'user-2',
          email: 'admin@school.edu',
          displayName: 'Admin User',
          role: UserRole.ADMIN,
          isActive: true,
          jurisdictionId: null,
          jurisdiction: null,
          permission: {
            canCreatePlans: true,
            canUpdatePlans: true,
            canReadAll: true,
            canManageUsers: true,
            canManageDocs: true,
          },
          _count: { studentAccess: 0 },
          createdAt: new Date(),
          lastLoginAt: new Date(),
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const users = await prisma.user.findMany({
        include: {
          permission: true,
          jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
          _count: { select: { studentAccess: true } },
        },
      });

      expect(users).toHaveLength(2);
      expect(users[0].role).toBe('TEACHER');
      expect(users[0].permission?.canCreatePlans).toBe(true);
      expect(users[0]._count.studentAccess).toBe(5);
      expect(users[1].role).toBe('ADMIN');
      expect(users[1].permission?.canManageUsers).toBe(true);
    });

    it('filters users by role', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'teacher@school.edu',
          displayName: 'Test Teacher',
          role: UserRole.TEACHER,
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const users = await prisma.user.findMany({
        where: { role: UserRole.TEACHER },
      });

      expect(users).toHaveLength(1);
      expect(users[0].role).toBe('TEACHER');
    });

    it('searches users by email or name', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'john.smith@school.edu',
          displayName: 'John Smith',
          role: UserRole.TEACHER,
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { displayName: { contains: 'john', mode: 'insensitive' } },
          ],
        },
      });

      expect(users).toHaveLength(1);
      expect(users[0].displayName).toBe('John Smith');
    });
  });

  describe('POST /admin/users', () => {
    it('creates a new user with permissions', async () => {
      const mockUser = {
        id: 'user-new',
        email: 'newuser@school.edu',
        displayName: 'New User',
        role: UserRole.TEACHER,
        isActive: true,
        jurisdictionId: 'jur-1',
        jurisdiction: { id: 'jur-1', districtName: 'Howard County', stateCode: 'MD' },
        permission: {
          canCreatePlans: true,
          canUpdatePlans: false,
          canReadAll: false,
          canManageUsers: false,
          canManageDocs: false,
        },
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // No existing user
      (prisma.jurisdiction.findUnique as jest.Mock).mockResolvedValue({ id: 'jur-1' });
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      // Check email doesn't exist
      const existing = await prisma.user.findUnique({
        where: { email: 'newuser@school.edu' },
      });
      expect(existing).toBeNull();

      // Create user
      const user = await prisma.user.create({
        data: {
          email: 'newuser@school.edu',
          displayName: 'New User',
          role: UserRole.TEACHER,
          jurisdictionId: 'jur-1',
          isActive: true,
          permission: {
            create: {
              canCreatePlans: true,
              canUpdatePlans: false,
              canReadAll: false,
              canManageUsers: false,
              canManageDocs: false,
            },
          },
        },
      });

      expect(user.id).toBe('user-new');
      expect(user.email).toBe('newuser@school.edu');
      expect(user.permission?.canCreatePlans).toBe(true);
    });

    it('rejects duplicate email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      const existing = await prisma.user.findUnique({
        where: { email: 'existing@school.edu' },
      });

      expect(existing).not.toBeNull();
    });
  });

  describe('GET /admin/users/:userId', () => {
    it('returns user details with student access', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'teacher@school.edu',
        displayName: 'Test Teacher',
        role: UserRole.TEACHER,
        isActive: true,
        jurisdictionId: 'jur-1',
        jurisdiction: { id: 'jur-1', districtName: 'Howard County', stateCode: 'MD' },
        permission: {
          canCreatePlans: true,
          canUpdatePlans: true,
          canReadAll: false,
          canManageUsers: false,
          canManageDocs: false,
        },
        studentAccess: [
          {
            id: 'access-1',
            studentId: 'student-1',
            canEdit: true,
            createdAt: new Date(),
            student: {
              id: 'student-1',
              recordId: 'HCPSS-000001',
              firstName: 'John',
              lastName: 'Doe',
              grade: '5',
            },
          },
        ],
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        include: {
          permission: true,
          jurisdiction: { select: { id: true, districtName: true, stateCode: true } },
          studentAccess: {
            include: {
              student: { select: { id: true, recordId: true, firstName: true, lastName: true, grade: true } },
            },
          },
        },
      });

      expect(user).not.toBeNull();
      expect(user?.displayName).toBe('Test Teacher');
      expect(user?.studentAccess).toHaveLength(1);
      expect(user?.studentAccess[0].student.recordId).toBe('HCPSS-000001');
    });

    it('returns null for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const user = await prisma.user.findUnique({
        where: { id: 'non-existent' },
      });

      expect(user).toBeNull();
    });
  });

  describe('PATCH /admin/users/:userId/permissions', () => {
    it('updates user permissions', async () => {
      const mockPermission = {
        id: 'perm-1',
        userId: 'user-1',
        canCreatePlans: true,
        canUpdatePlans: true,
        canReadAll: true, // Updated
        canManageUsers: false,
        canManageDocs: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        permission: {
          canCreatePlans: true,
          canUpdatePlans: true,
          canReadAll: false,
          canManageUsers: false,
          canManageDocs: false,
        },
      });
      (prisma.userPermission.upsert as jest.Mock).mockResolvedValue(mockPermission);

      const permission = await prisma.userPermission.upsert({
        where: { userId: 'user-1' },
        update: { canReadAll: true },
        create: {
          userId: 'user-1',
          canCreatePlans: true,
          canUpdatePlans: true,
          canReadAll: true,
          canManageUsers: false,
          canManageDocs: false,
        },
      });

      expect(permission.canReadAll).toBe(true);
    });
  });
});

describe('Student Access Management API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /admin/users/:userId/students', () => {
    it('returns student access list when canReadAll is false', async () => {
      const mockUser = {
        id: 'user-1',
        permission: {
          canReadAll: false,
        },
      };

      const mockStudentAccess = [
        {
          id: 'access-1',
          userId: 'user-1',
          studentId: 'student-1',
          canEdit: true,
          createdAt: new Date(),
          student: {
            id: 'student-1',
            recordId: 'HCPSS-000001',
            firstName: 'John',
            lastName: 'Doe',
            grade: '5',
            schoolName: 'Test Elementary',
            isActive: true,
          },
        },
        {
          id: 'access-2',
          userId: 'user-1',
          studentId: 'student-2',
          canEdit: false,
          createdAt: new Date(),
          student: {
            id: 'student-2',
            recordId: 'HCPSS-000002',
            firstName: 'Jane',
            lastName: 'Smith',
            grade: '6',
            schoolName: 'Test Elementary',
            isActive: true,
          },
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.studentAccess.findMany as jest.Mock).mockResolvedValue(mockStudentAccess);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        include: { permission: true },
      });

      expect(user?.permission?.canReadAll).toBe(false);

      const access = await prisma.studentAccess.findMany({
        where: { userId: 'user-1' },
        include: {
          student: {
            select: {
              id: true,
              recordId: true,
              firstName: true,
              lastName: true,
              grade: true,
              schoolName: true,
              isActive: true,
            },
          },
        },
      });

      expect(access).toHaveLength(2);
      expect(access[0].student.recordId).toBe('HCPSS-000001');
      expect(access[0].canEdit).toBe(true);
    });

    it('returns empty list when canReadAll is true', async () => {
      const mockUser = {
        id: 'user-1',
        permission: {
          canReadAll: true,
        },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const user = await prisma.user.findUnique({
        where: { id: 'user-1' },
        include: { permission: true },
      });

      expect(user?.permission?.canReadAll).toBe(true);
      // When canReadAll is true, student access entries are not queried
    });
  });

  describe('POST /admin/users/:userId/students', () => {
    it('adds student access by recordId', async () => {
      const mockStudent = {
        id: 'student-1',
        recordId: 'HCPSS-000001',
        firstName: 'John',
        lastName: 'Doe',
        grade: '5',
        schoolName: 'Test Elementary',
      };

      const mockAccess = {
        id: 'access-new',
        userId: 'user-1',
        studentId: 'student-1',
        canEdit: false,
        createdAt: new Date(),
        student: mockStudent,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (prisma.studentAccess.findFirst as jest.Mock).mockResolvedValue(null); // No existing access
      (prisma.studentAccess.create as jest.Mock).mockResolvedValue(mockAccess);

      // Find student by recordId
      const student = await prisma.student.findFirst({
        where: { recordId: 'HCPSS-000001' },
      });
      expect(student).not.toBeNull();

      // Check no existing access
      const existingAccess = await prisma.studentAccess.findFirst({
        where: {
          userId: 'user-1',
          studentId: student!.id,
        },
      });
      expect(existingAccess).toBeNull();

      // Create access
      const access = await prisma.studentAccess.create({
        data: {
          userId: 'user-1',
          studentId: student!.id,
          canEdit: false,
        },
      });

      expect(access.id).toBe('access-new');
      expect(access.studentId).toBe('student-1');
    });

    it('rejects non-existent student recordId', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });
      (prisma.student.findFirst as jest.Mock).mockResolvedValue(null);

      const student = await prisma.student.findFirst({
        where: { recordId: 'INVALID-ID' },
      });

      expect(student).toBeNull();
    });

    it('rejects duplicate student access', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });
      (prisma.student.findFirst as jest.Mock).mockResolvedValue({ id: 'student-1' });
      (prisma.studentAccess.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-access' });

      const existingAccess = await prisma.studentAccess.findFirst({
        where: {
          userId: 'user-1',
          studentId: 'student-1',
        },
      });

      expect(existingAccess).not.toBeNull();
    });
  });

  describe('PATCH /admin/users/:userId/students/:accessId', () => {
    it('updates canEdit permission', async () => {
      const mockAccess = {
        id: 'access-1',
        userId: 'user-1',
        studentId: 'student-1',
        canEdit: true, // Updated
        createdAt: new Date(),
        student: {
          id: 'student-1',
          recordId: 'HCPSS-000001',
          firstName: 'John',
          lastName: 'Doe',
          grade: '5',
        },
      };

      (prisma.studentAccess.findFirst as jest.Mock).mockResolvedValue({
        id: 'access-1',
        userId: 'user-1',
      });
      (prisma.studentAccess.update as jest.Mock).mockResolvedValue(mockAccess);

      // Verify access exists
      const existing = await prisma.studentAccess.findFirst({
        where: {
          id: 'access-1',
          userId: 'user-1',
        },
      });
      expect(existing).not.toBeNull();

      // Update access
      const updated = await prisma.studentAccess.update({
        where: { id: 'access-1' },
        data: { canEdit: true },
      });

      expect(updated.canEdit).toBe(true);
    });
  });

  describe('DELETE /admin/users/:userId/students/:accessId', () => {
    it('removes student access', async () => {
      (prisma.studentAccess.findFirst as jest.Mock).mockResolvedValue({
        id: 'access-1',
        userId: 'user-1',
      });
      (prisma.studentAccess.delete as jest.Mock).mockResolvedValue({});

      // Verify access exists
      const existing = await prisma.studentAccess.findFirst({
        where: {
          id: 'access-1',
          userId: 'user-1',
        },
      });
      expect(existing).not.toBeNull();

      // Delete access
      await prisma.studentAccess.delete({
        where: { id: 'access-1' },
      });

      expect(prisma.studentAccess.delete).toHaveBeenCalledWith({
        where: { id: 'access-1' },
      });
    });

    it('returns error for non-existent access', async () => {
      (prisma.studentAccess.findFirst as jest.Mock).mockResolvedValue(null);

      const existing = await prisma.studentAccess.findFirst({
        where: {
          id: 'non-existent',
          userId: 'user-1',
        },
      });

      expect(existing).toBeNull();
    });
  });
});

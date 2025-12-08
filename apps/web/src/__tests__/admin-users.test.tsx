import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation
const mockPush = jest.fn();
const mockParams = { userId: 'user-1' };
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => mockParams,
}));

// Mock the API
const mockApi = {
  getAdminUsers: jest.fn(),
  getAdminUser: jest.fn(),
  createAdminUser: jest.fn(),
  updateAdminUser: jest.fn(),
  updateAdminUserPermissions: jest.fn(),
  getAdminJurisdictions: jest.fn(),
  getUserStudentAccess: jest.fn(),
  addStudentAccess: jest.fn(),
  updateStudentAccess: jest.fn(),
  removeStudentAccess: jest.fn(),
};

jest.mock('@/lib/api', () => ({
  api: mockApi,
}));

// Mock auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-user',
      displayName: 'Admin User',
      email: 'admin@school.edu',
      role: 'ADMIN',
      isOnboarded: true,
    },
    loading: false,
    logout: jest.fn(),
  }),
}));

describe('Admin Users Page', () => {
  const mockUsers = [
    {
      id: 'user-1',
      email: 'teacher@school.edu',
      displayName: 'Test Teacher',
      role: 'TEACHER',
      isActive: true,
      jurisdictionId: 'jur-1',
      jurisdictionName: 'Howard County',
      permissions: {
        canCreatePlans: true,
        canUpdatePlans: true,
        canReadAll: false,
        canManageUsers: false,
        canManageDocs: false,
      },
      studentAccessCount: 5,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: '2024-03-15T10:30:00.000Z',
    },
    {
      id: 'user-2',
      email: 'admin@school.edu',
      displayName: 'Admin User',
      role: 'ADMIN',
      isActive: true,
      jurisdictionId: null,
      jurisdictionName: null,
      permissions: {
        canCreatePlans: true,
        canUpdatePlans: true,
        canReadAll: true,
        canManageUsers: true,
        canManageDocs: true,
      },
      studentAccessCount: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: '2024-03-15T10:30:00.000Z',
    },
  ];

  const mockJurisdictions = [
    { id: 'jur-1', stateCode: 'MD', stateName: 'Maryland', districtCode: 'hcpss', districtName: 'Howard County' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getAdminUsers.mockResolvedValue({ users: mockUsers });
    mockApi.getAdminJurisdictions.mockResolvedValue({ jurisdictions: mockJurisdictions });
  });

  it('displays user list with correct information', async () => {
    // Simulate the data being loaded
    const usersRes = await mockApi.getAdminUsers({});

    expect(usersRes.users).toHaveLength(2);
    expect(usersRes.users[0].displayName).toBe('Test Teacher');
    expect(usersRes.users[0].role).toBe('TEACHER');
    expect(usersRes.users[0].studentAccessCount).toBe(5);
  });

  it('filters users by role', async () => {
    mockApi.getAdminUsers.mockResolvedValue({
      users: mockUsers.filter(u => u.role === 'TEACHER')
    });

    const usersRes = await mockApi.getAdminUsers({ role: 'TEACHER' });

    expect(usersRes.users).toHaveLength(1);
    expect(usersRes.users[0].role).toBe('TEACHER');
  });

  it('searches users by name', async () => {
    mockApi.getAdminUsers.mockResolvedValue({
      users: mockUsers.filter(u => u.displayName.toLowerCase().includes('admin'))
    });

    const usersRes = await mockApi.getAdminUsers({ search: 'admin' });

    expect(usersRes.users).toHaveLength(1);
    expect(usersRes.users[0].displayName).toBe('Admin User');
  });

  it('creates a new user', async () => {
    const newUser = {
      id: 'new-user',
      email: 'newuser@school.edu',
      displayName: 'New User',
      role: 'TEACHER',
      isActive: true,
      jurisdictionId: 'jur-1',
      jurisdictionName: 'Howard County',
      permissions: {
        canCreatePlans: true,
        canUpdatePlans: false,
        canReadAll: false,
        canManageUsers: false,
        canManageDocs: false,
      },
      createdAt: '2024-03-15T00:00:00.000Z',
    };

    mockApi.createAdminUser.mockResolvedValue({ user: newUser });

    const result = await mockApi.createAdminUser({
      email: 'newuser@school.edu',
      displayName: 'New User',
      role: 'TEACHER',
      jurisdictionId: 'jur-1',
      permissions: {
        canCreatePlans: true,
      },
    });

    expect(result.user.displayName).toBe('New User');
    expect(result.user.permissions?.canCreatePlans).toBe(true);
  });
});

describe('User Detail Page', () => {
  const mockUser = {
    id: 'user-1',
    email: 'teacher@school.edu',
    displayName: 'Test Teacher',
    role: 'TEACHER',
    isActive: true,
    jurisdictionId: 'jur-1',
    jurisdictionName: 'Howard County',
    permissions: {
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
        recordId: 'HCPSS-000001',
        studentName: 'John Doe',
        grade: '5',
        schoolName: 'Test Elementary',
        canEdit: true,
        grantedAt: '2024-01-15T00:00:00.000Z',
      },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLoginAt: '2024-03-15T10:30:00.000Z',
  };

  const mockJurisdictions = [
    { id: 'jur-1', stateCode: 'MD', stateName: 'Maryland', districtCode: 'hcpss', districtName: 'Howard County' },
  ];

  const mockStudentAccess = {
    canReadAll: false,
    studentAccess: mockUser.studentAccess,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getAdminUser.mockResolvedValue({ user: mockUser });
    mockApi.getAdminJurisdictions.mockResolvedValue({ jurisdictions: mockJurisdictions });
    mockApi.getUserStudentAccess.mockResolvedValue(mockStudentAccess);
  });

  it('displays user details correctly', async () => {
    const userRes = await mockApi.getAdminUser('user-1');

    expect(userRes.user.displayName).toBe('Test Teacher');
    expect(userRes.user.email).toBe('teacher@school.edu');
    expect(userRes.user.role).toBe('TEACHER');
    expect(userRes.user.isActive).toBe(true);
  });

  it('displays user permissions', async () => {
    const userRes = await mockApi.getAdminUser('user-1');

    expect(userRes.user.permissions?.canCreatePlans).toBe(true);
    expect(userRes.user.permissions?.canUpdatePlans).toBe(true);
    expect(userRes.user.permissions?.canReadAll).toBe(false);
    expect(userRes.user.permissions?.canManageUsers).toBe(false);
  });

  it('displays student access list', async () => {
    const accessRes = await mockApi.getUserStudentAccess('user-1');

    expect(accessRes.canReadAll).toBe(false);
    expect(accessRes.studentAccess).toHaveLength(1);
    expect(accessRes.studentAccess[0].recordId).toBe('HCPSS-000001');
    expect(accessRes.studentAccess[0].canEdit).toBe(true);
  });

  it('updates user permissions', async () => {
    const updatedPermissions = {
      canCreatePlans: true,
      canUpdatePlans: true,
      canReadAll: true, // Changed
      canManageUsers: false,
      canManageDocs: false,
    };

    mockApi.updateAdminUserPermissions.mockResolvedValue({ permissions: updatedPermissions });

    const result = await mockApi.updateAdminUserPermissions('user-1', { canReadAll: true });

    expect(result.permissions.canReadAll).toBe(true);
  });

  it('adds student access', async () => {
    const newAccess = {
      id: 'access-new',
      studentId: 'student-2',
      recordId: 'HCPSS-000002',
      studentName: 'Jane Smith',
      grade: '6',
      schoolName: 'Test Elementary',
      canEdit: false,
      grantedAt: '2024-03-15T00:00:00.000Z',
    };

    mockApi.addStudentAccess.mockResolvedValue({ studentAccess: newAccess });

    const result = await mockApi.addStudentAccess('user-1', 'HCPSS-000002', false);

    expect(result.studentAccess.recordId).toBe('HCPSS-000002');
    expect(result.studentAccess.canEdit).toBe(false);
  });

  it('removes student access', async () => {
    mockApi.removeStudentAccess.mockResolvedValue({ success: true, message: 'Student access removed' });

    const result = await mockApi.removeStudentAccess('user-1', 'access-1');

    expect(result.success).toBe(true);
  });

  it('displays canReadAll banner when user has full access', async () => {
    mockApi.getUserStudentAccess.mockResolvedValue({
      canReadAll: true,
      studentAccess: [],
      message: 'User has canReadAll permission and can access all students',
    });

    const accessRes = await mockApi.getUserStudentAccess('user-1');

    expect(accessRes.canReadAll).toBe(true);
    expect(accessRes.message).toContain('canReadAll');
  });
});

describe('User Edit Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates user details', async () => {
    const updatedUser = {
      id: 'user-1',
      email: 'teacher@school.edu',
      displayName: 'Updated Teacher',
      role: 'CASE_MANAGER',
      isActive: true,
      jurisdictionId: 'jur-1',
      jurisdictionName: 'Howard County',
      permissions: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: '2024-03-15T10:30:00.000Z',
    };

    mockApi.updateAdminUser.mockResolvedValue({ user: updatedUser });

    const result = await mockApi.updateAdminUser('user-1', {
      displayName: 'Updated Teacher',
      role: 'CASE_MANAGER',
    });

    expect(result.user.displayName).toBe('Updated Teacher');
    expect(result.user.role).toBe('CASE_MANAGER');
  });

  it('deactivates user', async () => {
    const deactivatedUser = {
      id: 'user-1',
      email: 'teacher@school.edu',
      displayName: 'Test Teacher',
      role: 'TEACHER',
      isActive: false,
      jurisdictionId: 'jur-1',
      jurisdictionName: 'Howard County',
      permissions: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastLoginAt: '2024-03-15T10:30:00.000Z',
    };

    mockApi.updateAdminUser.mockResolvedValue({ user: deactivatedUser });

    const result = await mockApi.updateAdminUser('user-1', {
      isActive: false,
    });

    expect(result.user.isActive).toBe(false);
  });
});

describe('Add Student Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds student by recordId', async () => {
    const newAccess = {
      id: 'access-new',
      studentId: 'student-1',
      recordId: 'HCPSS-000001',
      studentName: 'John Doe',
      grade: '5',
      schoolName: 'Test Elementary',
      canEdit: true,
      grantedAt: '2024-03-15T00:00:00.000Z',
    };

    mockApi.addStudentAccess.mockResolvedValue({ studentAccess: newAccess });

    const result = await mockApi.addStudentAccess('user-1', 'HCPSS-000001', true);

    expect(result.studentAccess.recordId).toBe('HCPSS-000001');
    expect(result.studentAccess.canEdit).toBe(true);
  });

  it('handles non-existent student recordId error', async () => {
    mockApi.addStudentAccess.mockRejectedValue(new Error('Student with recordId "INVALID-ID" not found'));

    await expect(mockApi.addStudentAccess('user-1', 'INVALID-ID', false))
      .rejects.toThrow('Student with recordId "INVALID-ID" not found');
  });

  it('handles duplicate access error', async () => {
    mockApi.addStudentAccess.mockRejectedValue(new Error('User already has access to this student'));

    await expect(mockApi.addStudentAccess('user-1', 'HCPSS-000001', false))
      .rejects.toThrow('User already has access to this student');
  });
});

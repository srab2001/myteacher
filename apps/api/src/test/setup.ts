import { jest } from '@jest/globals';
(globalThis as Record<string, unknown>).jest = jest;

process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough';
// Jest test setup file
import { prisma } from '../lib/db.js';

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Global test utilities
export const mockUser = {
  id: 'test-user-id',
  googleId: 'google-123',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  role: null,
  stateCode: null,
  districtName: null,
  schoolName: null,
  jurisdictionId: null,
  isOnboarded: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockOnboardedUser = {
  ...mockUser,
  id: 'onboarded-user-id',
  role: 'TEACHER' as const,
  stateCode: 'MD',
  districtName: 'Howard County Public School System',
  schoolName: 'Test Elementary',
  isOnboarded: true,
};

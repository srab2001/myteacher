import { PrismaClient } from '@prisma/client';

// Global prisma client for serverless
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export all Prisma types
export * from '@prisma/client';

// Also export our manual enum types as fallback (these work even if Prisma isn't generated)
export * from '../types/prisma-enums.js';

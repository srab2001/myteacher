// Prisma 6.x - standard client (no adapter required)
import { PrismaClient, Prisma } from '@prisma/client';

// Global prisma client for development hot-reload
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

// Export the client type for use in other packages
export type { PrismaClient };

// Helper function to create a new PrismaClient (for seed scripts)
export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

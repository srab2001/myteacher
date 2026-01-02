// Vercel Serverless Function Entry Point
// @ts-nocheck - Skip type checking for this entry point
// Force rebuild: 2026-01-02T17:45 - Route ordering fixes for dashboard endpoints
// Prisma client location: node_modules/@prisma/client (NOT prisma/generated)
import { createApp } from '../src/app.js';

const app = createApp();

// Export for Vercel serverless
export default app;

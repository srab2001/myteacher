// Vercel Serverless Function Entry Point
// @ts-nocheck - Skip type checking for this entry point
// Force rebuild: 2026-01-01T19:15 - Clean Prisma cache
import { createApp } from '../src/app.js';

const app = createApp();

// Export for Vercel serverless
export default app;

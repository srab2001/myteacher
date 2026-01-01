// Vercel Serverless Function Entry Point
// @ts-nocheck - Skip type checking for this entry point
// Force rebuild: 2026-01-01 - Trigger fresh deployment
import { createApp } from '../src/app.js';

const app = createApp();

// Export for Vercel serverless
export default app;

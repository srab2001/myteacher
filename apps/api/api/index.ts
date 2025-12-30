// Vercel Serverless Function Entry Point
// @ts-nocheck - Skip type checking for this entry point
// Force rebuild: 2025-12-29
import { createApp } from '../src/app.js';

const app = createApp();

// Export for Vercel serverless
export default app;

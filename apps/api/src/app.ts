import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import passport from './config/passport.js';
import { env } from './config/env.js';
import { ApiError } from './errors.js';

import path from 'path';

// PostgreSQL session store
const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import studentRoutes from './routes/students.js';
import schemaRoutes from './routes/schemas.js';
import planRoutes from './routes/plans.js';
import goalRoutes from './routes/goals.js';
import serviceRoutes from './routes/services.js';
import workSampleRoutes from './routes/worksamples.js';
import priorPlanRoutes from './routes/priorplans.js';
import adminRoutes from './routes/admin.js';
import generationRoutes from './routes/generation.js';
import behaviorRoutes from './routes/behavior.js';
import artifactCompareRoutes from './routes/artifactCompare.js';
import referenceRoutes from './routes/reference.js';
import goalWizardRoutes from './routes/goalWizard.js';
import iepReportsRoutes from './routes/iepReports.js';

export function createApp(): Express {
  const app = express();

  // Trust proxy - required for secure cookies behind Vercel/proxies
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Session configuration with PostgreSQL store for serverless
  app.use(
    session({
      store: new PgSession({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      name: 'myteacher.sid',
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      proxy: true,
      cookie: {
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      },
    })
  );

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Static file serving for uploads
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  app.use('/uploads', express.static(path.resolve(uploadDir)));

  // API routes
  app.use('/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/schemas', schemaRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api', planRoutes); // For /api/students/:id/plans routes
  app.use('/api/goals', goalRoutes);
  app.use('/api', goalRoutes); // For /api/plans/:id/goals routes
  app.use('/api/services', serviceRoutes);
  app.use('/api', serviceRoutes); // For /api/plans/:id/services routes
  app.use('/api/goals', workSampleRoutes); // For /api/goals/:id/work-samples
  app.use('/api/prior-plans', priorPlanRoutes); // For /api/prior-plans/:id/download
  app.use('/api', priorPlanRoutes); // For /api/students/:id/prior-plans routes
  app.use('/api/admin', adminRoutes); // Admin routes
  app.use('/api', generationRoutes); // Content generation routes
  app.use('/api/behavior-plans', behaviorRoutes); // Behavior plan routes
  app.use('/api/behavior-targets', behaviorRoutes); // Behavior target routes
  app.use('/api/behavior-events', behaviorRoutes); // Behavior event routes
  app.use('/api', artifactCompareRoutes); // Artifact compare routes (/api/plans/:planId/artifact-compare)
  app.use('/api/artifact-compare', artifactCompareRoutes); // For /api/artifact-compare/students/:studentId/artifact-compares
  app.use('/api/reference', referenceRoutes); // Reference data routes (states, districts, schools)
  app.use('/api', goalWizardRoutes); // Goal wizard routes (present levels, draft, validation)
  app.use('/api/goal-wizard', goalWizardRoutes); // Alternative mounting point
  app.use('/api', iepReportsRoutes); // IEP Reports routes (Independent Assessment Reviews)
  app.use('/api', iepReportsRoutes); // For /api/students/:studentId/iep-reports

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // Handle ApiError instances
    if (err instanceof ApiError) {
      console.error(`[${err.code}] ${err.message}`, err.details || '');
      return res.status(err.status).json(err.toJSON());
    }

    // Handle other errors
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: {
        code: 'ERR_API_INTERNAL',
        message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      },
    });
  });

  return app;
}

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from './config/passport.js';
import { env } from './config/env.js';

import path from 'path';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import studentRoutes from './routes/students.js';
import schemaRoutes from './routes/schemas.js';
import planRoutes from './routes/plans.js';
import goalRoutes from './routes/goals.js';
import serviceRoutes from './routes/services.js';
import workSampleRoutes from './routes/worksamples.js';

export function createApp(): Express {
  const app = express();

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

  // Session configuration
  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
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

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  });

  return app;
}

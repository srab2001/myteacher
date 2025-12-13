import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/db.js';

const router = Router();

// Local login (username/password)
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err: Error | null, user: Express.User | false, info: { message: string }) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      // Save session explicitly before responding (important for async stores)
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return next(saveErr);
        }
        return res.json({
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            stateCode: user.stateCode,
            districtName: user.districtName,
            schoolName: user.schoolName,
            isOnboarded: user.isOnboarded,
          },
        });
      });
    });
  })(req, res, next);
});

// Google OAuth routes (only if configured)
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
  // Initiate Google OAuth
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
    })
  );

  // Google OAuth callback with custom error handling
  router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', (err: Error | null, user: Express.User | false, info: unknown) => {
      if (err) {
        console.error('Google OAuth error:', err.message);
        console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
        // Check for specific error types
        const errorCode = (err as { code?: string }).code || 'unknown';
        return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_error&code=${errorCode}`);
      }

      if (!user) {
        console.error('Google OAuth - no user returned, info:', info);
        return res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error after OAuth:', loginErr);
          return res.redirect(`${env.FRONTEND_URL}/login?error=login_failed`);
        }

        // Save session explicitly before redirect (important for async stores)
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error after OAuth:', saveErr);
            return res.redirect(`${env.FRONTEND_URL}/login?error=session_failed`);
          }
          // Redirect based on onboarding status
          if (req.user?.isOnboarded) {
            res.redirect(`${env.FRONTEND_URL}/dashboard`);
          } else {
            res.redirect(`${env.FRONTEND_URL}/onboarding`);
          }
        });
      });
    })(req, res, next);
  });
} else {
  // Fallback routes when Google OAuth is not configured
  router.get('/google', (req, res) => {
    console.error('Google OAuth not configured. Missing env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL');
    res.status(503).json({
      error: 'Google OAuth is not configured',
      message: 'Please use username/password login or configure Google OAuth credentials',
    });
  });

  router.get('/google/callback', (req, res) => {
    res.redirect(`${env.FRONTEND_URL}/?error=oauth_not_configured`);
  });
}

// Logout
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
});

// Debug endpoint to check OAuth configuration (no secrets exposed)
router.get('/debug-oauth', (req, res) => {
  const clientSecret = env.GOOGLE_CLIENT_SECRET || '';
  res.json({
    googleConfigured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL),
    callbackUrl: env.GOOGLE_CALLBACK_URL || 'NOT SET',
    frontendUrl: env.FRONTEND_URL || 'NOT SET',
    clientIdPrefix: env.GOOGLE_CLIENT_ID ? env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'NOT SET',
    // Show client secret format hints without exposing the actual secret
    clientSecretLength: clientSecret.length,
    clientSecretPrefix: clientSecret.substring(0, 6) + '...',
    clientSecretHasSpaces: clientSecret.includes(' '),
    clientSecretHasNewlines: clientSecret.includes('\n'),
    nodeEnv: env.NODE_ENV || 'NOT SET',
    cookieSecure: env.NODE_ENV === 'production',
    cookieSameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
});

// Debug endpoint to check database connectivity
router.get('/debug-db', async (req, res) => {
  const dbUrl = process.env.DATABASE_URL || '';
  const urlPrefix = dbUrl.substring(0, 15); // Show first 15 chars to debug format
  try {
    const userCount = await prisma.appUser.count();
    res.json({
      connected: true,
      userCount,
      databaseUrlSet: !!process.env.DATABASE_URL,
      urlPrefix,
    });
  } catch (error) {
    res.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      databaseUrlSet: !!process.env.DATABASE_URL,
      urlPrefix,
    });
  }
});

// Debug session endpoint
router.get('/debug-session', (req, res) => {
  res.json({
    hasSessionCookie: !!req.cookies['myteacher.sid'],
    cookieNames: Object.keys(req.cookies || {}),
    sessionId: req.sessionID ? req.sessionID.substring(0, 10) + '...' : 'none',
    isAuthenticated: req.isAuthenticated?.() || false,
    hasUser: !!req.user,
    userId: req.user?.id || null,
  });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      displayName: req.user!.displayName,
      avatarUrl: req.user!.avatarUrl,
      role: req.user!.role,
      stateCode: req.user!.stateCode,
      districtName: req.user!.districtName,
      schoolName: req.user!.schoolName,
      isOnboarded: req.user!.isOnboarded,
    },
  });
});

// Password reset endpoint (protected by reset key)
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword, resetKey } = req.body;

    // Verify reset key (use SESSION_SECRET as the reset key for simplicity)
    const expectedKey = env.SESSION_SECRET;
    if (!resetKey || resetKey !== expectedKey) {
      return res.status(403).json({ error: 'Invalid reset key' });
    }

    if (!username || !newPassword) {
      return res.status(400).json({ error: 'Username and new password are required' });
    }

    // Find user
    const user = await prisma.appUser.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.appUser.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    console.log('Password reset successful for user:', username);
    return res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;

import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
    })
  );

  router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', async (err: Error | null, user: Express.User | false, info: unknown) => {
      if (err) {
        console.error('Google OAuth error:', err.message);
        const errorCode = (err as { code?: string }).code || 'unknown';
        return res.redirect(`${env.FRONTEND_URL}/?error=oauth_error&code=${errorCode}`);
      }

      if (!user) {
        console.error('Google OAuth - no user returned, info:', info);
        return res.redirect(`${env.FRONTEND_URL}/?error=auth_failed`);
      }

      try {
        const authCode = crypto.randomBytes(32).toString('hex');
        await prisma.authCode.create({
          data: {
            id: authCode,
            userId: user.id,
            expiresAt: new Date(Date.now() + 60 * 1000),
          },
        });

        const redirectPath = user.isOnboarded ? '/dashboard' : '/onboarding';
        res.redirect(`${env.FRONTEND_URL}/auth/callback?code=${authCode}&redirect=${encodeURIComponent(redirectPath)}`);
      } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect(`${env.FRONTEND_URL}/?error=auth_failed`);
      }
    })(req, res, next);
  });
} else {
  router.get('/google', (req, res) => {
    res.status(503).json({ error: 'Google OAuth is not configured' });
  });

  router.get('/google/callback', (req, res) => {
    res.redirect(`${env.FRONTEND_URL}/?error=oauth_not_configured`);
  });
}

// Logout
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('myteacher.sid');
      res.json({ success: true });
    });
  });
});

// Debug endpoints
router.get('/debug-oauth', (req, res) => {
  const clientSecret = env.GOOGLE_CLIENT_SECRET || '';
  res.json({
    googleConfigured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL),
    callbackUrl: env.GOOGLE_CALLBACK_URL || 'NOT SET',
    frontendUrl: env.FRONTEND_URL || 'NOT SET',
    clientIdPrefix: env.GOOGLE_CLIENT_ID ? env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'NOT SET',
    clientSecretLength: clientSecret.length,
    clientSecretPrefix: clientSecret.substring(0, 6) + '...',
    clientSecretHasSpaces: clientSecret.includes(' '),
    clientSecretHasNewlines: clientSecret.includes('\n'),
    nodeEnv: env.NODE_ENV || 'NOT SET',
    cookieSecure: env.NODE_ENV === 'production',
    cookieSameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
});

router.get('/debug-db', async (req, res) => {
  try {
    const userCount = await prisma.appUser.count();
    res.json({ connected: true, userCount, databaseUrlSet: !!process.env.DATABASE_URL });
  } catch (error) {
    res.json({ connected: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

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

// Token exchange endpoint - exchanges auth code for session
router.get('/token-exchange', async (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).json({ error: 'Missing auth code' });
  }

  try {
    const authData = await prisma.authCode.findUnique({ where: { id: code } });

    if (!authData) {
      return res.status(401).json({ error: 'Invalid or expired auth code' });
    }

    if (authData.expiresAt < new Date()) {
      await prisma.authCode.delete({ where: { id: code } });
      return res.status(401).json({ error: 'Auth code expired' });
    }

    await prisma.authCode.delete({ where: { id: code } });

    const user = await prisma.appUser.findUnique({ where: { id: authData.userId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.logIn(user as Express.User, (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return res.status(500).json({ error: 'Login failed' });
      }

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.status(500).json({ error: 'Session creation failed' });
        }

        return res.json({
          success: true,
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
  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({ error: 'Token exchange failed' });
  }
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

// Password reset
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword, resetKey } = req.body;
    if (!resetKey || resetKey !== env.SESSION_SECRET) {
      return res.status(403).json({ error: 'Invalid reset key' });
    }
    if (!username || !newPassword) {
      return res.status(400).json({ error: 'Username and new password are required' });
    }
    const user = await prisma.appUser.findUnique({ where: { username } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.appUser.update({ where: { id: user.id }, data: { passwordHash } });
    return res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Cleanup expired auth codes on startup
async function cleanupExpiredAuthCodes() {
  try {
    const deleted = await prisma.authCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (deleted.count > 0) console.log(`Cleaned up ${deleted.count} expired auth codes`);
  } catch (error) {
    console.error('Failed to cleanup expired auth codes:', error);
  }
}
cleanupExpiredAuthCodes();

export default router;

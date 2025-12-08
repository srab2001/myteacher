import { Router } from 'express';
import passport from 'passport';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

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

  // Google OAuth callback
  router.get(
    '/google/callback',
    passport.authenticate('google', {
      failureRedirect: `${env.FRONTEND_URL}/login?error=auth_failed`,
    }),
    (req, res) => {
      // Redirect based on onboarding status
      if (req.user?.isOnboarded) {
        res.redirect(`${env.FRONTEND_URL}/dashboard`);
      } else {
        res.redirect(`${env.FRONTEND_URL}/onboarding`);
      }
    }
  );
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

export default router;

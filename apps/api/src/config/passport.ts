import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db.js';
import { env } from './env.js';
// Note: Express.User type augmentation is in ../types/express.d.ts (auto-included by TypeScript)

passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.appUser.findUnique({
      where: { id },
      include: { jurisdiction: true },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy (username/password)
passport.use(
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
    },
    async (username, password, done) => {
      try {
        console.log('Login attempt for username:', username);

        // Find user by username
        const user = await prisma.appUser.findUnique({
          where: { username },
        });

        console.log('User found:', user ? 'yes' : 'no');

        if (!user) {
          console.log('Login failed: user not found');
          return done(null, false, { message: 'Invalid username or password' });
        }

        if (!user.passwordHash) {
          console.log('Login failed: no password hash');
          return done(null, false, { message: 'This account does not support password login' });
        }

        console.log('Password hash exists, verifying...');

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        console.log('Password valid:', isValidPassword);

        if (!isValidPassword) {
          console.log('Login failed: invalid password');
          return done(null, false, { message: 'Invalid username or password' });
        }

        console.log('Login successful for user:', user.id);
        return done(null, user);
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }
  )
);

// Google OAuth Strategy (only if credentials are configured)
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: Express.User) => void
      ) => {
        try {
          console.log('Google OAuth callback - profile received:', profile.id);
          const email = profile.emails?.[0]?.value;
          if (!email) {
            console.error('Google OAuth - No email in profile');
            return done(new Error('No email found in Google profile'));
          }
          console.log('Google OAuth - email:', email);

          // Try to find existing user by googleId
          console.log('Google OAuth - searching for user by googleId:', profile.id);
          let user = await prisma.appUser.findUnique({
            where: { googleId: profile.id },
          });
          console.log('Google OAuth - user found by googleId:', !!user);

          if (!user) {
            // Not found by googleId - check if user exists with this email
            console.log('Google OAuth - searching for user by email:', email);
            const existingUserByEmail = await prisma.appUser.findUnique({
              where: { email },
            });

            if (existingUserByEmail) {
              if (existingUserByEmail.googleId && existingUserByEmail.googleId !== profile.id) {
                // User exists with a different Google account - security concern
                console.error('Google OAuth - email already linked to different Google account');
                return done(new Error('This email is already linked to a different Google account'));
              }
              // User exists but has no googleId (e.g., created by admin) - link their Google account
              console.log('Google OAuth - linking Google account to existing user:', existingUserByEmail.id);
              user = await prisma.appUser.update({
                where: { id: existingUserByEmail.id },
                data: {
                  googleId: profile.id,
                  avatarUrl: existingUserByEmail.avatarUrl || profile.photos?.[0]?.value,
                },
              });
              console.log('Google OAuth - Google account linked to existing user:', user.id);
            } else {
              // No user found - create new user
              console.log('Google OAuth - creating new user');
              user = await prisma.appUser.create({
                data: {
                  googleId: profile.id,
                  email,
                  displayName: profile.displayName || email,
                  avatarUrl: profile.photos?.[0]?.value,
                },
              });
              console.log('Google OAuth - new user created:', user.id);
            }
          }

          return done(null, user);
        } catch (error) {
          console.error('Google OAuth callback error:', error);
          return done(error as Error);
        }
      }
    )
  );
}

export default passport;

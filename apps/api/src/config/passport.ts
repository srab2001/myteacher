import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { prisma, AppUser } from '@myteacher/db';
import { env } from './env.js';

// Extend Express.User to include our AppUser type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User extends AppUser {}
  }
}

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
        // Find user by username
        const user = await prisma.appUser.findUnique({
          where: { username },
        });

        if (!user) {
          return done(null, false, { message: 'Invalid username or password' });
        }

        if (!user.passwordHash) {
          return done(null, false, { message: 'This account does not support password login' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid username or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Google OAuth Strategy
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
      done: (error: Error | null, user?: AppUser) => void
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Try to find existing user by googleId
        let user = await prisma.appUser.findUnique({
          where: { googleId: profile.id },
        });

        if (!user) {
          // Create new user
          user = await prisma.appUser.create({
            data: {
              googleId: profile.id,
              email,
              displayName: profile.displayName || email,
              avatarUrl: profile.photos?.[0]?.value,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

export default passport;

import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { prisma, AppUser } from '../lib/db.js';
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
}

export default passport;

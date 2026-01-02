// Express type augmentation for authentication
import 'express-session';

// Define the user type inline to avoid Prisma dependency
interface AppUserType {
  id: string;
  googleId: string | null;
  username: string | null;
  passwordHash: string | null;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'TEACHER' | 'CASE_MANAGER' | 'ADMIN' | 'RELATED_SERVICE_PROVIDER' | 'READ_ONLY' | null;
  stateCode: string | null;
  districtName: string | null;
  schoolName: string | null;
  jurisdictionId: string | null;
  isOnboarded: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface User extends AppUserType {}
  }
}

declare module 'express-session' {
  interface SessionData {
    passport?: {
      user?: string;
    };
  }
}

export {};

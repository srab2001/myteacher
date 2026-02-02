/**
 * User-related types and interfaces
 */

import { UUID, Timestamp, UserRole } from './common';

export interface User extends Timestamp {
  id: UUID;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  emailVerified?: Date;
  lastLoginAt?: Date;
}

export interface UserProfile extends User {
  bio?: string;
  organization?: string;
  specializations?: string[];
  notificationPreferences: NotificationPreferences;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  deadlineReminders: boolean;
  reminderDaysBefore: number;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  organization?: string;
  specializations?: string[];
  notificationPreferences?: Partial<NotificationPreferences>;
}

export interface UserSession {
  userId: UUID;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Password Utilities for MyTeacher
 *
 * Provides secure password hashing, verification, temp password generation,
 * and password strength validation.
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure temporary password
 * Uses characters that are easy to read (no 0/O, 1/l confusion)
 */
export function generateTempPassword(length: number = 12): string {
  // Exclude ambiguous characters: 0, O, l, 1, I
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const specialChars = '!@#$%&*';

  let password = '';

  // Generate random bytes and map to allowed characters
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length - 2; i++) {
    password += chars[randomBytes[i] % chars.length];
  }

  // Ensure at least one special character and one number
  password += specialChars[randomBytes[length - 2] % specialChars.length];
  password += '23456789'[randomBytes[length - 1] % 8];

  // Shuffle the password
  return password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

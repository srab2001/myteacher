import { prisma } from '../lib/db.js';

/**
 * Service for generating unique student record IDs
 * Format: STU-XXXXXX (e.g., STU-000001, STU-000002)
 */

const STUDENT_ID_PREFIX = 'STU';
const STUDENT_ID_PAD_LENGTH = 6;

/**
 * Generates the next available student record ID
 * Uses database transaction to ensure uniqueness
 */
export async function generateStudentRecordId(): Promise<string> {
  // Find the highest existing record ID
  const lastStudent = await prisma.student.findFirst({
    where: {
      recordId: {
        startsWith: `${STUDENT_ID_PREFIX}-`,
      },
    },
    orderBy: {
      recordId: 'desc',
    },
    select: {
      recordId: true,
    },
  });

  let nextNumber = 1;

  if (lastStudent?.recordId) {
    // Extract the numeric part from the last record ID
    const match = lastStudent.recordId.match(/^STU-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format with zero-padding
  const paddedNumber = String(nextNumber).padStart(STUDENT_ID_PAD_LENGTH, '0');
  return `${STUDENT_ID_PREFIX}-${paddedNumber}`;
}

/**
 * Validates that a record ID follows the expected format
 */
export function isValidStudentRecordId(recordId: string): boolean {
  const pattern = new RegExp(`^${STUDENT_ID_PREFIX}-\\d{${STUDENT_ID_PAD_LENGTH}}$`);
  return pattern.test(recordId);
}

/**
 * Parses the numeric portion of a student record ID
 */
export function parseStudentRecordId(recordId: string): number | null {
  const match = recordId.match(/^STU-(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

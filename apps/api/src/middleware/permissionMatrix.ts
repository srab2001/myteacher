/**
 * Permission Matrix for IEP, IEP Report, 504 Plan, and BIP features
 *
 * This file defines the canonical permission matrix for all role-based capabilities.
 * All permission checks in the application should reference this matrix.
 */

// ==============================================
// TYPES
// ==============================================

export type UserRole =
  | 'ADMIN'
  | 'TEACHER'
  | 'CASE_MANAGER'
  | 'RELATED_SERVICE_PROVIDER'
  | 'READ_ONLY';

export type Capability =
  // System Configuration (ADMIN only)
  | 'CONFIG_FIELD_DEFINITIONS'
  | 'CONFIG_FIELD_OPTIONS'
  | 'CONFIG_SCHOOLS'
  // 504 System Configuration (ADMIN only)
  | 'CONFIG_504_FIELD_DEFINITIONS'
  | 'CONFIG_504_FIELD_OPTIONS'
  // BIP System Configuration (ADMIN only)
  | 'CONFIG_BIP_FIELD_DEFINITIONS'
  | 'CONFIG_BIP_FIELD_OPTIONS'
  // Student Management
  | 'CREATE_STUDENT'
  | 'UPDATE_STUDENT_DEMOGRAPHICS'
  | 'UPDATE_STUDENT_GRADE'
  | 'SELECT_STUDENT_SCHOOL'
  // IEP Operations
  | 'CREATE_IEP'
  | 'UPDATE_IEP_CONTENT'
  | 'FINALIZE_IEP'
  // IEP Report Operations
  | 'CREATE_IEP_REPORT'
  | 'UPDATE_IEP_REPORT'
  | 'FINALIZE_IEP_REPORT'
  // 504 Plan Operations
  | 'CREATE_504_REFERRAL'
  | 'UPDATE_504_REFERRAL'
  | 'FINALIZE_504_REFERRAL'
  | 'VIEW_504_REFERRAL'
  // BIP Operations
  | 'CREATE_BIP'
  | 'UPDATE_BIP'
  | 'FINALIZE_BIP'
  | 'VIEW_BIP'
  // Viewing
  | 'VIEW_ALL_STUDENTS'
  | 'VIEW_ASSIGNED_STUDENTS';

// ==============================================
// PERMISSION MATRIX
// ==============================================

const PERMISSION_MATRIX: Record<Capability, UserRole[]> = {
  // System Configuration - ADMIN only
  CONFIG_FIELD_DEFINITIONS: ['ADMIN'],
  CONFIG_FIELD_OPTIONS: ['ADMIN'],
  CONFIG_SCHOOLS: ['ADMIN'],

  // 504 System Configuration - ADMIN only
  CONFIG_504_FIELD_DEFINITIONS: ['ADMIN'],
  CONFIG_504_FIELD_OPTIONS: ['ADMIN'],

  // BIP System Configuration - ADMIN only
  CONFIG_BIP_FIELD_DEFINITIONS: ['ADMIN'],
  CONFIG_BIP_FIELD_OPTIONS: ['ADMIN'],

  // Student Management
  CREATE_STUDENT: ['ADMIN', 'TEACHER', 'CASE_MANAGER'],
  UPDATE_STUDENT_DEMOGRAPHICS: ['ADMIN', 'TEACHER', 'CASE_MANAGER'],
  UPDATE_STUDENT_GRADE: ['ADMIN', 'TEACHER', 'CASE_MANAGER'],
  SELECT_STUDENT_SCHOOL: ['ADMIN', 'TEACHER', 'CASE_MANAGER'],

  // IEP Operations
  CREATE_IEP: ['ADMIN', 'TEACHER', 'CASE_MANAGER'],
  UPDATE_IEP_CONTENT: ['ADMIN', 'TEACHER', 'CASE_MANAGER', 'RELATED_SERVICE_PROVIDER'],
  FINALIZE_IEP: ['ADMIN', 'CASE_MANAGER'],

  // IEP Report Operations
  CREATE_IEP_REPORT: ['ADMIN', 'TEACHER', 'CASE_MANAGER'],
  UPDATE_IEP_REPORT: ['ADMIN', 'TEACHER', 'CASE_MANAGER', 'RELATED_SERVICE_PROVIDER'],
  FINALIZE_IEP_REPORT: ['ADMIN', 'CASE_MANAGER'],

  // 504 Plan Operations
  CREATE_504_REFERRAL: ['ADMIN', 'TEACHER', 'CASE_MANAGER'],
  UPDATE_504_REFERRAL: ['ADMIN', 'TEACHER', 'CASE_MANAGER'],
  FINALIZE_504_REFERRAL: ['ADMIN', 'CASE_MANAGER'],
  VIEW_504_REFERRAL: ['ADMIN', 'TEACHER', 'CASE_MANAGER', 'RELATED_SERVICE_PROVIDER', 'READ_ONLY'],

  // BIP Operations
  CREATE_BIP: ['ADMIN', 'TEACHER', 'CASE_MANAGER'],
  UPDATE_BIP: ['ADMIN', 'TEACHER', 'CASE_MANAGER', 'RELATED_SERVICE_PROVIDER'],
  FINALIZE_BIP: ['ADMIN', 'CASE_MANAGER'],
  VIEW_BIP: ['ADMIN', 'TEACHER', 'CASE_MANAGER', 'RELATED_SERVICE_PROVIDER', 'READ_ONLY'],

  // Viewing
  VIEW_ALL_STUDENTS: ['ADMIN'],
  VIEW_ASSIGNED_STUDENTS: ['ADMIN', 'TEACHER', 'CASE_MANAGER', 'RELATED_SERVICE_PROVIDER', 'READ_ONLY'],
};

// ==============================================
// PERMISSION CHECK FUNCTIONS
// ==============================================

export function hasCapability(role: UserRole | string, capability: Capability): boolean {
  const allowedRoles = PERMISSION_MATRIX[capability];
  return allowedRoles.includes(role as UserRole);
}

export function getRoleCapabilities(role: UserRole | string): Capability[] {
  const capabilities: Capability[] = [];

  for (const [capability, roles] of Object.entries(PERMISSION_MATRIX)) {
    if (roles.includes(role as UserRole)) {
      capabilities.push(capability as Capability);
    }
  }

  return capabilities;
}

export function canConfigureSystem(role: UserRole | string): boolean {
  return hasCapability(role, 'CONFIG_FIELD_DEFINITIONS') &&
         hasCapability(role, 'CONFIG_FIELD_OPTIONS') &&
         hasCapability(role, 'CONFIG_SCHOOLS');
}

export function canManageStudents(role: UserRole | string): boolean {
  return hasCapability(role, 'CREATE_STUDENT') &&
         hasCapability(role, 'UPDATE_STUDENT_DEMOGRAPHICS');
}

export function canManageIEPs(role: UserRole | string): boolean {
  return hasCapability(role, 'CREATE_IEP') &&
         hasCapability(role, 'UPDATE_IEP_CONTENT');
}

export function canFinalize(role: UserRole | string): boolean {
  return hasCapability(role, 'FINALIZE_IEP') &&
         hasCapability(role, 'FINALIZE_IEP_REPORT');
}

export function canConfigure504System(role: UserRole | string): boolean {
  return hasCapability(role, 'CONFIG_504_FIELD_DEFINITIONS') &&
         hasCapability(role, 'CONFIG_504_FIELD_OPTIONS');
}

export function canManage504Referrals(role: UserRole | string): boolean {
  return hasCapability(role, 'CREATE_504_REFERRAL') &&
         hasCapability(role, 'UPDATE_504_REFERRAL');
}

export function canFinalize504Referral(role: UserRole | string): boolean {
  return hasCapability(role, 'FINALIZE_504_REFERRAL');
}

export function canConfigureBIPSystem(role: UserRole | string): boolean {
  return hasCapability(role, 'CONFIG_BIP_FIELD_DEFINITIONS') &&
         hasCapability(role, 'CONFIG_BIP_FIELD_OPTIONS');
}

export function canManageBIPs(role: UserRole | string): boolean {
  return hasCapability(role, 'CREATE_BIP') &&
         hasCapability(role, 'UPDATE_BIP');
}

export function canFinalizeBIP(role: UserRole | string): boolean {
  return hasCapability(role, 'FINALIZE_BIP');
}

export function canViewAllStudents(role: UserRole | string): boolean {
  return hasCapability(role, 'VIEW_ALL_STUDENTS');
}

export { PERMISSION_MATRIX };

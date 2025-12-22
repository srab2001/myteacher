/**
 * Role-based Permission Middleware
 *
 * Express middleware functions that enforce the permission matrix.
 * All permission failures return HTTP 403 Forbidden.
 */

import { Request, Response, NextFunction } from 'express';
import { hasCapability, Capability, UserRole } from './permissionMatrix.js';

// ==============================================
// GENERIC CAPABILITY MIDDLEWARE
// ==============================================

export function requireCapability(capability: Capability) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = req.user?.role as UserRole | undefined;

    if (!userRole) {
      return res.status(403).json({ error: 'User role not found' });
    }

    if (!hasCapability(userRole, capability)) {
      return res.status(403).json({
        error: 'Permission denied',
        capability,
        requiredRoles: getRequiredRolesMessage(capability),
      });
    }

    next();
  };
}

export function requireAnyCapability(...capabilities: Capability[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = req.user?.role as UserRole | undefined;

    if (!userRole) {
      return res.status(403).json({ error: 'User role not found' });
    }

    const hasAny = capabilities.some((cap) => hasCapability(userRole, cap));

    if (!hasAny) {
      return res.status(403).json({
        error: 'Permission denied',
        requiredCapabilities: capabilities,
      });
    }

    next();
  };
}

export function requireAllCapabilities(...capabilities: Capability[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = req.user?.role as UserRole | undefined;

    if (!userRole) {
      return res.status(403).json({ error: 'User role not found' });
    }

    const missingCapabilities = capabilities.filter(
      (cap) => !hasCapability(userRole, cap)
    );

    if (missingCapabilities.length > 0) {
      return res.status(403).json({
        error: 'Permission denied',
        missingCapabilities,
      });
    }

    next();
  };
}

// ==============================================
// SYSTEM CONFIGURATION MIDDLEWARE
// ==============================================

export const requireConfigFieldDefinitions = requireCapability('CONFIG_FIELD_DEFINITIONS');
export const requireConfigFieldOptions = requireCapability('CONFIG_FIELD_OPTIONS');
export const requireConfigSchools = requireCapability('CONFIG_SCHOOLS');

// ==============================================
// STUDENT MANAGEMENT MIDDLEWARE
// ==============================================

export const requireCreateStudent = requireCapability('CREATE_STUDENT');
export const requireUpdateStudentDemographics = requireCapability('UPDATE_STUDENT_DEMOGRAPHICS');
export const requireUpdateStudentGrade = requireCapability('UPDATE_STUDENT_GRADE');
export const requireSelectStudentSchool = requireCapability('SELECT_STUDENT_SCHOOL');

// ==============================================
// IEP OPERATIONS MIDDLEWARE
// ==============================================

export const requireCreateIEP = requireCapability('CREATE_IEP');
export const requireUpdateIEPContent = requireCapability('UPDATE_IEP_CONTENT');
export const requireFinalizeIEP = requireCapability('FINALIZE_IEP');

// ==============================================
// IEP REPORT OPERATIONS MIDDLEWARE
// ==============================================

export const requireCreateIEPReport = requireCapability('CREATE_IEP_REPORT');
export const requireUpdateIEPReport = requireCapability('UPDATE_IEP_REPORT');
export const requireFinalizeIEPReport = requireCapability('FINALIZE_IEP_REPORT');

// ==============================================
// 504 PLAN CONFIGURATION MIDDLEWARE
// ==============================================

export const requireConfig504FieldDefinitions = requireCapability('CONFIG_504_FIELD_DEFINITIONS');
export const requireConfig504FieldOptions = requireCapability('CONFIG_504_FIELD_OPTIONS');

// ==============================================
// 504 PLAN OPERATIONS MIDDLEWARE
// ==============================================

export const requireCreate504Referral = requireCapability('CREATE_504_REFERRAL');
export const requireUpdate504Referral = requireCapability('UPDATE_504_REFERRAL');
export const requireFinalize504Referral = requireCapability('FINALIZE_504_REFERRAL');
export const requireView504Referral = requireCapability('VIEW_504_REFERRAL');

// ==============================================
// BIP CONFIGURATION MIDDLEWARE
// ==============================================

export const requireConfigBIPFieldDefinitions = requireCapability('CONFIG_BIP_FIELD_DEFINITIONS');
export const requireConfigBIPFieldOptions = requireCapability('CONFIG_BIP_FIELD_OPTIONS');

// ==============================================
// BIP OPERATIONS MIDDLEWARE
// ==============================================

export const requireCreateBIP = requireCapability('CREATE_BIP');
export const requireUpdateBIP = requireCapability('UPDATE_BIP');
export const requireFinalizeBIP = requireCapability('FINALIZE_BIP');
export const requireViewBIP = requireCapability('VIEW_BIP');

// ==============================================
// VIEWING MIDDLEWARE
// ==============================================

export const requireViewAllStudents = requireCapability('VIEW_ALL_STUDENTS');
export const requireViewAssignedStudents = requireCapability('VIEW_ASSIGNED_STUDENTS');

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function getRequiredRolesMessage(capability: Capability): string {
  const roleMessages: Record<Capability, string> = {
    CONFIG_FIELD_DEFINITIONS: 'ADMIN',
    CONFIG_FIELD_OPTIONS: 'ADMIN',
    CONFIG_SCHOOLS: 'ADMIN',
    CONFIG_504_FIELD_DEFINITIONS: 'ADMIN',
    CONFIG_504_FIELD_OPTIONS: 'ADMIN',
    CONFIG_BIP_FIELD_DEFINITIONS: 'ADMIN',
    CONFIG_BIP_FIELD_OPTIONS: 'ADMIN',
    CREATE_STUDENT: 'ADMIN, TEACHER, or CASE_MANAGER',
    UPDATE_STUDENT_DEMOGRAPHICS: 'ADMIN, TEACHER, or CASE_MANAGER',
    UPDATE_STUDENT_GRADE: 'ADMIN, TEACHER, or CASE_MANAGER',
    SELECT_STUDENT_SCHOOL: 'ADMIN, TEACHER, or CASE_MANAGER',
    CREATE_IEP: 'ADMIN, TEACHER, or CASE_MANAGER',
    UPDATE_IEP_CONTENT: 'ADMIN, TEACHER, CASE_MANAGER, or RELATED_SERVICE_PROVIDER',
    FINALIZE_IEP: 'ADMIN or CASE_MANAGER',
    CREATE_IEP_REPORT: 'ADMIN, TEACHER, or CASE_MANAGER',
    UPDATE_IEP_REPORT: 'ADMIN, TEACHER, CASE_MANAGER, or RELATED_SERVICE_PROVIDER',
    FINALIZE_IEP_REPORT: 'ADMIN or CASE_MANAGER',
    CREATE_504_REFERRAL: 'ADMIN, TEACHER, or CASE_MANAGER',
    UPDATE_504_REFERRAL: 'ADMIN, TEACHER (assigned), or CASE_MANAGER',
    FINALIZE_504_REFERRAL: 'ADMIN or CASE_MANAGER',
    VIEW_504_REFERRAL: 'All roles (for assigned students)',
    CREATE_BIP: 'ADMIN, TEACHER, or CASE_MANAGER',
    UPDATE_BIP: 'ADMIN, TEACHER (assigned), CASE_MANAGER, or RELATED_SERVICE_PROVIDER',
    FINALIZE_BIP: 'ADMIN or CASE_MANAGER',
    VIEW_BIP: 'All roles (for assigned students)',
    VIEW_ALL_STUDENTS: 'ADMIN',
    VIEW_ASSIGNED_STUDENTS: 'All roles',
  };

  return roleMessages[capability];
}

export function userHasCapability(req: Request, capability: Capability): boolean {
  const userRole = req.user?.role as UserRole | undefined;
  if (!userRole) return false;
  return hasCapability(userRole, capability);
}

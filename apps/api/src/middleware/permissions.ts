import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db.js';

/**
 * Permission checking utilities for the Phase 5 permission framework.
 *
 * Permission Model:
 * - canCreatePlans: Can create new 504/IEP/Behavior plans
 * - canUpdatePlans: Can edit plans, add targets, events
 * - canReadAll: Can read all students in jurisdiction
 * - canManageUsers: Admin can manage users and permissions
 * - canManageDocs: Admin can manage schemas, best practices
 *
 * Student Access:
 * - Teachers have implicit access to their assigned students (teacherId)
 * - Additional access can be granted via StudentAccess table
 * - Users with canReadAll can access all students in their jurisdiction
 */

// Cache user permissions to avoid repeated DB calls within a request
interface UserPermissions {
  canCreatePlans: boolean;
  canUpdatePlans: boolean;
  canReadAll: boolean;
  canManageUsers: boolean;
  canManageDocs: boolean;
}

/**
 * Get user permissions from database or cache
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const permission = await prisma.userPermission.findUnique({
    where: { userId },
  });

  return {
    canCreatePlans: permission?.canCreatePlans ?? false,
    canUpdatePlans: permission?.canUpdatePlans ?? false,
    canReadAll: permission?.canReadAll ?? false,
    canManageUsers: (permission as { canManageUsers?: boolean })?.canManageUsers ?? false,
    canManageDocs: permission?.canManageDocs ?? false,
  };
}

/**
 * Check if user can access a specific student
 * Access is granted if:
 * 1. User is the student's assigned teacher
 * 2. User has canReadAll permission in the same jurisdiction
 * 3. User has a StudentAccess record for this student
 */
export async function canAccessStudent(userId: string, studentId: string, jurisdictionId?: string): Promise<boolean> {
  // Check if user is the assigned teacher
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      teacherId: userId,
    },
  });

  if (student) {
    return true;
  }

  // Check if user has canReadAll permission
  const permission = await getUserPermissions(userId);
  if (permission.canReadAll && jurisdictionId) {
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { jurisdictionId: true },
    });

    if (user?.jurisdictionId === jurisdictionId) {
      return true;
    }
  }

  // Check for explicit StudentAccess grant
  const access = await prisma.studentAccess.findFirst({
    where: {
      userId,
      studentId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  return !!access;
}

/**
 * Get all student IDs the user can access
 */
export async function getAccessibleStudentIds(userId: string): Promise<string[]> {
  const permission = await getUserPermissions(userId);
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { jurisdictionId: true },
  });

  // If user has canReadAll, get all students in their jurisdiction
  if (permission.canReadAll && user?.jurisdictionId) {
    const students = await prisma.student.findMany({
      where: { jurisdictionId: user.jurisdictionId, isActive: true },
      select: { id: true },
    });
    return students.map(s => s.id);
  }

  // Otherwise, combine assigned students and explicit access grants
  const [assignedStudents, accessGrants] = await Promise.all([
    prisma.student.findMany({
      where: { teacherId: userId, isActive: true },
      select: { id: true },
    }),
    prisma.studentAccess.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { studentId: true },
    }),
  ]);

  const studentIds = new Set<string>();
  assignedStudents.forEach(s => studentIds.add(s.id));
  accessGrants.forEach(a => studentIds.add(a.studentId));

  return Array.from(studentIds);
}

// ============================================
// MIDDLEWARE FUNCTIONS
// ============================================

/**
 * Middleware: Require canCreatePlans permission
 */
export function requireCreatePlanPermission(req: Request, res: Response, next: NextFunction) {
  (async () => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const permission = await getUserPermissions(req.user.id);

    // ADMIN role always has create permission
    if (req.user.role === 'ADMIN' || permission.canCreatePlans) {
      return next();
    }

    // TEACHER and CASE_MANAGER have implicit create permission for their students
    if (req.user.role === 'TEACHER' || req.user.role === 'CASE_MANAGER') {
      return next();
    }

    return res.status(403).json({ error: 'Create plan permission required' });
  })().catch(next);
}

/**
 * Middleware: Require canUpdatePlans permission
 */
export function requireUpdatePlanPermission(req: Request, res: Response, next: NextFunction) {
  (async () => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const permission = await getUserPermissions(req.user.id);

    // ADMIN role always has update permission
    if (req.user.role === 'ADMIN' || permission.canUpdatePlans) {
      return next();
    }

    // TEACHER and CASE_MANAGER have implicit update permission for their students
    if (req.user.role === 'TEACHER' || req.user.role === 'CASE_MANAGER') {
      return next();
    }

    return res.status(403).json({ error: 'Update plan permission required' });
  })().catch(next);
}

/**
 * Middleware: Require canManageDocs permission (admin only)
 */
export function requireManageDocsPermission(req: Request, res: Response, next: NextFunction) {
  (async () => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const permission = await getUserPermissions(req.user.id);

    if (req.user.role === 'ADMIN' || permission.canManageDocs) {
      return next();
    }

    return res.status(403).json({ error: 'Manage documents permission required' });
  })().catch(next);
}

/**
 * Middleware: Require canManageUsers permission (admin only)
 */
export function requireManageUsersPermission(req: Request, res: Response, next: NextFunction) {
  (async () => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const permission = await getUserPermissions(req.user.id);

    if (req.user.role === 'ADMIN' || permission.canManageUsers) {
      return next();
    }

    return res.status(403).json({ error: 'Manage users permission required' });
  })().catch(next);
}

/**
 * Middleware: Require either canManageUsers or canManageDocs permission
 */
export function requireAdminPermission(req: Request, res: Response, next: NextFunction) {
  (async () => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const permission = await getUserPermissions(req.user.id);

    if (req.user.role === 'ADMIN' || permission.canManageUsers || permission.canManageDocs) {
      return next();
    }

    return res.status(403).json({ error: 'Admin permission required' });
  })().catch(next);
}

/**
 * Middleware factory: Require access to the student specified in params
 */
export function requireStudentAccess(studentIdParam: string = 'studentId') {
  return (req: Request, res: Response, next: NextFunction) => {
    (async () => {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const studentId = req.params[studentIdParam] || req.params.id;
      if (!studentId) {
        return res.status(400).json({ error: 'Student ID required' });
      }

      // Get student to check jurisdiction
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { jurisdictionId: true },
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const hasAccess = await canAccessStudent(req.user.id, studentId, student.jurisdictionId);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this student' });
      }

      next();
    })().catch(next);
  };
}

/**
 * Middleware factory: Require access to student via plan
 */
export function requirePlanAccess(planIdParam: string = 'planId') {
  return (req: Request, res: Response, next: NextFunction) => {
    (async () => {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const planId = req.params[planIdParam];
      if (!planId) {
        return res.status(400).json({ error: 'Plan ID required' });
      }

      // Get plan with student to check access
      const plan = await prisma.planInstance.findUnique({
        where: { id: planId },
        include: {
          student: {
            select: { id: true, jurisdictionId: true },
          },
        },
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const hasAccess = await canAccessStudent(
        req.user.id,
        plan.student.id,
        plan.student.jurisdictionId
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this plan' });
      }

      next();
    })().catch(next);
  };
}

/**
 * Middleware factory: Require access to student via behavior target
 */
export function requireBehaviorTargetAccess(targetIdParam: string = 'targetId') {
  return (req: Request, res: Response, next: NextFunction) => {
    (async () => {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const targetId = req.params[targetIdParam];
      if (!targetId) {
        return res.status(400).json({ error: 'Target ID required' });
      }

      // Get target with plan instance to check access
      const target = await prisma.behaviorTarget.findUnique({
        where: { id: targetId },
        include: {
          behaviorPlan: {
            include: {
              planInstance: {
                include: {
                  student: {
                    select: { id: true, jurisdictionId: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!target) {
        return res.status(404).json({ error: 'Target not found' });
      }

      const hasAccess = await canAccessStudent(
        req.user.id,
        target.behaviorPlan.planInstance.student.id,
        target.behaviorPlan.planInstance.student.jurisdictionId
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this target' });
      }

      next();
    })().catch(next);
  };
}

/**
 * Middleware factory: Require access to student via behavior event
 */
export function requireBehaviorEventAccess(eventIdParam: string = 'eventId') {
  return (req: Request, res: Response, next: NextFunction) => {
    (async () => {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const eventId = req.params[eventIdParam];
      if (!eventId) {
        return res.status(400).json({ error: 'Event ID required' });
      }

      // Get event with target and plan instance to check access
      const event = await prisma.behaviorEvent.findUnique({
        where: { id: eventId },
        include: {
          target: {
            include: {
              behaviorPlan: {
                include: {
                  planInstance: {
                    include: {
                      student: {
                        select: { id: true, jurisdictionId: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const hasAccess = await canAccessStudent(
        req.user.id,
        event.target.behaviorPlan.planInstance.student.id,
        event.target.behaviorPlan.planInstance.student.jurisdictionId
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this event' });
      }

      next();
    })().catch(next);
  };
}

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { Errors, ApiError } from '../errors.js';
import { AuditActionType, AuditEntityType } from '../types/prisma-enums.js';

const router = Router();

// ============================================
// GET AUDIT LOGS (ADMIN ONLY)
// GET /api/admin/audit
// Returns paginated audit logs with filters
// ============================================

const getAuditLogsSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  userId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  actionType: z.string().optional(),
  entityType: z.string().optional(),
});

router.get('/audit', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only ADMIN can view audit logs
    if (req.user?.role !== 'ADMIN') {
      throw Errors.forbidden('Only administrators can view audit logs');
    }

    const query = getAuditLogsSchema.parse(req.query);
    const page = parseInt(query.page, 10);
    const limit = Math.min(parseInt(query.limit, 10), 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (query.dateFrom) {
      where.timestamp = { ...where.timestamp, gte: new Date(query.dateFrom) };
    }
    if (query.dateTo) {
      where.timestamp = { ...where.timestamp, lte: new Date(query.dateTo) };
    }
    if (query.userId) {
      where.actorUserId = query.userId;
    }
    if (query.studentId) {
      where.studentId = query.studentId;
    }
    if (query.actionType) {
      where.actionType = query.actionType;
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Transform for response
    const auditLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      actionType: log.actionType,
      entityType: log.entityType,
      entityId: log.entityId,
      studentId: log.studentId,
      planId: log.planId,
      planVersionId: log.planVersionId,
      metadata: log.metadataJson,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      actor: {
        id: log.actor.id,
        displayName: log.actor.displayName,
        email: log.actor.email,
      },
    }));

    res.json({
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error fetching audit logs:', error);
    next(Errors.internal('Failed to fetch audit logs'));
  }
});

// ============================================
// GET SINGLE AUDIT LOG (ADMIN ONLY)
// GET /api/admin/audit/:id
// ============================================

router.get('/audit/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only ADMIN can view audit logs
    if (req.user?.role !== 'ADMIN') {
      throw Errors.forbidden('Only administrators can view audit logs');
    }

    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!log) {
      throw Errors.notFound('Audit log not found');
    }

    // Try to fetch related student info if available
    let student = null;
    if (log.studentId) {
      const studentRecord = await prisma.student.findUnique({
        where: { id: log.studentId },
        select: {
          id: true,
          recordId: true,
          firstName: true,
          lastName: true,
        },
      });
      if (studentRecord) {
        student = {
          id: studentRecord.id,
          recordId: studentRecord.recordId,
          name: `${studentRecord.firstName} ${studentRecord.lastName}`,
        };
      }
    }

    // Try to fetch related plan info if available
    let plan = null;
    if (log.planId) {
      const planRecord = await prisma.planInstance.findUnique({
        where: { id: log.planId },
        select: {
          id: true,
          planType: {
            select: {
              code: true,
              name: true,
            },
          },
          status: true,
        },
      });
      if (planRecord) {
        plan = {
          id: planRecord.id,
          planTypeCode: planRecord.planType.code,
          planTypeName: planRecord.planType.name,
          status: planRecord.status,
        };
      }
    }

    res.json({
      auditLog: {
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        actionType: log.actionType,
        entityType: log.entityType,
        entityId: log.entityId,
        studentId: log.studentId,
        planId: log.planId,
        planVersionId: log.planVersionId,
        metadata: log.metadataJson,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        actor: {
          id: log.actor.id,
          displayName: log.actor.displayName,
          email: log.actor.email,
          role: log.actor.role,
        },
        student,
        plan,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    console.error('Error fetching audit log:', error);
    next(Errors.internal('Failed to fetch audit log'));
  }
});

// ============================================
// EXPORT AUDIT LOGS AS CSV (ADMIN ONLY)
// GET /api/admin/audit/export
// ============================================

router.get('/audit/export', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only ADMIN can export audit logs
    if (req.user?.role !== 'ADMIN') {
      throw Errors.forbidden('Only administrators can export audit logs');
    }

    const query = getAuditLogsSchema.parse(req.query);

    // Build where clause (same as list endpoint)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (query.dateFrom) {
      where.timestamp = { ...where.timestamp, gte: new Date(query.dateFrom) };
    }
    if (query.dateTo) {
      where.timestamp = { ...where.timestamp, lte: new Date(query.dateTo) };
    }
    if (query.userId) {
      where.actorUserId = query.userId;
    }
    if (query.studentId) {
      where.studentId = query.studentId;
    }
    if (query.actionType) {
      where.actionType = query.actionType;
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }

    // Limit export to 10000 records max
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 10000,
      include: {
        actor: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
    });

    // Generate CSV
    const headers = [
      'Timestamp',
      'User',
      'User Email',
      'Action',
      'Entity Type',
      'Entity ID',
      'Student ID',
      'Plan ID',
      'IP Address',
      'User Agent',
    ];

    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.actor.displayName,
      log.actor.email,
      log.actionType,
      log.entityType,
      log.entityId,
      log.studentId || '',
      log.planId || '',
      log.ipAddress || '',
      log.userAgent ? log.userAgent.substring(0, 100) : '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error instanceof z.ZodError) {
      return next(Errors.validationFailed(error.errors));
    }
    console.error('Error exporting audit logs:', error);
    next(Errors.internal('Failed to export audit logs'));
  }
});

// ============================================
// GET AUDIT ACTION TYPES (for filters)
// GET /api/admin/audit/action-types
// ============================================

router.get('/audit/action-types', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw Errors.forbidden('Only administrators can view audit logs');
    }

    const actionTypes = Object.entries(AuditActionType).map(([key, value]) => ({
      value,
      label: key.replace(/_/g, ' '),
    }));

    res.json({ actionTypes });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    next(Errors.internal('Failed to fetch action types'));
  }
});

// ============================================
// GET AUDIT ENTITY TYPES (for filters)
// GET /api/admin/audit/entity-types
// ============================================

router.get('/audit/entity-types', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw Errors.forbidden('Only administrators can view audit logs');
    }

    const entityTypes = Object.entries(AuditEntityType).map(([key, value]) => ({
      value,
      label: key.replace(/_/g, ' '),
    }));

    res.json({ entityTypes });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    next(Errors.internal('Failed to fetch entity types'));
  }
});

// ============================================
// GET USERS FOR FILTER (for user dropdown)
// GET /api/admin/audit/users
// ============================================

router.get('/audit/users', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw Errors.forbidden('Only administrators can view audit logs');
    }

    // Get users who have audit log entries
    const usersWithLogs = await prisma.appUser.findMany({
      where: {
        auditLogs: {
          some: {},
        },
      },
      select: {
        id: true,
        displayName: true,
        email: true,
      },
      orderBy: { displayName: 'asc' },
    });

    res.json({ users: usersWithLogs });
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    next(Errors.internal('Failed to fetch users'));
  }
});

export default router;

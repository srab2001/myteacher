import { Request } from 'express';
import { prisma } from '../lib/db.js';
import { AuditActionType, AuditEntityType } from '../types/prisma-enums.js';

// Session-based deduplication for PLAN_VIEWED to reduce noise
// Uses a simple in-memory cache that clears on server restart
const viewedPlansPerSession = new Map<string, Set<string>>();

interface LogAuditParams {
  actor: { id: string };
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  studentId?: string | null;
  planId?: string | null;
  planVersionId?: string | null;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Log an audit event to the database.
 * For PLAN_VIEWED events, only logs once per session per planId to reduce noise.
 */
export async function logAudit({
  actor,
  actionType,
  entityType,
  entityId,
  studentId,
  planId,
  planVersionId,
  metadata,
  req,
}: LogAuditParams): Promise<void> {
  try {
    // Deduplicate PLAN_VIEWED events per session
    if (actionType === AuditActionType.PLAN_VIEWED && planId) {
      const sessionKey = req?.sessionID || actor.id;
      if (!viewedPlansPerSession.has(sessionKey)) {
        viewedPlansPerSession.set(sessionKey, new Set());
      }
      const viewedPlans = viewedPlansPerSession.get(sessionKey)!;
      if (viewedPlans.has(planId)) {
        // Already logged this plan view in this session
        return;
      }
      viewedPlans.add(planId);

      // Clear old sessions periodically (after 1000 sessions)
      if (viewedPlansPerSession.size > 1000) {
        const keys = Array.from(viewedPlansPerSession.keys());
        keys.slice(0, 500).forEach(key => viewedPlansPerSession.delete(key));
      }
    }

    // Extract IP and user agent from request if available
    const ipAddress = req ? getClientIp(req) : null;
    const userAgent = req?.headers['user-agent'] || null;

    await prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        actionType,
        entityType,
        entityId,
        studentId: studentId || null,
        planId: planId || null,
        planVersionId: planVersionId || null,
        metadataJson: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break the main flow
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Helper to log permission denied events
 */
export async function logPermissionDenied({
  actor,
  entityType,
  entityId,
  studentId,
  planId,
  reason,
  req,
}: {
  actor: { id: string };
  entityType: AuditEntityType;
  entityId: string;
  studentId?: string | null;
  planId?: string | null;
  reason: string;
  req?: Request;
}): Promise<void> {
  await logAudit({
    actor,
    actionType: AuditActionType.PERMISSION_DENIED,
    entityType,
    entityId,
    studentId,
    planId,
    metadata: { reason },
    req,
  });
}

/**
 * Get client IP from request, handling proxies
 */
function getClientIp(req: Request): string | null {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // x-forwarded-for may contain multiple IPs, take the first one
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    return ips.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * Convenience functions for common audit actions
 */
export const AuditLogger = {
  planViewed: async (actor: { id: string }, planId: string, studentId: string, req?: Request) => {
    await logAudit({
      actor,
      actionType: AuditActionType.PLAN_VIEWED,
      entityType: AuditEntityType.PLAN,
      entityId: planId,
      studentId,
      planId,
      req,
    });
  },

  planUpdated: async (actor: { id: string }, planId: string, studentId: string, changes?: Record<string, unknown>, req?: Request) => {
    await logAudit({
      actor,
      actionType: AuditActionType.PLAN_UPDATED,
      entityType: AuditEntityType.PLAN,
      entityId: planId,
      studentId,
      planId,
      metadata: changes,
      req,
    });
  },

  planFinalized: async (actor: { id: string }, planId: string, planVersionId: string, studentId: string, req?: Request) => {
    await logAudit({
      actor,
      actionType: AuditActionType.PLAN_FINALIZED,
      entityType: AuditEntityType.PLAN_VERSION,
      entityId: planVersionId,
      studentId,
      planId,
      planVersionId,
      req,
    });
  },

  pdfExported: async (actor: { id: string }, exportId: string, planVersionId: string, planId: string, studentId: string, req?: Request) => {
    await logAudit({
      actor,
      actionType: AuditActionType.PDF_EXPORTED,
      entityType: AuditEntityType.PLAN_EXPORT,
      entityId: exportId,
      studentId,
      planId,
      planVersionId,
      req,
    });
  },

  pdfDownloaded: async (actor: { id: string }, exportId: string, planVersionId: string, planId: string, studentId: string, req?: Request) => {
    await logAudit({
      actor,
      actionType: AuditActionType.PDF_DOWNLOADED,
      entityType: AuditEntityType.PLAN_EXPORT,
      entityId: exportId,
      studentId,
      planId,
      planVersionId,
      req,
    });
  },

  signatureAdded: async (actor: { id: string }, signaturePacketId: string, planVersionId: string, planId: string, studentId: string, signerRole: string, req?: Request) => {
    await logAudit({
      actor,
      actionType: AuditActionType.SIGNATURE_ADDED,
      entityType: AuditEntityType.SIGNATURE_PACKET,
      entityId: signaturePacketId,
      studentId,
      planId,
      planVersionId,
      metadata: { signerRole },
      req,
    });
  },

  reviewScheduleCreated: async (actor: { id: string }, scheduleId: string, planId: string, studentId: string, scheduleType: string, req?: Request) => {
    await logAudit({
      actor,
      actionType: AuditActionType.REVIEW_SCHEDULE_CREATED,
      entityType: AuditEntityType.REVIEW_SCHEDULE,
      entityId: scheduleId,
      studentId,
      planId,
      metadata: { scheduleType },
      req,
    });
  },

  caseViewed: async (actor: { id: string }, caseId: string, studentId: string, req?: Request) => {
    await logAudit({
      actor,
      actionType: AuditActionType.CASE_VIEWED,
      entityType: AuditEntityType.DISPUTE_CASE,
      entityId: caseId,
      studentId,
      req,
    });
  },

  caseExported: async (actor: { id: string }, caseId: string, studentId: string, format: string, req?: Request) => {
    await logAudit({
      actor,
      actionType: AuditActionType.CASE_EXPORTED,
      entityType: AuditEntityType.DISPUTE_CASE,
      entityId: caseId,
      studentId,
      metadata: { format },
      req,
    });
  },

  permissionDenied: logPermissionDenied,
};

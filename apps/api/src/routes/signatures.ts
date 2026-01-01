import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { AuditLogger } from '../services/auditLog.js';

const router = Router();

// Helper to check if user can manage signature packets
function canManagePackets(userRole: string | null | undefined): boolean {
  return userRole === 'ADMIN' || userRole === 'CASE_MANAGER';
}

// Standard attestation text for electronic signatures
const ELECTRONIC_ATTESTATION =
  'By typing my name below, I confirm that I am the person named above, ' +
  'I have reviewed the document, and I agree to sign this document electronically. ' +
  'I understand that my electronic signature has the same legal effect as a handwritten signature.';

// ============================================
// CREATE SIGNATURE PACKET
// POST /api/plan-versions/:versionId/signature-packets
// ============================================

const createPacketSchema = z.object({
  requiredRoles: z.array(z.enum([
    'PARENT_GUARDIAN', 'CASE_MANAGER', 'SPECIAL_ED_TEACHER', 'GENERAL_ED_TEACHER',
    'RELATED_SERVICE_PROVIDER', 'ADMINISTRATOR', 'STUDENT', 'OTHER'
  ])).min(1),
  expiresAt: z.string().datetime().optional(),
  signers: z.array(z.object({
    role: z.enum([
      'PARENT_GUARDIAN', 'CASE_MANAGER', 'SPECIAL_ED_TEACHER', 'GENERAL_ED_TEACHER',
      'RELATED_SERVICE_PROVIDER', 'ADMINISTRATOR', 'STUDENT', 'OTHER'
    ]),
    signerName: z.string().min(1),
    signerEmail: z.string().email().optional(),
    signerTitle: z.string().optional(),
    signerUserId: z.string().uuid().optional(),
  })).optional(),
});

router.post('/plan-versions/:versionId/signature-packets', requireAuth, async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;

    if (!canManagePackets(req.user?.role)) {
      return res.status(403).json({ error: 'Not authorized to create signature packets' });
    }

    const validatedData = createPacketSchema.parse(req.body);

    // Verify version exists and doesn't already have a packet
    const version = await prisma.planVersion.findUnique({
      where: { id: versionId },
      include: { signaturePacket: true },
    });

    if (!version) {
      return res.status(404).json({ error: 'Plan version not found' });
    }

    if (version.signaturePacket) {
      return res.status(400).json({ error: 'Signature packet already exists for this version' });
    }

    // Create packet and signature records in transaction
    const packet = await prisma.$transaction(async (tx) => {
      const newPacket = await tx.signaturePacket.create({
        data: {
          planVersionId: versionId,
          requiredRoles: validatedData.requiredRoles as Prisma.InputJsonValue,
          expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
          createdByUserId: req.user!.id,
        },
      });

      // Create signature records from signers list or required roles
      const signersToCreate = validatedData.signers || validatedData.requiredRoles.map(role => ({
        role,
        signerName: '', // Will be filled when signing
      }));

      // Create signature records - cast to avoid type issues with conditional properties
      const recordsData = signersToCreate.map(signer => {
        const record: Prisma.SignatureRecordCreateManyInput = {
          packetId: newPacket.id,
          role: signer.role as Prisma.SignatureRecordCreateManyInput['role'],
          signerName: signer.signerName || '',
          status: 'PENDING',
        };
        if ('signerEmail' in signer && signer.signerEmail) {
          record.signerEmail = signer.signerEmail;
        }
        if ('signerTitle' in signer && signer.signerTitle) {
          record.signerTitle = signer.signerTitle;
        }
        if ('signerUserId' in signer && signer.signerUserId) {
          record.signerUserId = signer.signerUserId;
        }
        return record;
      });

      await tx.signatureRecord.createMany({
        data: recordsData,
      });

      return newPacket;
    });

    const fullPacket = await prisma.signaturePacket.findUnique({
      where: { id: packet.id },
      include: {
        signatures: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });

    res.status(201).json({ packet: fullPacket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error creating signature packet:', error);
    res.status(500).json({ error: 'Failed to create signature packet' });
  }
});

// ============================================
// GET VERSION SIGNATURES
// GET /api/plan-versions/:versionId/signatures
// ============================================

router.get('/plan-versions/:versionId/signatures', requireAuth, async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;

    const packet = await prisma.signaturePacket.findUnique({
      where: { planVersionId: versionId },
      include: {
        signatures: {
          include: {
            signerUser: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        createdBy: { select: { id: true, displayName: true } },
        planVersion: {
          include: {
            planInstance: {
              include: {
                student: { select: { firstName: true, lastName: true } },
                planType: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!packet) {
      return res.status(404).json({ error: 'Signature packet not found for this version' });
    }

    res.json({ packet });
  } catch (error) {
    console.error('Error fetching signatures:', error);
    res.status(500).json({ error: 'Failed to fetch signatures' });
  }
});

// ============================================
// SIGN DOCUMENT
// POST /api/signature-packets/:packetId/sign
// ============================================

const signSchema = z.object({
  signatureRecordId: z.string().uuid(),
  method: z.enum(['ELECTRONIC', 'IN_PERSON', 'PAPER_RETURNED']),
  signerName: z.string().min(1),
  attestation: z.boolean().optional(), // Must be true for electronic
});

router.post('/signature-packets/:packetId/sign', requireAuth, async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const validatedData = signSchema.parse(req.body);

    // Get the packet and signature record with plan info for audit logging
    const packet = await prisma.signaturePacket.findUnique({
      where: { id: packetId },
      include: {
        signatures: true,
        planVersion: {
          include: {
            planInstance: {
              select: { id: true, studentId: true },
            },
          },
        },
      },
    });

    if (!packet) {
      return res.status(404).json({ error: 'Signature packet not found' });
    }

    if (packet.status === 'COMPLETE') {
      return res.status(400).json({ error: 'Signature packet is already complete' });
    }

    if (packet.status === 'EXPIRED') {
      return res.status(400).json({ error: 'Signature packet has expired' });
    }

    const signatureRecord = packet.signatures.find(s => s.id === validatedData.signatureRecordId);
    if (!signatureRecord) {
      return res.status(404).json({ error: 'Signature record not found' });
    }

    if (signatureRecord.status === 'SIGNED') {
      return res.status(400).json({ error: 'This signature has already been recorded' });
    }

    // For electronic signatures, attestation is required
    if (validatedData.method === 'ELECTRONIC' && !validatedData.attestation) {
      return res.status(400).json({ error: 'Attestation is required for electronic signatures' });
    }

    // Check authorization: user must match the signer or be an admin/case manager
    const isAuthorized =
      canManagePackets(req.user?.role) ||
      signatureRecord.signerUserId === req.user?.id;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to sign on behalf of this person' });
    }

    // Get IP address for electronic signature
    const ipAddress = validatedData.method === 'ELECTRONIC'
      ? (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown')
      : undefined;

    // Update the signature record
    const updatedSignature = await prisma.signatureRecord.update({
      where: { id: validatedData.signatureRecordId },
      data: {
        signerName: validatedData.signerName,
        signerUserId: req.user!.id, // Track who actually signed
        method: validatedData.method,
        status: 'SIGNED',
        signedAt: new Date(),
        attestationText: validatedData.method === 'ELECTRONIC' ? ELECTRONIC_ATTESTATION : undefined,
        ipAddress,
      },
      include: {
        signerUser: { select: { id: true, displayName: true } },
      },
    });

    // Check if all required signatures are now complete
    const requiredRoles = packet.requiredRoles as string[];
    const updatedPacket = await prisma.signaturePacket.findUnique({
      where: { id: packetId },
      include: { signatures: true },
    });

    const allRequiredSigned = requiredRoles.every(role =>
      updatedPacket?.signatures.some(s => s.role === role && s.status === 'SIGNED')
    );

    // If all required signatures are complete, mark packet as complete
    if (allRequiredSigned) {
      await prisma.signaturePacket.update({
        where: { id: packetId },
        data: {
          status: 'COMPLETE',
          completedAt: new Date(),
        },
      });
    }

    // Log audit event for signature
    AuditLogger.signatureAdded(
      req.user!,
      packetId,
      packet.planVersionId,
      packet.planVersion.planInstance.id,
      packet.planVersion.planInstance.studentId,
      signatureRecord.role,
      req
    ).catch(err => {
      console.error('Failed to log audit event:', err);
    });

    res.json({
      signature: updatedSignature,
      packetComplete: allRequiredSigned,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error signing document:', error);
    res.status(500).json({ error: 'Failed to sign document' });
  }
});

// ============================================
// DECLINE SIGNATURE
// POST /api/signature-packets/:packetId/decline
// ============================================

const declineSchema = z.object({
  signatureRecordId: z.string().uuid(),
  declineReason: z.string().min(1),
});

router.post('/signature-packets/:packetId/decline', requireAuth, async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const validatedData = declineSchema.parse(req.body);

    const packet = await prisma.signaturePacket.findUnique({
      where: { id: packetId },
      include: { signatures: true },
    });

    if (!packet) {
      return res.status(404).json({ error: 'Signature packet not found' });
    }

    const signatureRecord = packet.signatures.find(s => s.id === validatedData.signatureRecordId);
    if (!signatureRecord) {
      return res.status(404).json({ error: 'Signature record not found' });
    }

    if (signatureRecord.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only decline pending signatures' });
    }

    // Check authorization
    const isAuthorized =
      canManagePackets(req.user?.role) ||
      signatureRecord.signerUserId === req.user?.id;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to decline this signature' });
    }

    const updatedSignature = await prisma.signatureRecord.update({
      where: { id: validatedData.signatureRecordId },
      data: {
        status: 'DECLINED',
        declinedAt: new Date(),
        declineReason: validatedData.declineReason,
      },
    });

    res.json({ signature: updatedSignature });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error declining signature:', error);
    res.status(500).json({ error: 'Failed to decline signature' });
  }
});

// ============================================
// ADD SIGNATURE RECORD
// POST /api/signature-packets/:packetId/records
// ============================================

const addRecordSchema = z.object({
  role: z.enum([
    'PARENT_GUARDIAN', 'CASE_MANAGER', 'SPECIAL_ED_TEACHER', 'GENERAL_ED_TEACHER',
    'RELATED_SERVICE_PROVIDER', 'ADMINISTRATOR', 'STUDENT', 'OTHER'
  ]),
  signerName: z.string().min(1),
  signerEmail: z.string().email().optional(),
  signerTitle: z.string().optional(),
  signerUserId: z.string().uuid().optional(),
});

router.post('/signature-packets/:packetId/records', requireAuth, async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;

    if (!canManagePackets(req.user?.role)) {
      return res.status(403).json({ error: 'Not authorized to add signature records' });
    }

    const validatedData = addRecordSchema.parse(req.body);

    const packet = await prisma.signaturePacket.findUnique({
      where: { id: packetId },
    });

    if (!packet) {
      return res.status(404).json({ error: 'Signature packet not found' });
    }

    if (packet.status !== 'OPEN') {
      return res.status(400).json({ error: 'Can only add records to open packets' });
    }

    const signatureRecord = await prisma.signatureRecord.create({
      data: {
        packetId,
        role: validatedData.role,
        signerName: validatedData.signerName,
        signerEmail: validatedData.signerEmail,
        signerTitle: validatedData.signerTitle,
        signerUserId: validatedData.signerUserId,
        status: 'PENDING',
      },
    });

    res.status(201).json({ signature: signatureRecord });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error adding signature record:', error);
    res.status(500).json({ error: 'Failed to add signature record' });
  }
});

// ============================================
// GET SIGNATURE ROLES (for dropdown)
// GET /api/signature-roles
// ============================================

router.get('/signature-roles', requireAuth, async (_req: Request, res: Response) => {
  const roles = [
    { value: 'PARENT_GUARDIAN', label: 'Parent/Guardian' },
    { value: 'CASE_MANAGER', label: 'Case Manager' },
    { value: 'SPECIAL_ED_TEACHER', label: 'Special Education Teacher' },
    { value: 'GENERAL_ED_TEACHER', label: 'General Education Teacher' },
    { value: 'RELATED_SERVICE_PROVIDER', label: 'Related Service Provider' },
    { value: 'ADMINISTRATOR', label: 'Administrator' },
    { value: 'STUDENT', label: 'Student' },
    { value: 'OTHER', label: 'Other' },
  ];

  res.json({ roles, attestationText: ELECTRONIC_ATTESTATION });
});

export default router;

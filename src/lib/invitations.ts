import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import { getEnv } from "@/lib/env";
import { type AssignableRole, canAssignRole, canManageMember, normalizeRole } from "@/lib/roles";

export const INVITATION_TTL_DAYS = 7;
const MAX_FAMILY_MEMBERS = 12;
const MAX_PENDING_INVITATIONS = 10;

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(`family-invitation:${token}`).digest("hex");
}

export function invitationUrl(token: string): string {
  const url = new URL("/", getEnv().APP_URL);
  url.hash = new URLSearchParams({ invite: token }).toString();
  return url.toString();
}

export async function createInvitation(input: {
  familyId: string;
  actorUserId: string;
  actorRole: string;
  email: string;
  role: AssignableRole;
}) {
  if (!canAssignRole(input.actorRole, input.role)) {
    throw new HttpError(403, "Only the family owner can invite administrators.");
  }
  const normalizedEmail = input.email.trim().toLowerCase();
  const [existingMember, memberCount, pendingCount] = await Promise.all([
    prisma.familyMembership.findFirst({
      where: { familyId: input.familyId, user: { normalizedEmail } },
      select: { id: true },
    }),
    prisma.familyMembership.count({ where: { familyId: input.familyId } }),
    prisma.familyInvitation.count({
      where: {
        familyId: input.familyId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);
  if (existingMember) throw new HttpError(409, "That person is already a member of this family.");
  if (memberCount + pendingCount >= MAX_FAMILY_MEMBERS) {
    throw new HttpError(409, `A family can have up to ${MAX_FAMILY_MEMBERS} members.`);
  }
  if (pendingCount >= MAX_PENDING_INVITATIONS) {
    throw new HttpError(409, "Revoke an existing invitation before sending another.");
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const invitation = await prisma.$transaction(async (transaction) => {
    // Re-inviting the same address replaces any earlier pending invitation.
    await transaction.familyInvitation.updateMany({
      where: { familyId: input.familyId, normalizedEmail, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return transaction.familyInvitation.create({
      data: {
        familyId: input.familyId,
        invitedByUserId: input.actorUserId,
        email: normalizedEmail,
        normalizedEmail,
        role: input.role,
        tokenHash: hashInvitationToken(token),
        expiresAt,
      },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    });
  });
  return { invitation, token };
}

async function findUsableInvitation(token: string) {
  const invitation = await prisma.familyInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    include: {
      family: { select: { id: true, name: true } },
      invitedBy: { select: { name: true } },
    },
  });
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt <= new Date()
  ) {
    throw new HttpError(404, "This invitation is invalid, expired or has already been used.");
  }
  return invitation;
}

function assertRecipient(invitation: { normalizedEmail: string }, userEmail: string) {
  if (invitation.normalizedEmail !== userEmail.trim().toLowerCase()) {
    throw new HttpError(
      403,
      "This invitation was sent to a different email address. Sign in with the invited email address to accept it.",
    );
  }
}

export async function previewInvitation(token: string, userEmail: string) {
  const invitation = await findUsableInvitation(token);
  assertRecipient(invitation, userEmail);
  return {
    familyName: invitation.family.name,
    invitedBy: invitation.invitedBy.name,
    role: normalizeRole(invitation.role),
    expiresAt: invitation.expiresAt,
  };
}

export async function acceptInvitation(token: string, user: { id: string; email: string }) {
  const invitation = await findUsableInvitation(token);
  assertRecipient(invitation, user.email);
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.familyMembership.findFirst({
      where: { userId: user.id },
      select: { familyId: true },
    });
    if (existing) {
      throw new HttpError(
        409,
        existing.familyId === invitation.familyId
          ? "You are already a member of this family."
          : "You already belong to a family. Leave it before accepting another invitation.",
      );
    }
    const claimed = await transaction.familyInvitation.updateMany({
      where: {
        id: invitation.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new HttpError(404, "This invitation is invalid, expired or has already been used.");
    }
    await transaction.familyMembership.create({
      data: { familyId: invitation.familyId, userId: user.id, role: invitation.role },
    });
    return { familyId: invitation.familyId, familyName: invitation.family.name };
  });
}

export async function updateMemberRole(input: {
  familyId: string;
  actorUserId: string;
  actorRole: string;
  membershipId: string;
  role: AssignableRole;
}) {
  const target = await prisma.familyMembership.findFirst({
    where: { id: input.membershipId, familyId: input.familyId },
  });
  if (!target) throw new HttpError(404, "Family member not found.");
  if (target.userId === input.actorUserId)
    throw new HttpError(403, "You cannot change your own role.");
  if (
    !canManageMember(input.actorRole, target.role) ||
    !canAssignRole(input.actorRole, input.role)
  ) {
    throw new HttpError(403, "Your family role does not allow this change.");
  }
  return prisma.familyMembership.update({
    where: { id: target.id },
    data: { role: input.role },
    select: { id: true, role: true },
  });
}

export async function removeMember(input: {
  familyId: string;
  actorUserId: string;
  actorRole: string;
  membershipId: string;
}) {
  const target = await prisma.familyMembership.findFirst({
    where: { id: input.membershipId, familyId: input.familyId },
  });
  if (!target) throw new HttpError(404, "Family member not found.");
  const leaving = target.userId === input.actorUserId;
  if (normalizeRole(target.role) === "owner") {
    throw new HttpError(403, "The family owner cannot be removed.");
  }
  if (!leaving && !canManageMember(input.actorRole, target.role)) {
    throw new HttpError(403, "Your family role does not allow this change.");
  }
  await prisma.familyMembership.delete({ where: { id: target.id } });
  return { removed: target.id, leaving };
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { canManageMember, normalizeRole, roleAllows } from "@/lib/roles";

export async function GET() {
  try {
    const user = await requireUser();
    const membership = await requireMembership(user.id);
    const canManage = roleAllows(membership.role, "manage");
    const [members, invitations] = await Promise.all([
      prisma.familyMembership.findMany({
        where: { familyId: membership.familyId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      canManage
        ? prisma.familyInvitation.findMany({
            where: {
              familyId: membership.familyId,
              acceptedAt: null,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);
    return NextResponse.json({
      role: membership.role,
      members: members.map((member) => ({
        id: member.id,
        role: normalizeRole(member.role),
        joinedAt: member.createdAt,
        name: member.user.name,
        email: member.user.email,
        isYou: member.user.id === user.id,
        canManage: member.user.id !== user.id && canManageMember(membership.role, member.role),
      })),
      invitations,
    });
  } catch (error) {
    return jsonError(error);
  }
}

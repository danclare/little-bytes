import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { assertSameOrigin, HttpError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { canAssignRole, type AssignableRole } from "@/lib/roles";
import { idSchema } from "@/lib/validation";

type Context = { params: Promise<{ invitationId: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const actor = await requireMembership(user.id, "manage");
    const { invitationId } = await context.params;
    if (!idSchema.safeParse(invitationId).success)
      throw new HttpError(404, "Invitation not found.");
    const invitation = await prisma.familyInvitation.findFirst({
      where: { id: invitationId, familyId: actor.familyId, acceptedAt: null, revokedAt: null },
      select: { id: true, role: true },
    });
    if (!invitation) throw new HttpError(404, "Invitation not found.");
    if (!canAssignRole(actor.role, invitation.role as AssignableRole)) {
      throw new HttpError(403, "Only the family owner can revoke administrator invitations.");
    }
    await prisma.familyInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

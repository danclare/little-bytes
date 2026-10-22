import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { removeMember, updateMemberRole } from "@/lib/invitations";
import { ASSIGNABLE_ROLES } from "@/lib/roles";
import { idSchema } from "@/lib/validation";

type Context = { params: Promise<{ membershipId: string }> };

async function membershipId(context: Context) {
  const { membershipId } = await context.params;
  if (!idSchema.safeParse(membershipId).success)
    throw new HttpError(404, "Family member not found.");
  return membershipId;
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const actor = await requireMembership(user.id, "manage");
    const id = await membershipId(context);
    const { role } = z.object({ role: z.enum(ASSIGNABLE_ROLES) }).parse(await readJson(request));
    const updated = await updateMemberRole({
      familyId: actor.familyId,
      actorUserId: user.id,
      actorRole: actor.role,
      membershipId: id,
      role,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const actor = await requireMembership(user.id);
    const id = await membershipId(context);
    const result = await removeMember({
      familyId: actor.familyId,
      actorUserId: user.id,
      actorRole: actor.role,
      membershipId: id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

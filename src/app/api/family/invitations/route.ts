import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireMembership } from "@/lib/access";
import { emailDeliveryEnabled, sendFamilyInvitationEmail } from "@/lib/email";
import { assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { createInvitation, invitationUrl } from "@/lib/invitations";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ASSIGNABLE_ROLES } from "@/lib/roles";
import { emailSchema } from "@/lib/validation";

const inputSchema = z.object({ email: emailSchema, role: z.enum(ASSIGNABLE_ROLES) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(request, "family-invite", 10);
    const actor = await requireMembership(user.id, "manage");
    const input = inputSchema.parse(await readJson(request));
    const { invitation, token } = await createInvitation({
      familyId: actor.familyId,
      actorUserId: user.id,
      actorRole: actor.role,
      email: input.email,
      role: input.role,
    });
    const inviteUrl = invitationUrl(token);
    let emailSent = false;
    if (emailDeliveryEnabled()) {
      try {
        await sendFamilyInvitationEmail({
          recipient: invitation.email,
          inviteUrl,
          familyName: actor.family.name,
          inviterName: user.name,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        });
        emailSent = true;
      } catch (error) {
        console.error(
          "Family invitation email failed",
          error instanceof Error ? error.name : "Unknown error",
        );
      }
    }
    return NextResponse.json({ invitation, inviteUrl, emailSent }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

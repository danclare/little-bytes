import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { acceptInvitation } from "@/lib/invitations";
import { enforceRateLimit } from "@/lib/rate-limit";

const tokenSchema = z.object({ token: z.string().min(32).max(128) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(request, "invite-accept", 10);
    const { token } = tokenSchema.parse(await readJson(request));
    return NextResponse.json(await acceptInvitation(token, user));
  } catch (error) {
    return jsonError(error);
  }
}

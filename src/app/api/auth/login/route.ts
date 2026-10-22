import { NextResponse } from "next/server";
import { createSession, verifyPasswordOrDummy } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { z } from "zod";

const inputSchema = z.object({ email: emailSchema, password: passwordSchema });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "login", 8);
    const input = inputSchema.parse(await readJson(request));
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { normalizedEmail },
      include: { credential: true, memberships: { select: { id: true }, take: 1 } },
    });
    const passwordMatches = await verifyPasswordOrDummy(user?.credential?.password, input.password);
    if (!user?.credential || !passwordMatches) {
      throw new HttpError(401, "Email or password is incorrect.");
    }
    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      needsFamilySetup: user.memberships.length === 0,
    });
  } catch (error) {
    return jsonError(error);
  }
}

import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { emailSchema, nameSchema, passwordSchema } from "@/lib/validation";
import { z } from "zod";

const inputSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "register", 5);
    const input = inputSchema.parse(await readJson(request));
    const normalizedEmail = input.email.trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { normalizedEmail }, select: { id: true } })) {
      throw new HttpError(409, "We could not create an account with those details.");
    }
    const password = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        normalizedEmail,
        name: input.name,
        credential: { create: { password } },
      },
      select: { id: true },
    });
    await createSession(user.id);
    return NextResponse.json({ user, needsFamilySetup: true }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

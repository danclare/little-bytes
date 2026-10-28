import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { emailSchema, nameSchema, passwordSchema } from "@/lib/validation";
import { z, ZodError } from "zod";

const inputSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });

export async function POST(request: Request) {
  let stage = "origin-check";
  try {
    assertSameOrigin(request);
    stage = "rate-limit";
    await enforceRateLimit(request, "register", 5);
    stage = "input-validation";
    const input = inputSchema.parse(await readJson(request));
    const normalizedEmail = input.email.trim().toLowerCase();
    stage = "account-lookup";
    if (await prisma.user.findUnique({ where: { normalizedEmail }, select: { id: true } })) {
      throw new HttpError(409, "We could not create an account with those details.");
    }
    stage = "password-hashing";
    const password = await hashPassword(input.password);
    stage = "account-create";
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        normalizedEmail,
        name: input.name,
        credential: { create: { password } },
      },
      select: { id: true },
    });
    stage = "session-create";
    await createSession(user.id);
    return NextResponse.json({ user, needsFamilySetup: true }, { status: 201 });
  } catch (error) {
    if (!(error instanceof HttpError) && !(error instanceof ZodError)) {
      console.error("Registration failed", {
        stage,
        errorType: error instanceof Error ? error.name : "Unknown error",
      });
    }
    return jsonError(error);
  }
}

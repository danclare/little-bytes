import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { getEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { emailSchema } from "@/lib/validation";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "password-reset", 5);
    const { email } = z.object({ email: emailSchema }).parse(await readJson(request));
    if (getEnv().EMAIL_DELIVERY === "disabled") {
      throw new HttpError(503, "Password reset is unavailable until email delivery is configured.");
    }
    const user = await prisma.user.findUnique({
      where: { normalizedEmail: email.toLowerCase() },
      select: { id: true, email: true },
    });
    if (user) {
      try {
        const token = await createPasswordResetToken(user.id);
        await sendPasswordResetEmail(user.email, token);
      } catch (error) {
        console.error(
          "Password reset request processing failed",
          error instanceof Error ? error.name : "Unknown error",
        );
      }
    }
    return NextResponse.json(
      {
        message:
          "If an account matches, reset instructions will be sent if email delivery is available.",
      },
      { status: 202 },
    );
  } catch (error) {
    return jsonError(error);
  }
}

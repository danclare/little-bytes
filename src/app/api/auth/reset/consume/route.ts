import { NextResponse } from "next/server";
import { consumePasswordResetToken } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { passwordSchema } from "@/lib/validation";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "password-reset-consume", 5);
    const { token, password } = z
      .object({ token: z.string().min(32).max(128), password: passwordSchema })
      .parse(await readJson(request));
    if (!(await consumePasswordResetToken(token, password))) {
      throw new HttpError(400, "This reset link is invalid or has expired.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

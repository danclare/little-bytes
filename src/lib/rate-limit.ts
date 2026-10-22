import "server-only";
import { createHmac } from "node:crypto";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function enforceRateLimit(request: Request, scope: string, limit = 8): Promise<void> {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const keyHash = createHmac("sha256", getEnv().RATE_LIMIT_HMAC_KEY)
    .update(`${scope}:${address}`)
    .digest("hex");
  const cutoff = new Date(Date.now() - 15 * 60_000);
  await prisma.rateLimitAttempt.create({ data: { keyHash } });
  await prisma.rateLimitAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const count = await prisma.rateLimitAttempt.count({
    where: { keyHash, createdAt: { gte: cutoff } },
  });
  if (count > limit) {
    const { HttpError } = await import("@/lib/http");
    throw new HttpError(429, "Too many attempts. Please wait a little and try again.");
  }
}

import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";

export const SESSION_COOKIE = "little_bites_session";
const SESSION_DAYS = 30;
let dummyPasswordHash: Promise<string> | undefined;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function verifyPasswordOrDummy(
  hash: string | undefined,
  password: string,
): Promise<boolean> {
  if (!hash) {
    dummyPasswordHash ??= hashPassword(randomBytes(32).toString("hex"));
    await verifyPassword(await dummyPasswordHash, password);
    return false;
  }
  return verifyPassword(hash, password);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function requireUser(): Promise<{ id: string; email: string; name: string }> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) throw new HttpError(401, "Please sign in to continue.");
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, user: { select: { id: true, email: true, name: true } } },
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    throw new HttpError(401, "Please sign in to continue.");
  }
  return session.user;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const { getEnv } = await import("@/lib/env");
  const expiresAt = new Date(Date.now() + getEnv().RESET_TOKEN_TTL_MINUTES * 60_000);
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, consumedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    }),
  ]);
  return token;
}

export async function consumePasswordResetToken(token: string, password: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  const newHash = await hashPassword(password);
  return prisma.$transaction(async (transaction) => {
    const reset = await transaction.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!reset || reset.consumedAt || reset.expiresAt <= new Date()) return false;
    const consumed = await transaction.passwordResetToken.updateMany({
      where: { id: reset.id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) return false;
    await transaction.passwordCredential.upsert({
      where: { userId: reset.userId },
      create: { userId: reset.userId, password: newHash },
      update: { password: newHash },
    });
    await transaction.passwordResetToken.updateMany({
      where: { userId: reset.userId, id: { not: reset.id }, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await transaction.session.deleteMany({ where: { userId: reset.userId } });
    return true;
  });
}

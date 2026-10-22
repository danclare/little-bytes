import "server-only";
import * as oidc from "openid-client";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { resolveEntraIdentity } from "@/lib/entra-identity";

let configurationPromise: Promise<oidc.Configuration> | undefined;

export function entraClient(): Promise<oidc.Configuration> {
  configurationPromise ??= (async () => {
    const env = getEnv();
    if (!env.ENTRA_TENANT_ID || !env.ENTRA_CLIENT_ID || !env.ENTRA_CLIENT_SECRET) {
      throw new Error("Microsoft Entra sign-in is not configured.");
    }
    return oidc.discovery(
      new URL(`https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}/v2.0`),
      env.ENTRA_CLIENT_ID,
      undefined,
      oidc.ClientSecretPost(env.ENTRA_CLIENT_SECRET),
    );
  })().catch((error: unknown) => {
    configurationPromise = undefined;
    throw error;
  });
  return configurationPromise;
}

/**
 * Finds or creates the Little Bites user for a validated Entra ID token. Accounts are keyed on the
 * immutable tenant + object ID; an email address is only trusted for linking or account creation
 * when Entra marks it as verified (see resolveEntraIdentity).
 */
export async function signInEntraUser(claims: Record<string, unknown>): Promise<string | null> {
  const identity = resolveEntraIdentity(claims);
  if (!identity) return null;
  return prisma.$transaction(async (transaction) => {
    const linked = await transaction.account.findUnique({
      where: {
        provider_providerAccountId: { provider: "entra", providerAccountId: identity.subject },
      },
      select: { userId: true },
    });
    if (linked) return linked.userId;
    if (!identity.verifiedEmail) return null;
    const existing = await transaction.user.findUnique({
      where: { normalizedEmail: identity.verifiedEmail },
      select: { id: true },
    });
    if (existing) {
      await transaction.account.create({
        data: { userId: existing.id, provider: "entra", providerAccountId: identity.subject },
      });
      return existing.id;
    }
    const created = await transaction.user.create({
      data: {
        email: identity.verifiedEmail,
        normalizedEmail: identity.verifiedEmail,
        name: identity.name,
        accounts: { create: { provider: "entra", providerAccountId: identity.subject } },
      },
      select: { id: true },
    });
    return created.id;
  });
}

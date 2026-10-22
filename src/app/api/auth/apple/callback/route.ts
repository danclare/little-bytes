import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as oidc from "openid-client";
import { jwtVerify } from "jose";
import { appleClient } from "@/lib/apple";
import { appleSignInConfigured, getEnv } from "@/lib/env";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATE_COOKIE = "little_bites_apple_state";

export async function GET(request: Request) {
  const appUrl = getEnv().APP_URL;
  const redirectError = () => NextResponse.redirect(new URL("/?apple=unavailable", appUrl));
  if (!appleSignInConfigured()) return redirectError();
  const url = new URL(request.url);
  if (url.searchParams.has("error")) return redirectError();
  const jar = await cookies();
  const cookieValue = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  if (!cookieValue) return redirectError();

  let state: { state: string; nonce: string; verifier: string };
  try {
    const verified = await jwtVerify(cookieValue, new TextEncoder().encode(getEnv().AUTH_SECRET), {
      maxTokenAge: "10m",
    });
    state = verified.payload as typeof state;
    if (
      typeof state.state !== "string" ||
      typeof state.nonce !== "string" ||
      typeof state.verifier !== "string"
    )
      return redirectError();
  } catch {
    return redirectError();
  }

  try {
    const configuration = await appleClient();
    const tokens = await oidc.authorizationCodeGrant(configuration, url, {
      pkceCodeVerifier: state.verifier,
      expectedState: state.state,
      expectedNonce: state.nonce,
    });
    const claims = tokens.claims();
    if (!claims) return redirectError();
    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    const verified = claims.email_verified === true || claims.email_verified === "true";
    if (!claims.sub || !email || !verified) return redirectError();

    const userId = await prisma.$transaction(async (transaction) => {
      const linked = await transaction.account.findUnique({
        where: {
          provider_providerAccountId: { provider: "apple", providerAccountId: claims.sub! },
        },
        select: { userId: true },
      });
      if (linked) return linked.userId;
      const existing = await transaction.user.findUnique({
        where: { normalizedEmail: email },
        select: { id: true },
      });
      if (existing) {
        await transaction.account.create({
          data: { userId: existing.id, provider: "apple", providerAccountId: claims.sub! },
        });
        return existing.id;
      }
      const created = await transaction.user.create({
        data: {
          email,
          normalizedEmail: email,
          name: email.split("@")[0].slice(0, 80) || "Little Bites parent",
          accounts: { create: { provider: "apple", providerAccountId: claims.sub! } },
        },
        select: { id: true },
      });
      return created.id;
    });
    await createSession(userId);
    return NextResponse.redirect(new URL("/", appUrl));
  } catch {
    return redirectError();
  }
}

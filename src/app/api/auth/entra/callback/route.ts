import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as oidc from "openid-client";
import { jwtVerify } from "jose";
import { createSession } from "@/lib/auth";
import { entraClient, signInEntraUser } from "@/lib/entra";
import { entraRedirectUri, entraSignInConfigured, getEnv } from "@/lib/env";

const STATE_COOKIE = "little_bites_entra_state";

export async function GET(request: Request) {
  const env = getEnv();
  const redirectTo = (reason: string) =>
    NextResponse.redirect(new URL(`/?entra=${reason}`, env.APP_URL));
  if (!entraSignInConfigured()) return redirectTo("unavailable");
  const jar = await cookies();
  const cookieValue = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: "/api/auth/entra" });
  const incoming = new URL(request.url);
  if (incoming.searchParams.has("error") || !cookieValue) return redirectTo("unavailable");

  let state: { state: string; nonce: string; verifier: string };
  try {
    const verified = await jwtVerify(cookieValue, new TextEncoder().encode(env.AUTH_SECRET), {
      maxTokenAge: "10m",
    });
    state = verified.payload as typeof state;
    if (
      typeof state.state !== "string" ||
      typeof state.nonce !== "string" ||
      typeof state.verifier !== "string"
    )
      return redirectTo("unavailable");
  } catch {
    return redirectTo("unavailable");
  }

  try {
    const configuration = await entraClient();
    // Rebuild the callback URL on the configured redirect URI so the token exchange matches the
    // registered value even when the container sits behind the Container Apps ingress proxy.
    const callbackUrl = new URL(entraRedirectUri());
    callbackUrl.search = incoming.search;
    const tokens = await oidc.authorizationCodeGrant(configuration, callbackUrl, {
      pkceCodeVerifier: state.verifier,
      expectedState: state.state,
      expectedNonce: state.nonce,
    });
    const claims = tokens.claims();
    if (!claims) return redirectTo("unavailable");
    const userId = await signInEntraUser(claims as Record<string, unknown>);
    if (!userId) return redirectTo("unverified");
    await createSession(userId);
    return NextResponse.redirect(new URL("/", env.APP_URL));
  } catch (error) {
    console.error("Entra sign-in callback failed", error instanceof Error ? error.name : "Unknown");
    return redirectTo("unavailable");
  }
}

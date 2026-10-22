import { NextResponse } from "next/server";
import * as oidc from "openid-client";
import { SignJWT } from "jose";
import { entraClient } from "@/lib/entra";
import { entraRedirectUri, entraSignInConfigured, getEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";

const ENTRA_STATE_COOKIE = "little_bites_entra_state";

export async function GET(request: Request) {
  const env = getEnv();
  const unavailable = () => NextResponse.redirect(new URL("/?entra=unavailable", env.APP_URL));
  if (!entraSignInConfigured()) return unavailable();
  try {
    await enforceRateLimit(request, "entra-start", 20);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const verifier = oidc.randomPKCECodeVerifier();
    const challenge = await oidc.calculatePKCECodeChallenge(verifier);
    const configuration = await entraClient();
    const url = oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: entraRedirectUri(),
      scope: "openid profile email",
      response_mode: "query",
      prompt: "select_account",
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    const payload = await new SignJWT({ state, nonce, verifier })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(new TextEncoder().encode(env.AUTH_SECRET));
    const response = NextResponse.redirect(url);
    response.cookies.set(ENTRA_STATE_COOKIE, payload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/entra",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error("Entra sign-in start failed", error instanceof Error ? error.name : "Unknown");
    return unavailable();
  }
}

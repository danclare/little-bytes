import { NextResponse } from "next/server";
import * as oidc from "openid-client";
import { SignJWT } from "jose";
import { appleClient } from "@/lib/apple";
import { appleSignInConfigured, getEnv } from "@/lib/env";

const STATE_COOKIE = "little_bites_apple_state";

export async function GET() {
  if (!appleSignInConfigured())
    return NextResponse.redirect(new URL("/?apple=unavailable", getEnv().APP_URL));
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const verifier = oidc.randomPKCECodeVerifier();
  const challenge = await oidc.calculatePKCECodeChallenge(verifier);
  const env = getEnv();
  const configuration = await appleClient();
  const url = oidc.buildAuthorizationUrl(configuration, {
    redirect_uri: env.APPLE_REDIRECT_URI!,
    scope: "openid email",
    response_mode: "query",
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
  response.cookies.set(STATE_COOKIE, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}

import "server-only";
import * as oidc from "openid-client";
import { importPKCS8, SignJWT } from "jose";
import { getEnv } from "@/lib/env";

let configurationPromise: Promise<oidc.Configuration> | undefined;
let configurationCreatedAt = 0;

async function clientSecret(): Promise<string> {
  const env = getEnv();
  if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
    throw new Error("Apple Sign In is not configured.");
  }
  const key = await importPKCS8(env.APPLE_PRIVATE_KEY.replaceAll("\\n", "\n"), "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" })
    .setIssuer(env.APPLE_TEAM_ID)
    .setSubject(env.APPLE_CLIENT_ID)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 30 * 24 * 60 * 60)
    .sign(key);
}

export async function appleClient(): Promise<oidc.Configuration> {
  if (Date.now() - configurationCreatedAt > 25 * 24 * 60 * 60 * 1000)
    configurationPromise = undefined;
  if (!configurationPromise) {
    configurationPromise = (async () => {
      const env = getEnv();
      if (!env.APPLE_CLIENT_ID) throw new Error("Apple Sign In is not configured.");
      const secret = await clientSecret();
      return oidc.discovery(
        new URL("https://appleid.apple.com"),
        env.APPLE_CLIENT_ID,
        { client_secret: secret },
        oidc.ClientSecretPost(secret),
      );
    })();
    configurationCreatedAt = Date.now();
  }
  return configurationPromise;
}

/** Tenant ID Microsoft uses for personal Microsoft accounts (outlook.com, hotmail.com, etc.). */
export const MICROSOFT_CONSUMER_TENANT_ID = "9188040d-6c67-4c5b-b112-36a304b66dad";

export type EntraIdentity = {
  subject: string;
  name: string;
  verifiedEmail: string | null;
};

const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Derives a stable identity from validated Entra ID token claims.
 *
 * Entra `email`/`preferred_username` claims are mutable and may be unverified in work or school
 * tenants, so they are never used as the account key. An email is only treated as verified when
 * it comes from a personal Microsoft account or the tenant asserts domain ownership via the
 * `xms_edov` optional claim.
 */
export function resolveEntraIdentity(claims: Record<string, unknown>): EntraIdentity | null {
  const tid = typeof claims.tid === "string" ? claims.tid : "";
  const oid = typeof claims.oid === "string" ? claims.oid : "";
  if (!guid.test(tid) || !guid.test(oid)) return null;
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
  const domainVerified =
    claims.xms_edov === true || claims.xms_edov === "true" || claims.xms_edov === 1;
  const verifiedEmail =
    emailLooksValid && (tid.toLowerCase() === MICROSOFT_CONSUMER_TENANT_ID || domainVerified)
      ? email
      : null;
  const rawName = typeof claims.name === "string" ? claims.name.trim() : "";
  return {
    subject: `${tid.toLowerCase()}:${oid.toLowerCase()}`,
    name: (rawName || email.split("@")[0] || "Little Bites parent").slice(0, 80),
    verifiedEmail,
  };
}

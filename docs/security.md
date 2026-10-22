# Security

## Implemented controls

- Argon2id password hashing, generic invalid-credential responses and a dummy
  hash for unknown accounts.
- Persisted opaque sessions; token hashes are stored, cookies are `HttpOnly`,
  `SameSite=Strict`, and production cookies are `Secure`.
- Password-reset tokens are random, stored only as hashes, expiring and
  single-use; password reset invalidates existing sessions and older tokens.
- Password-reset email delivery supports authenticated SMTP with TLS required
  for STARTTLS connections. It is disabled by default and fails closed with
  `503` until provider credentials are configured. When enabled, reset requests
  return the same generic response for matching and non-matching accounts;
  delivery failures are logged without recipient or token details to avoid
  account enumeration. Links keep the token in the URL fragment so it is not
  sent to server access logs or in HTTP referrers.
- Apple OIDC is configuration-gated and uses state, nonce, PKCE and verified
  email checks before linking. It has not been tested with Apple credentials.
- Microsoft sign-in (Entra ID, work/school and personal accounts) is
  configuration-gated and uses the authorization-code flow with state, nonce
  and PKCE via `openid-client`. Accounts are keyed on the immutable
  `tid:oid` pair, never on the mutable email claim. An email is only trusted
  for linking to an existing account when it comes from a personal Microsoft
  account or the tenant asserts domain ownership (`xms_edov`). The client
  secret lives only in Key Vault and rotates on a schedule through Terraform.
- Family RBAC with four roles enforced server-side on every route:
  `owner` (full control), `admin` (children, invitations, editors/viewers),
  `editor` (diary, plans, shopping, child details) and `viewer` (read-only).
  Admins cannot grant admin or manage admins/the owner; the owner cannot be
  removed; removing a member revokes access immediately.
- Family invitations use random single-use tokens stored only as hashes, expire
  after seven days, can be revoked, are bound to the invited email address
  (case-insensitive) and cannot move a user who already belongs to another
  family. Invitation email content is HTML-escaped.
- Zod validation, body-size bounds, generic production errors and
  same-origin checks are used on state-changing API routes.
- Family and child access is resolved through server-side memberships.
- Photo content is decoded and re-encoded; uploads are bounded and private.
  Production rejects local photo storage.
- Responses include a restrictive CSP, frame protection, MIME sniffing
  protection, referrer policy and permissions policy. HSTS is added only for
  production deployments served over HTTPS.
- Rate-limit keys are HMACed before persistence; logs avoid request bodies,
  credentials and personal fields.

## Deployment requirements

Production must use HTTPS, PostgreSQL TLS, a private Blob container, managed
identity, Key Vault references and a protected GitHub OIDC deployment
environment. No Azure client secret belongs in GitHub. The Terraform plan and
remote state must be treated as sensitive because generated database credentials
are stored in Terraform state as well as Key Vault.

The current Azure context cannot authenticate, and the GitHub remote is
read-only. No cloud policy, role assignment, container image scan, or live
Azure security test has been performed.

## Validation status and known limitations

The local production dependency audit reported no vulnerabilities after
updating affected runtime packages. The full dependency audit still reports
five high-severity findings in the `eslint-config-next` → `@next/eslint-plugin-next`
→ `fast-glob` → `micromatch` → `braces` development-tool dependency chain.
The registry has no patched `braces` version available; forcing the audit's
suggested Next.js 14 downgrade would mismatch this Next.js 16 application and
was not applied. This is a development-only upstream limitation, not a
production dependency finding.

Role and invitation behaviour is covered by `tests/integration/family-roles.test.ts`
(permission matrix, escalation prevention, hash-only token storage, email
binding, single use, expiry/revocation and member removal) and by unit tests for
role rules and Entra claim handling. Microsoft sign-in has not been tested
against a live Entra tenant because no app registration could be created.

The PostgreSQL cross-family integration test and Playwright cross-family
requests passed locally against the dedicated PostgreSQL test database in
Chromium and WebKit. No live Azure security test was possible.

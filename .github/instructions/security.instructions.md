---
applyTo: "src/**/*.{ts,tsx},prisma/**/*.prisma,.github/workflows/**/*.{yml,yaml},Dockerfile"
---

# Security instructions

Apply secure defaults to every implementation.

## Authentication and sessions

- Use server-managed sessions.
- Use `HttpOnly` cookies.
- Use an appropriate `SameSite` policy.
- Set `Secure` in production.
- Rotate or invalidate sessions when security-sensitive account state changes.
- Never place session tokens in URLs.
- Never log passwords, password hashes, reset tokens, OAuth client secrets or session tokens.
- Use generic authentication failures.
- Rate-limit authentication and other sensitive endpoints.
- Apply CSRF protection where required by the selected authentication and request model.

## Passwords and reset tokens

- Hash passwords using Argon2id through a maintained library.
- Enforce a documented minimum password policy.
- Do not truncate passwords silently.
- Generate password-reset tokens with a cryptographically secure random source.
- Store only a token hash.
- Enforce expiry.
- Enforce single use.
- Invalidate older outstanding reset tokens after successful use.

## Authorisation

For every family-owned operation:

1. Obtain the user identifier from the authenticated server session.
2. Resolve access through `FamilyMembership`.
3. Scope the database operation by both the resource identifier and authorised family.
4. Return a non-sensitive denial or not-found response.
5. Record no unnecessary personal data in logs.

Do not fetch a record and rely on client-side checks afterwards.

Tests must cover cross-family:

- reads;
- updates;
- deletes;
- nested resources;
- guessed UUIDs;
- mismatched child and family identifiers.

## Input and output handling

- Validate request bodies, query strings and route parameters with Zod or equivalent.
- Bound string lengths, arrays, page sizes and request sizes.
- Reject unsupported fields where practical.
- Use parameterised Prisma operations.
- Encode user-controlled output through the framework’s safe output handling.
- Do not render raw HTML without a reviewed sanitisation requirement.
- Do not expose stack traces or internal database errors in production.

## Headers and transport

Configure suitable production security headers, including:

- Content Security Policy appropriate to the application;
- `X-Content-Type-Options`;
- `Referrer-Policy`;
- protection against unwanted framing;
- restrictive permissions policy where appropriate;
- HSTS only when HTTPS deployment is established.

Use HTTPS in production. Require TLS for PostgreSQL connections.

## Secrets and configuration

- Commit only `.env.example` with placeholder names.
- Validate required server environment variables at start-up.
- Keep public and server-only environment variables separate.
- Do not bake secrets into the container image.
- Do not expose secrets through Terraform outputs.
- Do not echo secret values in GitHub Actions.
- Prefer managed identity and Key Vault references.
- Use a strong Key Vault-managed database credential when managed database identity is not practical.

## Supply chain

CI should include:

- lockfile-based dependency installation;
- dependency vulnerability scanning;
- container vulnerability scanning;
- secret scanning or an equivalent check;
- pinned action versions, preferably immutable commit references for sensitive workflows;
- least-privilege workflow permissions.

Do not allow deployment workflows to run with Azure credentials for an untrusted pull request.

## Child photo security

Treat child photos as private family data.

- Require authentication and family membership for upload, viewing,
  replacement and deletion.
- Keep image storage private; do not enable anonymous public access.
- Serve images through an authorised application endpoint or a short-lived,
  narrowly scoped access mechanism issued after authorisation.
- Validate actual file content, not only filename or browser MIME type.
- Enforce configurable file-size and decoded-image dimension limits.
- Reject SVG, executable content and unsupported formats.
- Decode and re-encode accepted images using a maintained image library.
- Strip EXIF metadata, including location information.
- Generate random object names; do not include child names or email addresses.
- Do not log image contents, access tokens or signed image URLs.
- Apply upload rate limits and handle abandoned uploads safely.
- Do not perform facial recognition or infer attributes from photos.
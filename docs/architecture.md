# Architecture

## Overview

The application is a Next.js App Router service written in TypeScript. The
browser renders responsive pages and calls same-origin route handlers; route
handlers and server-only domain modules validate input, authenticate the
session, enforce family membership and access PostgreSQL through Prisma.

```text
Browser
  └── Next.js pages and same-origin API
       ├── session, family and child authorisation
       ├── food, diary, recipe, planning and shopping services
       ├── Prisma ── PostgreSQL
       └── private photo service ── local development storage or Azure Blob
```

There is no client-side database access and no LLM dependency in meal planning.
The initial planner uses deterministic rules and returns a reviewable draft;
only an explicit approval saves a plan.

## Persistence model

The Prisma schema models users, password credentials, OAuth accounts,
persisted sessions, reset tokens, families and memberships, children,
canonical ingredients and foods, child food statuses, diary entries, recipes
and recipe ingredients, meal plans and meals, reusable templates, shopping
lists and list items. Foreign keys, unique constraints and indexes express
ownership and lookup rules. The versioned SQL migration is under
`prisma/migrations/`.

Food status is a current child-specific snapshot. Diary entries are a separate,
appendable history. A diary entry may optionally reference the recipe and the
planned meal it was logged from (`recipe_id`, `planned_meal_id`, both
`ON DELETE SET NULL`), so Today can show a meal as logged. The meal-log endpoint
(`POST /api/children/{childId}/diary/meals`) writes all chosen foods and status
updates in one transaction and only accepts foods that belong to the recipe or
planned meal, after verifying the child and planned meal belong to the caller's
family. Catalogue rows use stable slugs and are seeded idempotently;
the seed refuses production use unless `ALLOW_CATALOG_SEED=true` is explicitly
set.

## Authentication and authorisation

Registration and sign-in create a random opaque session token. Only its SHA-256
hash is stored in PostgreSQL. The cookie is `HttpOnly`, `SameSite=Strict`,
`Secure` in production and expires after 30 days. Passwords use Argon2id.
Sensitive endpoints use a database-backed rate limit with an HMAC of the
client address rather than storing the address directly.

Every family-owned operation resolves the user's family membership on the
server and scopes the query by the authorised family or child. Client-selected
child IDs are not treated as proof of access. Cross-family coverage is present
in the PostgreSQL integration test and browser-flow test; those database-backed
tests have not yet been executed in this environment.

## Photo storage

Uploads accept JPEG, PNG and WebP, enforce byte and decoded-dimension limits,
rotate according to image orientation, resize/re-encode as JPEG and discard
metadata. Object keys are random and do not contain child identifiers or
names. The database stores the private object key, not image bytes or a public
URL. Reads, uploads, replacements and removals pass through the authenticated
child route. Production requires an Azure Blob container with anonymous access
disabled and managed identity; local file storage is development-only.

HEIC/HEIF conversion is not implemented; the upload response explains which
formats are accepted.

## Planning and date conventions

The planner uses the child's recorded readiness, food history, preferences,
restrictions and persisted recipes. Generated suggestions retain food and
allergen warnings and are not represented as medically tailored or
nutritionally complete. Recipe scaling preserves units and uses deterministic
rounding. Shopping aggregation uses canonical ingredient IDs and normalized
units; unrelated or incompatible items are not combined.

Weeks begin on Monday. Week-start values and planned-meal dates are stored as
UTC date-only values to avoid time-zone shifts.

## Operational boundaries

PostgreSQL is required for persistence, sessions, rate limits and production
operation. The web container is designed for Azure Container Apps and a
separate migration job. Scale-to-zero applies only to the web workload; it
does not stop PostgreSQL. Deployment, live cold-start behaviour, backups and
restore have not been verified because Azure authentication is unavailable.

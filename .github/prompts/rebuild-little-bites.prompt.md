---
description: "Inspect, rebuild, test and prepare Little Bites for Azure deployment"
agent: "agent"
---

# Rebuild Little Bites

Rebuild **Little Bites: Baby Weaning** as a secure, persistent and deployable application.

Follow all repository-level and path-specific Copilot instructions.

## Mission

Inspect the existing repository and the current public product at:

[Little Bites existing product](https://little-bites-weaning.floot.app)

If source code, exports or existing assets are available, inspect them before replacing functionality.

Preserve useful content, visual design and properly licensed assets where practical. Do not copy private user data, credentials or production secrets.

The required outcome is an end-to-end working MVP with:

- email/password authentication;
- family onboarding;
- multiple child profiles;
- active-child switching;
- child-specific food statuses and diary history;
- food discovery and preparation guidance;
- recipes and serving scaling;
- deterministic meal-plan generation;
- weekly planner;
- persistent shopping lists;
- automated tests;
- a production container;
- Terraform for Azure;
- GitHub Actions validation and deployment workflows;
- operational and security documentation.

Do not stop after planning or scaffolding.

## Stage 1: inspect and establish the baseline

Before making large changes:

1. Inspect the repository tree.
2. Read the package manifest, lockfile, framework configuration, database files, authentication code, workflows and documentation.
3. Run the existing install, lint, type-check, test and build commands where possible.
4. Inspect the current public application without entering or copying private data.
5. Identify reusable content, styles and assets.
6. Check available Azure CLI and GitHub CLI authentication without printing credentials.
7. Record:
   - existing capabilities;
   - missing capabilities;
   - broken capabilities;
   - architecture risks;
   - security risks;
   - external blockers.
8. Create a prioritised checklist in `docs/implementation-status.md`.

Do not treat the public application as proof that a feature is implemented correctly.

## Stage 2: choose the smallest coherent architecture

Prefer:

- Next.js;
- TypeScript;
- React;
- Tailwind CSS;
- Next.js route handlers;
- PostgreSQL;
- Prisma;
- Auth.js or a maintained equivalent;
- Argon2id;
- Zod;
- Vitest or Jest;
- Playwright.

Use framework-independent domain services for:

- authorisation;
- food-status updates;
- diary operations;
- recipe scaling;
- ingredient aggregation;
- plan generation.

Document the architecture in `docs/architecture.md`.

## Stage 3: implement the data model

Create a relational Prisma schema and versioned migration covering:

- users;
- accounts;
- sessions;
- verification or reset tokens;
- password credentials;
- families;
- memberships;
- children;
- child food statuses;
- diary entries;
- foods;
- recipes;
- recipe ingredients;
- meal plans;
- planned meals;
- shopping lists;
- shopping-list items.

Use UUIDs or another consistent non-guessable identifier. Add foreign keys, uniqueness constraints, indexes and deliberate deletion behaviour.

Create an idempotent development seed containing a small, editable food and recipe catalogue. The seed must not insert sample records into an existing production database without an explicit operator decision.

Verify that a clean database can be created entirely from committed migrations.

## Stage 4: implement authentication and authorisation

Implement and test:

- account registration;
- login;
- logout;
- secure password hashing;
- persistent secure sessions;
- protected server routes and pages;
- first-run family creation;
- password-reset token generation, expiry and one-time consumption;
- family membership checks on every protected operation;
- generic authentication errors;
- rate limiting for authentication and sensitive routes.

If email delivery is unavailable, complete and test the reset-token workflow and document the missing delivery configuration.

Implement Apple Sign In behind explicit environment configuration. Do not show or report it as configured unless real credentials and the callback flow are tested.

## Stage 5: implement the product vertical slice

Build responsive and accessible pages for:

- landing;
- registration and login;
- onboarding;
- child dashboard and child switcher;
- food discovery and search;
- food details and preparation modes;
- food diary;
- recipe library and recipe detail;
- meal-plan generation and editing;
- weekly planner;
- shopping list;
- account and family settings.

All user-specific screens must read and write through authenticated server operations backed by the database.

Implement accessible loading, error, empty and success states.

## Stage 6: implement product rules

### Child profiles and diary

Support:

- create;
- edit;
- switch;
- remove with confirmation;
- food status changes;
- preparation, texture, amount, reaction and note logging;
- chronological diary filtering;
- data persistence across refresh and new sessions.

Updating a current food status must not remove diary history.

### Preparation guides

For relevant foods, provide:

- finger-food or baby-led preparation;
- mashed or fork-mashed preparation;
- puréed preparation.

Retain complete text guidance when images are used.

Add current authoritative UK guidance sources to the product guidance area or documentation. Do not invent safety, storage or reheating values.

### Meal plans

Generate an explainable plan from:

- age and recorded readiness;
- tried-food history;
- food status;
- parent-entered preferences and restrictions;
- exclusions;
- persisted foods and recipes;
- desired period and meal types.

Distinguish familiar and new foods. Retain allergen and preparation warnings. Allow replace, edit, approve and remove.

Only save an accepted plan. Do not claim nutritional completeness or medical personalisation.

### Recipe scaling and shopping

Implement tested recipe scaling based on serving ratio.

Aggregate shopping items only when ingredient identity and units are compatible. Retain incompatible or ambiguous units as separate editable items.

Persist:

- generated items;
- manual items;
- checked state;
- source recipe references.

### Weekly planning

Support:

- breakfast;
- lunch;
- dinner;
- optional snacks;
- add;
- move;
- replace;
- remove;
- duplicate day;
- reuse previous plan;
- generate shopping list.

Use a documented week-start convention and consistent date-only storage.

## Stage 7: harden and test

Add unit, integration and Playwright tests.

Explicitly test:

- registration and login;
- invalid credentials;
- session persistence;
- family setup;
- two-child creation;
- active-child isolation;
- diary persistence;
- food status versus diary history;
- preparation-guide modes;
- meal-plan generation and editing;
- recipe quantity scaling;
- shopping-list aggregation;
- shopping checked-state persistence;
- weekly meal operations;
- cross-family read denial;
- cross-family update denial;
- unauthenticated access;
- invalid and oversized input;
- reset-token expiry and single use.

Run the available lint, formatting, type-check, test, Prisma validation and production build commands. Fix failures caused by the implementation.

Do not report skipped tests as passing.

## Stage 8: container and Azure infrastructure

Create a reproducible multi-stage `Dockerfile` and `.dockerignore`.

Create Terraform under `infra/terraform/` for:

- resource group;
- Container Registry;
- Log Analytics;
- Container Apps environment;
- Container App;
- PostgreSQL Flexible Server and database;
- Key Vault;
- managed identity;
- least-privilege role assignments;
- monitoring configuration.

Create a separate `infra/terraform/bootstrap/` procedure for remote state storage.

Configure the Container App with:

- HTTP ingress;
- `min_replicas = 0`;
- an initial maximum of `3`;
- a health endpoint;
- secure environment or secret references;
- immutable image tags.

Do not expose PostgreSQL to `0.0.0.0/0`.

Use private networking when it can be implemented and verified safely. Otherwise implement the narrowest workable connectivity and document the exact limitation.

Create and document:

- `terraform fmt -check`;
- `terraform init -backend=false`;
- `terraform validate`;
- reviewed plan and apply process;
- rollback;
- database backup and restore.

Do not provision resources until the plan, region availability and likely ongoing costs have been reviewed using available authenticated tools.

## Stage 9: GitHub Actions

Create separate workflows for validation and deployment.

CI must run:

- lockfile-based install;
- formatting;
- lint;
- TypeScript checking;
- unit and integration tests;
- Prisma validation;
- Terraform formatting and validation;
- application build;
- container build;
- dependency vulnerability scanning;
- container vulnerability scanning.

Deployment must:

- run only from an approved protected path;
- use Microsoft Entra OIDC;
- avoid stored Azure client secrets;
- use an immutable commit-SHA image tag;
- push to ACR;
- apply reviewed Terraform to the intended environment;
- run controlled migrations;
- deploy a Container App revision;
- run smoke tests;
- report real output;
- preserve rollback instructions.

Use GitHub Environments and approval protection for production when available.

## Stage 10: deploy only when authorised

If Azure and GitHub credentials have sufficient permissions:

1. Confirm the active subscription without printing tokens.
2. Confirm the selected region and resource availability.
3. Validate Terraform.
4. Review the plan and likely cost.
5. Bootstrap or configure remote state safely.
6. Apply infrastructure.
7. Build and push the image.
8. Run migrations through the controlled mechanism.
9. Deploy the immutable revision.
10. Test the health endpoint.
11. Test a critical authenticated flow if test credentials can be created safely.
12. Verify the configured replica limits.
13. Verify logs and database TLS connectivity.
14. Record actual resource identifiers and URLs from tool output.

If permissions are insufficient, finish all repository work and document exact commands and permissions required. Do not fabricate deployment success.

## Documentation deliverables

Create or update:

- `README.md`;
- `.env.example`;
- `docs/architecture.md`;
- `docs/security.md`;
- `docs/deployment.md`;
- `docs/rollback.md`;
- `docs/backup-restore.md`;
- `docs/costs.md`;
- `docs/food-safety-sources.md`;
- `docs/implementation-status.md`.

`.env.example` must contain placeholder names only and distinguish:

- public client configuration;
- server-only configuration;
- database settings;
- OAuth settings;
- Azure deployment settings.

## Acceptance criteria

Do not mark an item complete without evidence.

### Product

- A user can register, sign in and sign out.
- A user can create a family and at least two children.
- Child switching changes diary, status and meal-plan context.
- Diary entries survive refresh and a new session.
- Foods are searchable.
- Preparation guides contain all required modes.
- Meal plans can be generated, edited, accepted and persisted.
- Recipe quantities scale correctly.
- Shopping lists aggregate compatible quantities and persist check state.
- Weekly meals can be added, moved, replaced and removed.
- Cross-family data access is denied.
- Mobile, loading, empty and error states work.
- Apple Sign In is either tested end-to-end or clearly documented as awaiting credentials.

### Delivery

- Terraform formatting and validation pass.
- CI can run from a clean checkout.
- The container builds reproducibly.
- OIDC configuration contains no stored Azure client secret.
- Migrations build a clean database.
- Container Apps has `min_replicas = 0`.
- PostgreSQL uses TLS and a restricted access model.
- Secrets are absent from source and ordinary logs.
- Rollback and backup procedures are documented.
- Live checks are reported only if actually executed.

## Final response format

At the end of the work, provide:

### Implemented

List the completed product, security, infrastructure and pipeline changes.

### Changed files

Group the important files by application, tests, infrastructure, workflows and documentation.

### Verification

For each command actually run, include:

- command;
- result;
- environment: local, CI or live Azure.

### Deployment

Include only verified values:

- application URL;
- deployed revision;
- Azure resource group;
- relevant resource names;
- workflow run link or identifier.

If deployment did not occur, state that plainly.

### Cost decision

Summarise the selected database and major ongoing cost contributors. Do not describe unverified pricing as exact.

### Blockers

For each blocker, provide:

- missing permission, credential or external dependency;
- work already completed;
- exact resolution steps.

### Remaining work

List only genuinely incomplete items. Do not include completed items or generic future enhancements.

## Additional mandatory scope and acceptance criteria

Include the following in the implementation checklist and completion audit:

- Optional private child profile photos, including upload, preview,
  replacement, removal and default avatars.
- Secure private image storage, server-side validation and family isolation.
- Fully usable mobile and desktop experiences, including photo uploads
  and an accessible mobile weekly planner.
- Expanded food, ingredient, recipe and reusable meal-plan catalogues
  meeting the targets in application.instructions.md.
- Canonical ingredient relationships supporting recipe scaling and
  shopping-list aggregation.
- Automated tests covering these requirements.

Do not mark these complete solely because UI controls or seed files exist.
Verify persistence, authorisation, responsive behaviour and catalogue quality.
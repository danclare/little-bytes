# Little Bites implementation status

This is the acceptance checklist for the rebuild. A status is complete only
when implementation is supported by executed verification. Local validation,
GitHub CI and live Azure deployment are reported separately.

Status: `[ ]` not started, `[~]` partially complete or awaiting verification,
`[x]` verified complete, `[!]` blocked by an external dependency.

## Final summary

- Complete: 16 sections
- Partial: 7 sections
- Blocked: 4 sections
- Not started: 0 sections

The application, tests, container images, Terraform and workflows are present.
No GitHub workflow run or Azure deployment occurred. The local Azure CLI
identity fails with `AADSTS7000215`; the GitHub repository is empty, its
production Environment is not configured, and runner enumeration was denied.

## 1. Repository/application foundation — [x]

- [x] Next.js, TypeScript, responsive interface and server-only data access.
- [x] Environment validation, `.env.example`, package lock and repository
      hygiene files.
- [x] Architecture, error states and project setup documented.
- [x] Verified: format check, lint, typecheck and production build pass.

## 2. Database — [x]

- [x] Relational Prisma schema, constraints, indexes and deletion behavior.
- [x] Versioned migration and idempotent seed kept separate from production
      migration execution.
- [x] Verified: Prisma validation, PostgreSQL integration suite and rebuilt
      migrator image; no pending migrations, 60 ingredients, 48 recipes and 12
      seven-day templates seeded.
- [x] Family invitation table and role column added through a versioned
      migration.

## 3. Authentication — [~]

- [x] Registration, login, logout, persistent secure sessions, Argon2id
      passwords, rate limits and reset-token handling implemented.
- [x] Verified: PostgreSQL auth/reset-token integration tests and browser
      sign-in/sign-out/persistence journeys pass, including reset-link
      consumption and sign-in with the new password.
- [x] Authenticated SMTP reset-email integration and request/consume UI are
      implemented; mocked SMTP transport and browser reset flows pass.
- [!] Email delivery is disabled by default until SMTP service credentials
  are configured; reset requests fail closed with `503` while disabled.
- [x] Local launcher seeds two local-only development accounts (owner and
      editor) with a random per-machine password; verified sign-in locally.
- [~] Microsoft (Entra ID) sign-in for work/school and personal accounts is
  implemented (authorization code + PKCE, state, nonce, `tid:oid` keyed
  identities, verified-email-only linking) and configuration-gated. Terraform
  creates the app registration, rotating secret and Container App settings.
  Unit tests cover claim handling; a live sign-in requires the app
  registration, which needs Graph `Application.ReadWrite.OwnedBy` for the
  deployment identity and a working Azure login.
- [!] Apple OIDC is implemented and configuration-gated; real Apple
  credentials and a production callback URL are not available.

## 4. Family management — [x]

- [x] Family creation, membership resolution and server-side authorization.
- [x] Role-based access (owner, admin, editor, viewer) enforced on every API
      route; email invitations with hashed single-use expiring tokens, role
      changes, member removal and leaving a family from the Profile tab.
- [x] Verified: `family-roles` integration tests (permission matrix, escalation
      prevention, email binding, single use, expiry/revocation, removal) and
      browser checks that another family's member list is not visible.
- [x] Verified: cross-family reads, writes, guessed IDs, child photos, plans and
      shopping-list access are denied in integration and browser tests.

## 5. Child profiles — [x]

- [x] Multiple profiles, active-child selection, readiness and preferences.
- [x] Readiness confirmation lists the three individual signs with an explicit
      summary; planning errors state the exact reason (age with the available
      date, or missing signs). Verified by unit tests and browser journey.
- [x] Private photo preview, processing, replacement and removal; server-side
      family authorization and private local/Azure storage paths.
- [x] Verified: photo lifecycle, anonymous and cross-family access denial,
      malformed/unsupported/oversized rejection, EXIF orientation correction and
      metadata stripping; persistence through browser refresh/sign-in on Chromium
      and WebKit.

## 6. Food catalogue — [x]

- [x] Searchable, persisted catalogue with canonical ingredient metadata,
      allergens and age-aware guidance.
- [x] Food cards open an accessible detail dialog with preparation, allergen
      and diary history; verified in the browser journey.
- [x] Verified seed validation: 60 distinct ingredients.

## 7. Food diary — [x]

- [x] Persistent diary entries and separate food-status history, preparation,
      amount, date, reactions, notes and filtering.
- [x] Verified: PostgreSQL persistence, child switching and re-login browser
      coverage.
- [x] One-step meal logging: from a Today meal tile or any recipe, parents can
      cook step by step (large text, screen kept awake where supported) and
      then log every catalogue food in the meal with a per-food reaction,
      amount, time and notes. Entries link to the recipe/planned meal through a
      versioned migration (`20261022160000_diary_meal_links`) and Today marks
      the meal as logged. Mobile-first bottom sheet with a sticky action bar
      and 44px+ touch targets.
- [x] Verified: `meal-log` integration tests (success and status updates,
      foods outside the meal rejected, duplicate/future/sourceless rejected,
      cross-family child and foreign planned meal return 404, viewer 403,
      signed-out 401, cross-origin 403), `meal-log` unit tests, and the
      Chromium/WebKit journey cooking and logging a planned recipe at 390px.

## 8. Preparation guidance — [x]

- [x] Finger-food, mashed and puréed preparation guidance, hazards,
      allergen/readiness context and medical boundaries.
- [x] Food-safety sources and content limitations documented.

## 9. Recipe library — [x]

- [x] Searchable breakfast/lunch/dinner recipes linked to canonical ingredients
      with quantities and units.
- [x] Recipe cards open a detail dialog; breakfast/lunch/dinner filters;
      selected ingredients can be added to an existing or new shopping list.
- [x] Verified: browser journey covers filters, detail, scaling and adding two
      selected ingredients to a new list; a foreign list returns 404.
- [x] Verified seed validation: 48 recipes and 12 seven-day templates.

## 10. Recipe scaling — [x]

- [x] Deterministic serving-ratio scaling and explicit rounding.
- [x] Unit tests cover fractional scaling and incompatible units.

## 11. Meal planning — [x]

- [x] Deterministic suggestions consider age/readiness, food history,
      preferences, restrictions and exclusions.
- [x] Draft review, warnings, labels, edits and template revalidation before
      saving implemented.
- [x] Verified by browser and domain tests.

## 12. Weekly planner — [x]

- [x] Monday week start, date-only handling, meal slots, edit/move/replace,
      duplicate/reuse flows and accessible list presentation.
- [x] Saved plan meals appear on the Today tab with their recipe; plan layout
      reworked so action buttons no longer overflow; 12 templates available.
- [x] Verified by browser journey and date/domain tests.

## 13. Shopping lists — [x]

- [x] Persisted generated/manual lists, canonical compatible-unit aggregation,
      source references, categories, check state and deletion.
- [x] Verified creation, persistence and cross-family denial in browser tests.

## 14. Security — [~]

- [x] Server-side membership checks, input validation, request bounds,
      same-origin checks, secure production cookie policy, security headers and
      privacy-safe operational behavior are implemented and reviewed.
- [x] Verified: production-only `npm audit --omit=dev` reports zero
      vulnerabilities; family-isolation tests pass.
- [~] Full `npm audit` reports five high-severity development-tool findings in
  the `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` →
  `micromatch` → `braces` chain. The advisory affects `braces <=3.0.3`; the
  registry currently offers 3.0.3 and the proposed audit fix downgrades the
  Next.js ESLint config to incompatible 14.2.35. No safe compatible upgrade
  was available during validation.
- [x] Trivy 0.65.0 (via Docker) run locally: Terraform config scan has 0
      HIGH/CRITICAL after adding a default-deny Key Vault network ACL; secret
      scan clean; web and migrator images have 0 fixable HIGH/CRITICAL after
      removing the unused npm CLI from runtime images. 58 HIGH/1 CRITICAL
      unfixed Debian base-OS CVEs have no available fix; CI fails on any
      fixable finding.

## 15. Accessibility/responsive UI — [~]

- [x] Accessible labels, keyboard use, mobile navigation, photo controls and
      weekly-planner alternatives implemented.
- [x] Verified: Axe login-page check, 320px overflow and keyboard checks, and
      Chromium/WebKit browser journeys pass.
- [x] UI sweep (360/768/1280px screenshots of every tab and key dialogs):
      diary history redesigned as day-grouped entry cards with labelled
      preparation/texture/amount facts (fixes clipped/run-together text);
      Today week strip scrolls horizontally on tablet/mobile; Today stats
      2-up on mobile; planner week toolbar single-row on mobile; food modal
      age guidance full-width on mobile; Profile "Family" tab no longer wraps.
      No page-level horizontal overflow found.
- [~] No physical-device test was possible in this environment.

## 16. Automated testing — [x]

- [x] Vitest: 12 files, 47 tests passed (unit and PostgreSQL integration),
      including roles, invitations, Entra claims, readiness reasons, semantic
      release versioning, authentication, reset tokens and family isolation.
- [x] Playwright: 2 browser-project journeys passed (Chromium and WebKit),
      including password-reset request/consumption, persistence, photo lifecycle
      and cross-family attack attempts.
- [x] Test database cleanup and serial browser execution configured.

## 17. Docker/containerisation — [x]

- [x] Multi-stage Dockerfile, `web` and `migrator` targets, health check and
      `.dockerignore` implemented.
- [x] Verified rebuilt targets: migrator applied migrations/seeded the
      catalogue; web container `/api/health` returned `{"status":"ok"}` with
      database connectivity. No Prisma OpenSSL warning appeared after installing
      OpenSSL in the image.
- [x] Runtime images contain no npm/npx/corepack; containers re-verified
      (migrations, health `ok`, unauthenticated session `401`).
- [x] Container vulnerability scan executed locally; see Security.

## 18. Azure infrastructure — [~]

- [x] Parameterized Terraform defines Container Apps, ACR, PostgreSQL,
      Key Vault, identity, monitoring, private image storage, TLS, restricted
      networking, backups and deletion protection.
- [x] Container Apps configuration sets minimum replicas to zero and maximum
      replicas to three.
- [~] Azure region capability, quota and cost could not be checked against the
  subscription because Azure authentication could not be refreshed. No
  resources were provisioned.

## 19. Terraform — [~]

- [x] Provider/version locks, state bootstrap configuration, safe ignore rules
      and operator documentation.
- [x] Placeholder `bootstrap_image` on first create; Terraform ignores the
      container image afterwards so CD owns image references. Entra app
      registration, rotating secret in Key Vault, AcrDelete role for retention.
- [x] Verified: recursive `terraform fmt -check`, backend-free init and
      `terraform validate` passed for both infrastructure and bootstrap.
- [!] No authenticated plan was reviewed; Azure identity failed with
  `AADSTS7000215`. Do not apply until identity, backend and cost are reviewed.

## 20. GitHub Actions CI — [!]

- [x] CI workflow is present with application, test, Prisma, Terraform,
      container and configured security validation steps.
- [!] No workflow run is possible yet: `danclare/little-bytes` is empty, has no
  branch or workflow runs, and the available GitHub identity has read-only
  access; runner availability could not be inspected.

## 21. GitHub Actions deployment — [!]

- [x] Separate protected deployment workflow uses Entra OIDC (no client
      secret), semantic versions from conventional commits, images tagged with
      semver and the immutable commit SHA, `az containerapp` image updates for
      the migration job and app, health/401/image/scaling verification, ACR
      pruning to the latest two images, release git tags and a SHA rollback
      input.
- [x] Verified locally: actionlint 1.7.7 (with shellcheck) clean on all
      workflows; release-version unit tests pass. Not run on GitHub.
- [!] GitHub `production` Environment and runner are not configured/verified;
  the public remote is empty and the available GitHub identity has read-only
  access. Required setup is listed in [deployment.md](./deployment.md).

## 22. Observability — [~]

- [x] Privacy-safe application logging, health endpoint and Azure monitoring
      resources are implemented.
- [x] Local container health and database connectivity verified.
- [~] Azure runtime logs and monitoring cannot be verified before deployment.

## 23. Backup/restore — [~]

- [x] PostgreSQL backup retention, restore procedure and private image
      recovery/deletion guidance documented in [backup-restore.md](./backup-restore.md).
- [~] A live Azure backup/restore drill requires provisioned Azure resources.

## 24. Cost documentation — [x]

- [x] PostgreSQL, compute, backup, storage, logs, registry, Key Vault and
      networking cost areas and regional alternatives documented.
- [x] No unsupported free-tier or scale-to-zero savings claim is made.

## 25. Deployment — [!]

- [x] Terraform, bootstrap, Docker targets, OIDC workflow and operator
      instructions are prepared and locally validated.
- [!] Azure CLI can read cached subscription metadata for `IC-Prod-001`, but
  Entra/ARM operations fail with `AADSTS7000215` (invalid cached client
  secret). Reauthentication and sufficient RBAC are required before planning
  or provisioning. No Azure resources were created.
- [!] GitHub remote is empty and its production Environment is absent.

## 26. Post-deployment verification — [!]

- [x] Local Docker health and database connectivity verified.
- [!] No live URL, revision, Azure scaling behavior, secret references,
  database TLS, cold start or Azure smoke flow can be reported because no
  deployment occurred.

## 27. Final documentation — [x]

- [x] README documents the local development accounts, Microsoft sign-in and
      family sharing; deployment, rollback and security docs cover image
      versioning, retention, Entra permissions and RBAC.
- [x] README, architecture, security, deployment, rollback, backup/restore,
      costs, food-safety sources and this status document are present.
- [x] Apple credential, Azure identity and GitHub environment limitations are
      explicit.
- [x] All six project instruction/specification files were reread for the
      completion audit; unfinished-indicator matches were reviewed.

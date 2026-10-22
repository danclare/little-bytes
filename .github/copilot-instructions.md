# Little Bites repository instructions

## Product

This repository contains **Little Bites: Baby Weaning**, a mobile-first application for parents and carers introducing solid foods.

Preserve the following core concepts:

- Family accounts with one or more children.
- An active-child context that affects diaries, food statuses, meal plans and guidance.
- Child-specific food diaries and food statuses.
- Food discovery, preparation guidance and age-aware presentation.
- Recipes, weekly meal planning and persistent shopping lists.
- Warm, reassuring and practical user experience.
- Food photography or illustrations supported by complete textual guidance.

Do not copy private data, credentials or production secrets from an existing service.

## Working behaviour

Act as a senior full-stack engineer with Azure, security and DevOps experience.

When assigned an implementation task:

1. Inspect the relevant repository files before editing.
2. Identify existing conventions and reuse them where sensible.
3. Make the smallest coherent set of changes that completes the task.
4. Implement real behaviour rather than placeholder buttons or disconnected mock screens.
5. Add or update automated tests.
6. Run the relevant checks.
7. Fix failures caused by the change.
8. Report exactly what changed and which commands were executed.

Do not stop after producing a plan if repository editing and terminal tools are available.

Do not claim that functionality, tests, infrastructure or deployments work unless they were actually verified. Never invent test output, URLs, Azure resource identifiers, workflow results or deployment status.

If permissions, credentials or external services are unavailable:

- Complete all safe repository work.
- Keep unavailable integration behind explicit configuration.
- Record the exact blocker.
- Document exact operator steps needed to finish it.
- Do not substitute fake success.

## Preferred architecture

Prefer a single deployable full-stack application or TypeScript monorepo unless the existing repository clearly requires another design.

Default stack:

- Next.js with TypeScript and React.
- Next.js route handlers for the initial API.
- Framework-independent domain services.
- PostgreSQL.
- Prisma ORM with committed, versioned migrations.
- Auth.js or another maintained server-session authentication library.
- Argon2id through a maintained password hashing package.
- Tailwind CSS with consistent reusable components.
- Zod for server-side input and environment validation.
- Vitest or Jest for unit and integration tests.
- Playwright for browser tests.
- Terraform using the AzureRM provider.
- Azure Container Registry.
- Azure Container Apps Consumption workload profile.
- Azure Database for PostgreSQL Flexible Server unless a verified alternative is selected.
- Azure Key Vault and managed identities where practical.
- Log Analytics and Azure Monitor.
- GitHub Actions with Microsoft Entra workload identity federation.

Avoid introducing microservices, Kubernetes, Redis, a service mesh or unnecessary networking components without a documented requirement.

## Expected repository layout

Adapt to the existing framework where necessary, but prefer:

- `src/app/`
- `src/components/`
- `src/features/auth/`
- `src/features/family/`
- `src/features/foods/`
- `src/features/recipes/`
- `src/features/planner/`
- `src/features/shopping/`
- `src/lib/`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `tests/unit/`
- `tests/integration/`
- `tests/e2e/`
- `infra/terraform/`
- `.github/workflows/`
- `docs/`
- `Dockerfile`
- `.dockerignore`
- `.env.example`
- `README.md`

Never commit real environment files, private keys, passwords, Terraform state, saved plans containing sensitive data or generated provider directories.

## Engineering conventions

- Use strict TypeScript.
- Avoid `any` unless its use is justified in a comment.
- Keep React components focused and reusable.
- Keep business rules out of route handlers and page components.
- Keep database access in server-only modules.
- Validate all external input at the server boundary.
- Return consistent, non-sensitive API errors.
- Use UTC timestamps.
- Store meal dates using a documented date-only convention.
- Use non-guessable identifiers consistently.
- Prefer transactions for changes spanning related records.
- Use structured logs without secrets or unnecessary personal information.
- Do not expose server-only environment variables to client bundles.
- Do not use hardcoded mock records as though they were persisted user data.

## Authorisation invariant

Every server operation involving any family-owned entity must derive the current user from the authenticated session and verify family membership.

This includes:

- children;
- child food statuses;
- diary entries;
- meal plans;
- planned meals;
- shopping lists;
- shopping-list items;
- family settings.

Never accept a client-supplied family or user identifier as proof of access. Client-side filtering is not authorisation.

Add integration tests proving that one family cannot read or modify another family’s data.

## Food-safety boundary

Food and preparation content must be informational and based on authoritative UK infant-feeding and food-safety guidance.

The product must:

- describe complementary feeding as generally beginning around six months together with developmental readiness;
- distinguish finger-food, mashed and puréed preparation;
- highlight choking hazards and hazardous shapes or textures;
- state that honey must not be given before 12 months;
- flag common allergens without claiming that a food is safe for a particular child;
- avoid recommending added salt or sugar for infants;
- distinguish general food guidance from medical advice;
- advise professional support for suspected reactions, swallowing difficulties, poor growth or special medical needs;
- direct users to emergency services for severe allergic symptoms.

Do not generate personalised medical treatment plans. Do not infer allergies from dislikes or infer safety from previous consumption.

When adding factual guidance, record the authoritative source in product guidance or documentation.

## Definition of honest completion

A feature is complete only when:

- it is connected to persistent storage where persistence is required;
- its authorisation path is implemented;
- input validation is present;
- important error and empty states are handled;
- relevant automated tests pass;
- the implementation has no known placeholder presented as working functionality.

Always distinguish among:

- checks executed locally;
- checks executed by GitHub Actions;
- checks executed against live Azure;
- checks not executed and the reason.

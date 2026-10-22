# Little Bites

Little Bites is a responsive, privacy-conscious weaning companion for family
food discovery, child-specific food diaries, recipes, weekly meal planning and
shopping lists. It is general information and organisation software, not a
medical or nutrition service.

## Local development

### One-command Windows setup

Install Node.js 22+ and start Docker Desktop in Linux-container mode. From
the repository root, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

Once Next.js reports ready, browse to <http://localhost:3000>. The script seeds
two local-only development accounts in the same sample family and prints their
sign-in details:

- `dev@littlebites.local` ? family owner
- `partner@littlebites.local` ? editor (use it to try roles and sharing)

Both use a random per-machine password stored in the ignored
`.env.local-launcher.json` (`DevUserPassword`) and printed on every run. Use
`-SkipDevUser` to skip them and register your own account instead. These
accounts only exist in the local launcher database. Keep the terminal open; Ctrl+C stops the website. This runs the
development server with private local photo storage, not a production build.
Apple sign-in and email delivery remain disabled.

The script generates random local secrets in ignored
`.env.local-launcher.json`, starts a repository-specific PostgreSQL 16 container
bound only to `127.0.0.1:54328`, restores missing dependencies, generates Prisma,
applies migrations and idempotently seeds the catalogue. It does not change
your `.env` files or use the automated test database. Account data, photos,
database volume and secrets persist between runs; keep the ignored secrets
file to reconnect to the same database. Do not share or commit it.

Use `-Port 3002` to change the website port. Use `-DatabasePort 54330` when
first creating the local database if the default is occupied, and use that
same database port on later runs. `-PrepareOnly` performs setup without
starting the web server. The script prints the exact `docker stop` command
for its database; stopping it preserves the volume.

### Manual setup

Requirements: Node.js 22, npm, and a PostgreSQL 16+ database.

```powershell
Copy-Item .env.example .env
npm ci
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Set `DATABASE_URL`, `AUTH_SECRET` and `RATE_LIMIT_HMAC_KEY` in `.env` before
starting the app. Use cryptographically random values of at least 32
characters for the two secrets. The catalogue seed is idempotent. Production
imports are performed only by the migrator container after schema migration;
the container opts in to `ALLOW_CATALOG_SEED=true` for that one-off operation.

## Verification

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run catalog:validate
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
```

Integration and browser tests require a dedicated, migrated PostgreSQL test
database in `TEST_DATABASE_URL`. Never point test commands at a production
database. Playwright requires Chromium and WebKit browser installations.

## Current service configuration

- Password-reset email delivery supports authenticated SMTP and is disabled by
  default. Configure `EMAIL_DELIVERY=smtp`, SMTP connection/authentication
  values and `EMAIL_FROM` to send reset links; the default disabled mode fails
  closed with `503`. Reset tokens are hashed, expiring, single-use and
  invalidate existing sessions after successful use. SMTP delivery failures
  are logged without exposing account existence in the reset response.
- Microsoft sign-in (Entra ID) is hidden unless `ENTRA_TENANT_ID`,
  `ENTRA_CLIENT_ID` and `ENTRA_CLIENT_SECRET` are set. In Azure, Terraform
  creates the app registration and supplies these through Key Vault; see
  [deployment](./docs/deployment.md).
- Family owners and admins can invite people by email with a role (admin,
  editor or viewer), change roles and remove members from the Profile tab.
- Apple sign-in is hidden unless all OIDC settings are present. Real Apple
  credentials and a callback-domain test are still required before enabling it.
- Local photo storage is for development only. Production configuration
  requires private Azure Blob storage and managed identity.
- The Azure and GitHub deployment setup is documented but has not been
  provisioned or run in this environment.

## Project documentation

- [Architecture](./docs/architecture.md)
- [Security](./docs/security.md)
- [Food-safety sources](./docs/food-safety-sources.md)
- [Azure deployment](./docs/deployment.md)
- [Rollback](./docs/rollback.md)
- [Backup and restore](./docs/backup-restore.md)
- [Cost considerations](./docs/costs.md)
- [Implementation status](./docs/implementation-status.md)

---
applyTo: "infra/terraform/**/*.tf,infra/terraform/**/*.tfvars.example,.github/workflows/**/*.{yml,yaml}"
---

# Azure infrastructure and deployment instructions

## Terraform structure

Create environment-parameterised Terraform under `infra/terraform/`.

Include:

- `bootstrap/` for remote-state resources;
- reusable main configuration;
- `environments/dev.tfvars.example`;
- backend initialisation instructions;
- documented plan and apply commands.

Provision only what the application requires:

- Azure resource group;
- Log Analytics workspace;
- Azure Container Apps managed environment;
- Azure Container Registry;
- Azure Container App;
- Azure Database for PostgreSQL Flexible Server and application database;
- Azure Key Vault;
- user-assigned or system-assigned managed identity as appropriate;
- least-privilege role assignments;
- remote-state storage through the separate bootstrap procedure.

Add DNS and custom-domain resources only when domain ownership and configuration are available.

## Versioning and repository safety

- Pin Terraform and provider version constraints.
- Commit `.terraform.lock.hcl`.
- Add descriptions to variables and outputs.
- Mark sensitive variables and outputs as sensitive.
- Exclude state, override files, local variable files, generated provider directories and saved plans from Git.
- Never commit backend access keys.
- Never output database passwords.
- Never run `terraform destroy` as part of an ordinary deployment.

## Container Apps

Configure the web application with:

- external HTTP ingress where required;
- `min_replicas = 0`;
- a sensible initial maximum, normally `3`;
- an application health endpoint;
- secret references or managed identity configuration;
- structured logging;
- immutable image tags based on the Git commit SHA.

Verify configuration rather than claiming that a live request wakes the service. Wake-up behaviour is only verified after a deployed cold-start request succeeds.

## PostgreSQL

Default to Azure Database for PostgreSQL Flexible Server unless a documented and verified alternative has a material benefit.

Document that:

- scaling the web application to zero does not scale PostgreSQL automatically to zero;
- PostgreSQL Flexible Server has ongoing compute, storage and backup costs;
- any development stop/start schedule is opt-in and disabled by default.

For production:

- do not permit public access from `0.0.0.0/0`;
- prefer private networking and private DNS when implementation and validation are practical;
- otherwise use the narrowest supported access configuration and document its limitations;
- require TLS;
- configure suitable backup retention;
- use deletion protection or equivalent safeguards where supported by the selected configuration.

Prefer managed identity and Microsoft Entra database authentication if the selected Prisma driver and deployment path support it cleanly. Otherwise retrieve a strong database credential through Key Vault or a secure Container App secret reference.

## Cost evaluation

Before deployment, document and compare:

1. PostgreSQL Flexible Server.
2. Any PostgreSQL serverless capability actually available in the chosen Azure region and subscription.
3. Azure Cosmos DB serverless if its document model genuinely fits the product.

Do not claim that a service, tier or configuration is free, serverless or scale-to-zero without verifying the exact region and subscription.

Document expected cost contributors:

- PostgreSQL compute;
- storage;
- backups;
- Container Apps usage;
- Container Registry;
- Log Analytics ingestion and retention;
- Key Vault operations;
- network services;
- private endpoints or DNS where used.

## CI workflow

For pull requests and pushes:

1. Install dependencies using the committed lockfile.
2. Run formatting and lint checks.
3. Run TypeScript type checking.
4. Run unit and integration tests.
5. Validate the Prisma schema.
6. Run `terraform fmt -check`.
7. Run `terraform init -backend=false`.
8. Run `terraform validate`.
9. Build the application.
10. Build the container image.
11. Run dependency and container scans.
12. Publish test results when supported.
13. Fail on the documented severity threshold.

Do not deploy from an untrusted pull request.

## Deployment workflow

For the protected main branch or an approved GitHub Environment:

1. Authenticate to Azure using GitHub OIDC.
2. Build the production image.
3. Tag it with the immutable commit SHA.
4. Push it to Azure Container Registry.
5. Generate a Terraform plan for the intended environment.
6. Apply only through the approved environment path.
7. Run database migrations through a controlled one-off job or equivalent.
8. Update the Container App revision.
9. Smoke-test the health endpoint and selected critical routes.
10. Report the deployed revision and URL from actual command output.
11. Preserve a documented rollback path.

Do not automatically apply destructive database migrations. Migrations used during rolling deployments must remain compatible with the previously deployed application until rollout is complete.

Use least-privilege federated credentials restricted to the correct repository, environment and branch.

Document required GitHub configuration, including:

- `AZURE_CLIENT_ID`;
- `AZURE_TENANT_ID`;
- `AZURE_SUBSCRIPTION_ID`;
- Terraform backend configuration;
- OAuth settings that cannot use managed identity.

These values may be stored as GitHub variables or secrets according to their sensitivity. Do not use a long-lived Azure client secret.

## Private profile-image storage

Provision dedicated application image storage, separate from Terraform state.

- Use an Azure Storage account and private Blob container.
- Disable anonymous blob access.
- Require HTTPS.
- Grant the application managed identity only the necessary data access.
- Do not expose storage account keys to browser code.
- Configure upload size limits and image-processing settings in the application.
- Document image deletion, retention and recovery behaviour.
- Include image storage and operations in the cost documentation.
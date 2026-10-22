# Azure deployment

## Current status

Terraform and both Docker targets have been validated locally. Azure CLI can
read cached subscription metadata for `IC-Prod-001`, but Azure Resource Manager
and Entra operations fail while refreshing the cached identity with
`AADSTS7000215` (invalid client secret). Provider registration, role
assignments, regional capability and a Terraform plan therefore remain
unverified; no Azure resources have been created.

The GitHub repository `danclare/little-bytes` is empty and has no default
branch or workflow runs. The `production` Environment is not configured
(GitHub returned 404 for its variables and secret-name lists), and runner
availability could not be inspected with the available repository permissions.
The available GitHub identity has read-only access to this public repository,
so it cannot push the implementation or configure/run workflows. No image,
workflow run or Azure deployment has been created. Do not treat the examples
below as evidence of a deployment.

## Prerequisites

- An Azure subscription with resource-provider registration and permissions
  sufficient to create the listed resources, role assignments and remote state.
- A selected region with the required Container Apps, PostgreSQL, Key Vault,
  private endpoint and storage capabilities and quota.
- A unique lowercase resource prefix and suffix.
- GitHub repository administration for an OIDC federated credential and a
  protected `production` Environment with reviewers.
- An ephemeral, protected Linux GitHub Actions self-hosted runner labelled
  `little-bites-private`, connected to the application VNet with private DNS
  resolution and Docker Buildx, Azure CLI, `curl` and outbound OIDC access.
- An Entra application/service principal with a federated credential restricted
  to `repo:<owner>/<repo>:environment:production`; audience
  `api://AzureADTokenExchange`.
- GitHub Environment variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
  `AZURE_SUBSCRIPTION_ID`, `TF_STATE_RESOURCE_GROUP`,
  `TF_STATE_STORAGE_ACCOUNT`, `AZURE_RESOURCE_GROUP`, `AZURE_LOCATION`,
  `NAME_PREFIX`, `UNIQUE_SUFFIX`, `DEPLOYMENT_PRINCIPAL_OBJECT_ID`,
  `POSTGRES_ADMIN_USERNAME`, `POSTGRES_SKU_NAME`, and optionally `APP_URL`
  and `ENTRA_SIGN_IN_ENABLED` (defaults to `true`).
- For Microsoft sign-in, the deployment identity needs the Microsoft Graph
  application permission `Application.ReadWrite.OwnedBy` with admin consent so
  Terraform can create and rotate the app registration. Without it, set
  `ENTRA_SIGN_IN_ENABLED=false`; email/password sign-in still works.
- Configure SMTP delivery with `EMAIL_DELIVERY=smtp`, `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`.
  Keep SMTP credentials in protected server environment configuration or a
  secret store; never expose them as `NEXT_PUBLIC_*` values.
  Do not configure `AZURE_CLIENT_SECRET`.

The GitHub OIDC principal needs the least privilege that still permits
resource creation and the explicitly declared role assignments. It needs
scoped resource-management permissions including role-assignment authority,
`Storage Blob Data Contributor` for the state account, and the Terraform-created
ACR push, ACR delete (image retention), storage container and Key Vault secret
roles. The bootstrap identity
must be authorised to assign the state role. Review the required scope and
permissions rather than assigning broad permanent access without approval.

## Remote-state bootstrap

1. Review `infra/terraform/bootstrap/README.md`.
2. Authenticate using approved Azure identity and create the state resource
   group, private state container and Entra data-plane permissions.
3. Record backend coordinates only; never copy storage keys into source or
   workflow logs.
4. Configure the `azurerm` backend using OIDC.

## Validate, plan and apply

Run from `infra/terraform` after choosing a secure backend and environment
values:

```powershell
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
terraform init -reconfigure `
  -backend-config="resource_group_name=<state-resource-group>" `
  -backend-config="storage_account_name=<state-storage-account>" `
  -backend-config="container_name=tfstate" `
  -backend-config="key=little-bites/production.tfstate" `
  -backend-config="use_azuread_auth=true" `
  -backend-config="use_oidc=true"
terraform plan -out=production.tfplan -var-file=environments/production.tfvars
terraform show -no-color production.tfplan
```

Inspect the plan for network exposure, cost, replacements and deletion before
applying. Plan files and state may contain sensitive values; keep them out of
Git and restrict access. Never run `terraform destroy` as an ordinary deploy.

The application URL is not known until Azure assigns the Container App FQDN.
The workflow applies that origin automatically unless `APP_URL` is configured
for a custom HTTPS domain. Apple Sign In remains disabled until the real
callback URL and credentials are configured.

## Release sequence

Terraform owns infrastructure; the workflow owns the running image. On first
provisioning the Container App and migration job use the public placeholder
`bootstrap_image`, and Terraform ignores container image changes afterwards so
a later `terraform apply` never reverts a release.

The protected `Deploy production` workflow (`.github/workflows/deploy.yml`):

1. Signs in with GitHub OIDC and applies the reviewed Terraform plan (plus a
   second apply for the generated origin when `APP_URL` is not set).
2. Derives the next semantic version with `scripts/release-version.mjs` from
   conventional commits since the latest `vX.Y.Z` tag (`feat` ? minor,
   `!`/`BREAKING CHANGE` ? major, otherwise patch; first release uses
   `package.json`). A manual run may supply an explicit version.
3. Builds `little-bites-web` and `little-bites-migrator` once each and tags
   them with both `<semver>` and the immutable 40-character commit SHA.
4. Sets the migration job image to the SHA tag (`az containerapp job update`),
   runs it and waits for `Succeeded`; the web image is not changed on failure.
5. Sets the web image to the SHA tag (`az containerapp update`), then verifies
   `/api/health`, an unauthenticated `/api/auth/session` returning `401`, the
   running image reference and `min 0` / `max 3` scaling.
6. Prunes each ACR repository to the newest **two** manifests (the current
   release plus one rollback target), never deleting the deployed digest.
7. Pushes the `vX.Y.Z` git tag for the released commit.

Database migrations must use an expand/contract strategy so the previous app
revision remains compatible during rollout and rollback.

After deployment, record the real revision and URL from command output. Check
database TLS, app/job logs, Key Vault secret references, private storage,
health, `min_replicas = 0`, `max_replicas = 3`, and a real cold request after
scale-to-zero before claiming those behaviours.

## Configuration

See [`.env.example`](../.env.example) for local configuration names and
[`infra/terraform/environments/dev.tfvars.example`](../infra/terraform/environments/dev.tfvars.example)
for non-secret infrastructure inputs. Azure credentials, passwords, session
keys and database URLs must only be supplied through OIDC, managed identity,
Key Vault or protected local environment variables, never Terraform outputs,
source files, Docker build arguments or logs.

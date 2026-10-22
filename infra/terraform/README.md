# Terraform environment

This configuration provisions a VNet-integrated Container Apps environment,
private PostgreSQL Flexible Server, private profile-photo Blob storage, private
Key Vault, ACR, managed identity, least-privilege data roles, Log Analytics and
(optionally) the Microsoft Entra app registration for "Sign in with Microsoft".
The Container App is external HTTPS ingress with `min_replicas = 0` and
`max_replicas = 3`. A manual Container Apps Job runs the immutable migrator
image before application traffic is moved to a new release.

## Validation

```powershell
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

After selecting the environment and configuring the separate bootstrap state
backend, read and approve the plan before applying it. Terraform does not need
an application image to exist: the Container App and migration job are created
with `bootstrap_image` (a public placeholder) and Terraform then ignores the
container image, which is owned by the deployment workflow. The placeholder does
not listen on port 3000, so the app is intentionally unhealthy until the first
release sets the real image; with `min_replicas = 0` this costs nothing. PostgreSQL credentials and application secrets are
randomly generated and placed in Key Vault; the Terraform state remains
sensitive and must use the protected remote backend.

The example `dev.tfvars.example` is not a region-availability or pricing
verification. Confirm quota, SKU availability, network features and ongoing
cost in the intended subscription before provisioning.

## Backend

Bootstrap the resources in `bootstrap/` separately. Then initialise this
configuration using Entra OIDC authentication and the values returned by that
procedure:

```powershell
terraform init -reconfigure `
  -backend-config="resource_group_name=<state-resource-group>" `
  -backend-config="storage_account_name=<state-storage-account>" `
  -backend-config="container_name=tfstate" `
  -backend-config="key=little-bites/<environment>.tfstate" `
  -backend-config="use_azuread_auth=true" `
  -backend-config="use_oidc=true"
```

Do not commit local `.tfvars`, state, saved plans, access keys or secret values.
The backend authenticates through the operator's Entra identity or the
protected GitHub OIDC workflow, not a storage account key.

## URL and release order

The first release creates the Container App and returns `application_url`. The
protected deployment workflow accepts an optional custom HTTPS origin through
its production environment; otherwise it reads and applies the generated
Container App origin automatically. Same-origin state-changing requests fail
closed until the correct origin is configured.

For each release, the workflow applies Terraform, derives the next semantic
version from conventional commits, builds and pushes `little-bites-web` and
`little-bites-migrator` tagged with both `<semver>` and the immutable
`<commit-sha>`, sets the migration job image to the SHA tag with
`az containerapp job update`, runs and verifies the migration, and only then
sets the web image with `az containerapp update`. After health verification it
prunes each repository to the newest two manifests (current plus one rollback
target, never the deployed digest) and pushes the `vX.Y.Z` git tag. GitHub
Environment approval must be enabled before granting deployment access.

## Microsoft Entra sign-in

With `entra_sign_in_enabled = true` Terraform creates a multi-tenant app
registration (`AzureADandPersonalMicrosoftAccount`) with the redirect URI
`<app_url>/api/auth/entra/callback`, delegated `openid`, `profile` and
`email` scopes, a rotating client secret stored only in Key Vault, and the
`ENTRA_*` Container App settings. The deployment identity needs the Microsoft
Graph application permission `Application.ReadWrite.OwnedBy` (admin consent)
to manage this registration. Set `entra_sign_in_enabled = false` if that
permission cannot be granted; email and password sign-in is unaffected.

The image registry endpoint is authenticated with managed identity. PostgreSQL
has no public access, requires TLS, and is protected from accidental deletion.
The photo and Key Vault endpoints use private DNS and private endpoints. The
deployment runner must be an ephemeral, protected self-hosted Linux runner
connected to the VNet so Terraform can create Key Vault secrets and private
Blob resources without opening those data planes to the internet.

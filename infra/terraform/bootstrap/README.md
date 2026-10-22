# Terraform state bootstrap

This one-time configuration creates a dedicated resource group and private,
versioned Azure Blob container for Terraform state. The account uses TLS 1.2,
disables shared-key authentication, and grants `Storage Blob Data Contributor`
only to the explicitly supplied Entra object IDs. The storage endpoint is
reachable over HTTPS so protected GitHub-hosted runners can use OIDC; blob
access still requires Entra authorization and the container is not public.

The bootstrap's own local state contains no application passwords, but it
contains infrastructure identifiers. Keep it in an approved secure location;
do not commit state or variable files.

Supply the operator's Entra object ID and the deployment service principal's
object ID (not client IDs). The identity running bootstrap must be allowed to
create resource groups, storage accounts, and role assignments in the chosen
subscription:

```powershell
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -out=bootstrap.tfplan -var-file=bootstrap.tfvars
terraform apply bootstrap.tfplan
```

The environment's backend can then be initialised with `use_azuread_auth=true`
and `use_oidc=true`, as shown in the parent Terraform README. Configure the
GitHub OIDC subject and federated credential separately; this configuration
does not create or expose an Azure client secret.

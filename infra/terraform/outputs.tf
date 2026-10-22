output "application_url" {
  description = "HTTPS URL assigned to the external Container App."
  value       = "https://${azurerm_container_app.app.ingress[0].fqdn}"
}

output "container_app_name" {
  description = "Container App resource name."
  value       = local.app_name
}

output "container_app_job_name" {
  description = "Manual database migration job resource name."
  value       = local.migration_name
}

output "container_registry_name" {
  description = "ACR name; credentials are not output."
  value       = local.acr_name
}

output "container_registry_login_server" {
  description = "ACR login server; credentials are not output."
  value       = "${local.acr_name}.azurecr.io"
}

output "web_image_repository" {
  description = "ACR repository for web images, tagged with the semantic version and commit SHA."
  value       = local.web_repository
}

output "migrator_image_repository" {
  description = "ACR repository for migration images, tagged with the semantic version and commit SHA."
  value       = local.migrator_repository
}

output "entra_application_client_id" {
  description = "Client ID of the Entra app registration used for Microsoft sign-in (not a secret)."
  value       = var.entra_sign_in_enabled ? azuread_application.web[0].client_id : null
}

output "resource_group_name" {
  description = "Resource group containing the application."
  value       = var.resource_group_name
}

output "postgresql_server_name" {
  description = "Private PostgreSQL Flexible Server name."
  value       = azurerm_postgresql_flexible_server.app.name
}

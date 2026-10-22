locals {
  naming_base         = "${var.name_prefix}${var.unique_suffix}${var.environment}"
  acr_name            = substr(replace(local.naming_base, "-", ""), 0, 50)
  storage_name        = substr(replace(local.naming_base, "-", ""), 0, 24)
  key_vault_name      = substr("${var.name_prefix}${var.unique_suffix}${var.environment}", 0, 24)
  postgres_name       = "${var.name_prefix}-${var.environment}-pg-${var.unique_suffix}"
  container_name      = "child-photos"
  app_name            = "${var.name_prefix}-${var.environment}-app"
  migration_name      = "${var.name_prefix}-${var.environment}-migrate"
  web_repository      = "little-bites-web"
  migrator_repository = "little-bites-migrator"
}

resource "azurerm_log_analytics_workspace" "app" {
  name                = "${var.name_prefix}-${var.environment}-logs"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days
  tags                = var.tags
}

resource "azurerm_container_registry" "app" {
  name                          = local.acr_name
  resource_group_name           = azurerm_resource_group.app.name
  location                      = var.location
  sku                           = "Basic"
  admin_enabled                 = false
  public_network_access_enabled = true
  tags                          = var.tags
}

resource "azurerm_user_assigned_identity" "app" {
  name                = "${var.name_prefix}-${var.environment}-identity"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  tags                = var.tags
}

resource "random_password" "database" {
  length  = 48
  special = false
}

resource "random_password" "auth" {
  length  = 64
  special = false
}

resource "random_password" "rate_limit" {
  length  = 64
  special = false
}

resource "azurerm_postgresql_flexible_server" "app" {
  name                          = local.postgres_name
  resource_group_name           = azurerm_resource_group.app.name
  location                      = var.location
  version                       = "16"
  delegated_subnet_id           = azurerm_subnet.postgres.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres.id
  public_network_access_enabled = false
  administrator_login           = var.postgres_admin_username
  administrator_password        = random_password.database.result
  zone                          = "1"
  storage_mb                    = 32768
  sku_name                      = var.postgres_sku_name
  backup_retention_days         = var.postgres_backup_retention_days
  geo_redundant_backup_enabled  = false

  authentication {
    active_directory_auth_enabled = false
    password_auth_enabled         = true
  }

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
  tags       = var.tags
}

resource "azurerm_postgresql_flexible_server_configuration" "tls" {
  name      = "require_secure_transport"
  server_id = azurerm_postgresql_flexible_server.app.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = "littlebites"
  server_id = azurerm_postgresql_flexible_server.app.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_management_lock" "postgres" {
  name       = "${var.name_prefix}-${var.environment}-postgres-protection"
  scope      = azurerm_postgresql_flexible_server.app.id
  lock_level = "CanNotDelete"
  notes      = "Remove this lock only through an explicitly approved data-retention or decommissioning change."
}

resource "azurerm_storage_account" "photos" {
  name                            = local.storage_name
  resource_group_name             = azurerm_resource_group.app.name
  location                        = var.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  account_kind                    = "StorageV2"
  https_traffic_only_enabled      = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  public_network_access_enabled   = false

  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = 7
    }
    container_delete_retention_policy {
      days = 7
    }
  }

  tags = var.tags
}

resource "azurerm_storage_container" "photos" {
  name                  = local.container_name
  storage_account_id    = azurerm_storage_account.photos.id
  container_access_type = "private"

  depends_on = [
    azurerm_private_endpoint.blob,
    azurerm_role_assignment.deployment_blob,
  ]
}

resource "azurerm_private_endpoint" "blob" {
  name                = "${var.name_prefix}-${var.environment}-blob-pe"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "${var.name_prefix}-${var.environment}-blob-connection"
    private_connection_resource_id = azurerm_storage_account.photos.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [azurerm_private_dns_zone.blob.id]
  }

  tags = var.tags
}

resource "azurerm_key_vault" "app" {
  name                          = local.key_vault_name
  location                      = var.location
  resource_group_name           = azurerm_resource_group.app.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  rbac_authorization_enabled    = true
  public_network_access_enabled = false
  soft_delete_retention_days    = 30

  # Private endpoint access only; trusted Azure services keep platform secret-reference resolution working.
  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
  }
  purge_protection_enabled = true
  tags                     = var.tags
}

data "azurerm_client_config" "current" {}

resource "azurerm_private_endpoint" "key_vault" {
  name                = "${var.name_prefix}-${var.environment}-keyvault-pe"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "${var.name_prefix}-${var.environment}-keyvault-connection"
    private_connection_resource_id = azurerm_key_vault.app.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [azurerm_private_dns_zone.key_vault.id]
  }

  tags = var.tags
}

resource "azurerm_key_vault_secret" "database_url" {
  name         = "DATABASE-URL"
  key_vault_id = azurerm_key_vault.app.id
  value        = "postgresql://${var.postgres_admin_username}:${random_password.database.result}@${azurerm_postgresql_flexible_server.app.fqdn}:5432/${azurerm_postgresql_flexible_server_database.app.name}?sslmode=require"
  content_type = "application/x-postgresql-connection-string"

  depends_on = [
    azurerm_private_endpoint.key_vault,
    azurerm_role_assignment.deployment_key_vault_secrets,
  ]
}

resource "azurerm_key_vault_secret" "auth_secret" {
  name         = "AUTH-SECRET"
  key_vault_id = azurerm_key_vault.app.id
  value        = random_password.auth.result

  depends_on = [
    azurerm_private_endpoint.key_vault,
    azurerm_role_assignment.deployment_key_vault_secrets,
  ]
}

resource "azurerm_key_vault_secret" "rate_limit_key" {
  name         = "RATE-LIMIT-HMAC-KEY"
  key_vault_id = azurerm_key_vault.app.id
  value        = random_password.rate_limit.result

  depends_on = [
    azurerm_private_endpoint.key_vault,
    azurerm_role_assignment.deployment_key_vault_secrets,
  ]
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.app.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "azurerm_role_assignment" "deployment_acr_push" {
  scope                = azurerm_container_registry.app.id
  role_definition_name = "AcrPush"
  principal_id         = var.deployment_principal_object_id
}

# Lets the deployment workflow delete superseded images so only the latest two are retained.
resource "azurerm_role_assignment" "deployment_acr_delete" {
  scope                = azurerm_container_registry.app.id
  role_definition_name = "AcrDelete"
  principal_id         = var.deployment_principal_object_id
}

resource "azurerm_role_assignment" "deployment_blob" {
  scope                = azurerm_storage_account.photos.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.deployment_principal_object_id
}

resource "azurerm_role_assignment" "deployment_key_vault_secrets" {
  scope                = azurerm_key_vault.app.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = var.deployment_principal_object_id
}

resource "azurerm_role_assignment" "blob_data" {
  scope                = azurerm_storage_account.photos.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "azurerm_role_assignment" "key_vault_secrets" {
  scope                = azurerm_key_vault.app.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "azurerm_container_app_environment" "app" {
  name                           = "${var.name_prefix}-${var.environment}-cae"
  location                       = var.location
  resource_group_name            = azurerm_resource_group.app.name
  infrastructure_subnet_id       = azurerm_subnet.container_apps.id
  internal_load_balancer_enabled = false
  log_analytics_workspace_id     = azurerm_log_analytics_workspace.app.id
  tags                           = var.tags
}

resource "azurerm_container_app" "app" {
  name                         = local.app_name
  container_app_environment_id = azurerm_container_app_environment.app.id
  resource_group_name          = azurerm_resource_group.app.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.app.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  secret {
    name                = "database-url"
    key_vault_secret_id = azurerm_key_vault_secret.database_url.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }

  secret {
    name                = "auth-secret"
    key_vault_secret_id = azurerm_key_vault_secret.auth_secret.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }

  secret {
    name                = "rate-limit-key"
    key_vault_secret_id = azurerm_key_vault_secret.rate_limit_key.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }

  dynamic "secret" {
    for_each = var.entra_sign_in_enabled ? [1] : []
    content {
      name                = "entra-client-secret"
      key_vault_secret_id = azurerm_key_vault_secret.entra_client_secret[0].versionless_id
      identity            = azurerm_user_assigned_identity.app.id
    }
  }

  ingress {
    external_enabled           = true
    target_port                = 3000
    transport                  = "http"
    allow_insecure_connections = false

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = 0
    max_replicas = 3

    container {
      name   = "web"
      image  = var.bootstrap_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "APP_URL"
        value = var.app_url
      }
      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.app.client_id
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT_URL"
        value = "https://${azurerm_storage_account.photos.name}.blob.core.windows.net"
      }
      env {
        name  = "AZURE_STORAGE_CONTAINER"
        value = azurerm_storage_container.photos.name
      }
      env {
        name  = "PHOTO_STORAGE"
        value = "azure"
      }
      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
      env {
        name        = "AUTH_SECRET"
        secret_name = "auth-secret"
      }
      env {
        name        = "RATE_LIMIT_HMAC_KEY"
        secret_name = "rate-limit-key"
      }

      dynamic "env" {
        for_each = var.entra_sign_in_enabled ? {
          ENTRA_TENANT_ID = "common"
          ENTRA_CLIENT_ID = azuread_application.web[0].client_id
        } : {}
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.entra_sign_in_enabled ? [1] : []
        content {
          name        = "ENTRA_CLIENT_SECRET"
          secret_name = "entra-client-secret"
        }
      }

      liveness_probe {
        transport               = "HTTP"
        port                    = 3000
        path                    = "/api/health"
        interval_seconds        = 30
        timeout                 = 5
        failure_count_threshold = 3
      }
      readiness_probe {
        transport               = "HTTP"
        port                    = 3000
        path                    = "/api/health"
        interval_seconds        = 10
        timeout                 = 5
        failure_count_threshold = 3
      }
    }
  }

  depends_on = [
    azurerm_role_assignment.acr_pull,
    azurerm_role_assignment.key_vault_secrets,
    azurerm_role_assignment.blob_data,
    azurerm_private_endpoint.blob,
    azurerm_private_endpoint.key_vault,
    azurerm_postgresql_flexible_server_configuration.tls,
  ]

  lifecycle {
    # The deployment workflow owns the running image (immutable commit-SHA tag). Terraform only
    # sets the placeholder image when the app is first created.
    ignore_changes = [template[0].container[0].image]
  }

  tags = var.tags
}

resource "azurerm_container_app_job" "migrations" {
  name                         = local.migration_name
  location                     = var.location
  resource_group_name          = azurerm_resource_group.app.name
  container_app_environment_id = azurerm_container_app_environment.app.id
  replica_timeout_in_seconds   = 1800
  replica_retry_limit          = 1

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.app.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  secret {
    name                = "database-url"
    key_vault_secret_id = azurerm_key_vault_secret.database_url.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }

  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
  }

  template {
    container {
      name   = "migrate"
      image  = var.bootstrap_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
    }
  }

  depends_on = [
    azurerm_role_assignment.acr_pull,
    azurerm_role_assignment.key_vault_secrets,
    azurerm_private_endpoint.key_vault,
  ]

  lifecycle {
    ignore_changes = [template[0].container[0].image]
  }

  tags = var.tags
}

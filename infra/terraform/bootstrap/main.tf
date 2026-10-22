locals {
  storage_account_name = substr("${var.name_prefix}${var.unique_suffix}", 0, 24)
}

resource "azurerm_resource_group" "state" {
  name     = var.state_resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_storage_account" "state" {
  name                            = local.storage_account_name
  resource_group_name             = azurerm_resource_group.state.name
  location                        = azurerm_resource_group.state.location
  account_tier                    = "Standard"
  account_replication_type        = "ZRS"
  account_kind                    = "StorageV2"
  https_traffic_only_enabled      = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  public_network_access_enabled   = true

  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = 14
    }
    container_delete_retention_policy {
      days = 14
    }
  }

  tags = var.tags
}

resource "azurerm_storage_container" "state" {
  name                  = "tfstate"
  storage_account_id    = azurerm_storage_account.state.id
  container_access_type = "private"

  depends_on = [azurerm_role_assignment.state_contributor]
}

resource "azurerm_role_assignment" "state_contributor" {
  for_each = var.state_contributor_object_ids

  scope                = azurerm_storage_account.state.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = each.value
}

resource "azurerm_management_lock" "state" {
  name       = "${var.name_prefix}-terraform-state-protection"
  scope      = azurerm_storage_account.state.id
  lock_level = "CanNotDelete"
  notes      = "Terraform state must not be deleted during normal environment changes."
}

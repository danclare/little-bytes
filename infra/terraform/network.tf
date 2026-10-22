resource "azurerm_resource_group" "app" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_virtual_network" "app" {
  name                = "${var.name_prefix}-${var.environment}-vnet"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  address_space       = ["10.42.0.0/16"]
  tags                = var.tags
}

resource "azurerm_subnet" "container_apps" {
  name                 = "container-apps"
  resource_group_name  = azurerm_resource_group.app.name
  virtual_network_name = azurerm_virtual_network.app.name
  address_prefixes     = ["10.42.0.0/23"]

  delegation {
    name = "container-apps"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "postgres" {
  name                 = "postgres"
  resource_group_name  = azurerm_resource_group.app.name
  virtual_network_name = azurerm_virtual_network.app.name
  address_prefixes     = ["10.42.2.0/28"]

  delegation {
    name = "postgres-flexible-server"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "private_endpoints" {
  name                              = "private-endpoints"
  resource_group_name               = azurerm_resource_group.app.name
  virtual_network_name              = azurerm_virtual_network.app.name
  address_prefixes                  = ["10.42.3.0/24"]
  private_endpoint_network_policies = "Disabled"
}

resource "azurerm_private_dns_zone" "postgres" {
  name                = "${var.name_prefix}-${var.environment}.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.app.name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "${var.name_prefix}-${var.environment}-postgres-link"
  resource_group_name   = azurerm_resource_group.app.name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.app.id
  registration_enabled  = false
  tags                  = var.tags
}

resource "azurerm_private_dns_zone" "blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.app.name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "blob" {
  name                  = "${var.name_prefix}-${var.environment}-blob-link"
  resource_group_name   = azurerm_resource_group.app.name
  private_dns_zone_name = azurerm_private_dns_zone.blob.name
  virtual_network_id    = azurerm_virtual_network.app.id
  registration_enabled  = false
  tags                  = var.tags
}

resource "azurerm_private_dns_zone" "key_vault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = azurerm_resource_group.app.name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "key_vault" {
  name                  = "${var.name_prefix}-${var.environment}-keyvault-link"
  resource_group_name   = azurerm_resource_group.app.name
  private_dns_zone_name = azurerm_private_dns_zone.key_vault.name
  virtual_network_id    = azurerm_virtual_network.app.id
  registration_enabled  = false
  tags                  = var.tags
}

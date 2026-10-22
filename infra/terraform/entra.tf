data "azuread_client_config" "current" {}

data "azuread_application_published_app_ids" "well_known" {
  count = var.entra_sign_in_enabled ? 1 : 0
}

data "azuread_service_principal" "msgraph" {
  count     = var.entra_sign_in_enabled ? 1 : 0
  client_id = data.azuread_application_published_app_ids.well_known[0].result["MicrosoftGraph"]
}

# Web app registration for "Sign in with Microsoft". The audience allows work, school and personal
# Microsoft accounts; the application only trusts verified email claims (see entra-identity.ts).
resource "azuread_application" "web" {
  count            = var.entra_sign_in_enabled ? 1 : 0
  display_name     = "Little Bites (${var.environment})"
  sign_in_audience = "AzureADandPersonalMicrosoftAccount"
  owners           = [data.azuread_client_config.current.object_id]

  api {
    # Personal Microsoft account support requires v2 access tokens.
    requested_access_token_version = 2
  }

  web {
    homepage_url  = var.app_url
    redirect_uris = ["${var.app_url}/api/auth/entra/callback"]

    implicit_grant {
      access_token_issuance_enabled = false
      id_token_issuance_enabled     = false
    }
  }

  optional_claims {
    id_token {
      name = "email"
    }
    id_token {
      name = "xms_edov"
    }
  }

  required_resource_access {
    resource_app_id = data.azuread_application_published_app_ids.well_known[0].result["MicrosoftGraph"]

    dynamic "resource_access" {
      for_each = ["openid", "profile", "email"]
      content {
        id   = data.azuread_service_principal.msgraph[0].oauth2_permission_scope_ids[resource_access.value]
        type = "Scope"
      }
    }
  }
}

resource "azuread_service_principal" "web" {
  count     = var.entra_sign_in_enabled ? 1 : 0
  client_id = azuread_application.web[0].client_id
  owners    = [data.azuread_client_config.current.object_id]
}

resource "time_rotating" "entra_secret" {
  count         = var.entra_sign_in_enabled ? 1 : 0
  rotation_days = var.entra_secret_rotation_days
}

resource "azuread_application_password" "web" {
  count          = var.entra_sign_in_enabled ? 1 : 0
  application_id = azuread_application.web[0].id
  display_name   = "${var.name_prefix}-${var.environment}-container-app"
  end_date       = timeadd(time_rotating.entra_secret[0].rotation_rfc3339, "720h")

  rotate_when_changed = {
    rotation = time_rotating.entra_secret[0].id
  }
}

resource "azurerm_key_vault_secret" "entra_client_secret" {
  count           = var.entra_sign_in_enabled ? 1 : 0
  name            = "ENTRA-CLIENT-SECRET"
  key_vault_id    = azurerm_key_vault.app.id
  value           = azuread_application_password.web[0].value
  expiration_date = azuread_application_password.web[0].end_date

  depends_on = [
    azurerm_private_endpoint.key_vault,
    azurerm_role_assignment.deployment_key_vault_secrets,
  ]
}

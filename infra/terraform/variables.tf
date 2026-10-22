variable "resource_group_name" {
  description = "Resource group for the Little Bites environment."
  type        = string
}

variable "location" {
  description = "Azure region confirmed to support the required services and quota."
  type        = string
}

variable "name_prefix" {
  description = "Short lowercase application prefix used in Azure resource names."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,10}$", var.name_prefix))
    error_message = "name_prefix must be 2-11 lowercase letters, digits or hyphens and start with a letter."
  }
}

variable "environment" {
  description = "Environment name such as dev, staging or production."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,10}$", var.environment))
    error_message = "environment must be 2-11 lowercase letters, digits or hyphens and start with a letter."
  }
}

variable "unique_suffix" {
  description = "Globally unique lowercase alphanumeric suffix for ACR, storage and Key Vault names."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{5,10}$", var.unique_suffix))
    error_message = "unique_suffix must contain 5-10 lowercase letters or digits."
  }
}

variable "bootstrap_image" {
  description = "Public placeholder image used only when the Container App and migration job are first created. The deployment workflow then sets the real commit-SHA image; Terraform ignores later image changes."
  type        = string
  default     = "mcr.microsoft.com/k8se/quickstart:latest"

  validation {
    condition     = length(trimspace(var.bootstrap_image)) > 0
    error_message = "bootstrap_image must not be empty."
  }
}

variable "entra_sign_in_enabled" {
  description = "Create a Microsoft Entra app registration and enable 'Sign in with Microsoft' (work, school and personal Microsoft accounts). Requires the deployment principal to hold Application.ReadWrite.OwnedBy in Microsoft Graph."
  type        = bool
  default     = true
}

variable "entra_secret_rotation_days" {
  description = "Days before Terraform rotates the Entra client secret on the next apply. The secret stays valid for 30 days after rotation is due."
  type        = number
  default     = 180

  validation {
    condition     = var.entra_secret_rotation_days >= 30 && var.entra_secret_rotation_days <= 365
    error_message = "entra_secret_rotation_days must be between 30 and 365."
  }
}

variable "app_url" {
  description = "HTTPS application origin. Use https://localhost for initial creation, then set the actual Container App FQDN."
  type        = string
  default     = "https://localhost"

  validation {
    condition     = can(regex("^https://", var.app_url)) && can(regex("^https://[^/]+$", var.app_url))
    error_message = "app_url must be an HTTPS origin without a path."
  }
}

variable "postgres_admin_username" {
  description = "Non-secret PostgreSQL administrator login name."
  type        = string
  default     = "littlebitesadmin"

  validation {
    condition     = can(regex("^[a-z][a-z0-9]{2,62}$", var.postgres_admin_username))
    error_message = "postgres_admin_username must be 3-63 lowercase letters or digits and start with a letter."
  }
}

variable "postgres_sku_name" {
  description = "PostgreSQL Flexible Server SKU, to be verified for the selected region."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "deployment_principal_object_id" {
  description = "Entra service-principal object ID used by the protected GitHub deployment workflow."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-fA-F-]{36}$", var.deployment_principal_object_id))
    error_message = "deployment_principal_object_id must be an Entra object ID in GUID format."
  }
}

variable "postgres_backup_retention_days" {
  description = "Automated backup retention, subject to regional service limits."
  type        = number
  default     = 14

  validation {
    condition     = var.postgres_backup_retention_days >= 7 && var.postgres_backup_retention_days <= 35
    error_message = "PostgreSQL backup retention must be between 7 and 35 days."
  }
}

variable "log_retention_days" {
  description = "Log Analytics retention in days."
  type        = number
  default     = 30

  validation {
    condition     = var.log_retention_days >= 30 && var.log_retention_days <= 730
    error_message = "Log retention must be between 30 and 730 days."
  }
}

variable "tags" {
  description = "Tags applied to environment resources."
  type        = map(string)
  default     = {}
}

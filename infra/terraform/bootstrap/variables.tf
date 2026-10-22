variable "state_resource_group_name" {
  description = "Dedicated resource group for Terraform state."
  type        = string
}

variable "location" {
  description = "Azure region selected for the Terraform state account."
  type        = string
}

variable "name_prefix" {
  description = "Lowercase alphanumeric prefix for the state storage account."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{3,10}$", var.name_prefix))
    error_message = "name_prefix must contain 3-10 lowercase letters or digits."
  }
}

variable "unique_suffix" {
  description = "Globally unique lowercase alphanumeric suffix."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{5,10}$", var.unique_suffix))
    error_message = "unique_suffix must contain 5-10 lowercase letters or digits."
  }
}

variable "state_contributor_object_ids" {
  description = "Entra service-principal or user object IDs that need Terraform state access."
  type        = set(string)

  validation {
    condition     = length(var.state_contributor_object_ids) > 0
    error_message = "At least one state backend operator or deployment principal object ID is required."
  }
}

variable "tags" {
  description = "Tags applied to state resources."
  type        = map(string)
  default     = {}
}

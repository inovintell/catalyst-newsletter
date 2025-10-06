variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "database_url" {
  description = "PostgreSQL database URL"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic Claude API key"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "default_tenant_id" {
  description = "Default tenant ID from Identity Platform"
  type        = string
}

variable "service_account_email" {
  description = "Service account email from Identity Platform"
  type        = string
}

variable "identity_platform_api_key" {
  description = "Identity Platform API key"
  type        = string
  sensitive   = true
}

variable "admin_password" {
  description = "Admin user password (stored in Secret Manager)"
  type        = string
  sensitive   = true
}

variable "admin_email" {
  description = "Admin user email address"
  type        = string
}
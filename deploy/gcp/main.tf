# Main Terraform configuration combining Identity Platform and Cloud Run

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }

  # Optional: Configure backend for storing state in GCS
  # backend "gcs" {
  #   bucket = "your-terraform-state-bucket"
  #   prefix = "catalyst-newsletter/state"
  # }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
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
  default     = "catalyst.inovintell.com"
}

variable "admin_email" {
  description = "Admin email address for initial setup"
  type        = string
  default     = "admin@example.com"
}

# Provider Configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "containerregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "identitytoolkit.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com"
  ])

  service            = each.value
  disable_on_destroy = false
}

# Import the other configurations
# module "identity_platform" {
#   source = "./modules/identity-platform"
#
#   project_id  = var.project_id
#   region      = var.region
#   environment = var.environment
# }

module "cloud_run" {
  source = "./modules/cloud-run"

  project_id        = var.project_id
  region            = var.region
  environment       = var.environment
  database_url      = var.database_url
  anthropic_api_key = var.anthropic_api_key
  domain_name       = var.domain_name
  admin_password    = var.admin_password
  admin_email       = var.admin_email

  # Use temporary values until Identity Platform is set up
  default_tenant_id         = "default-tenant"
  service_account_email     = ""
  identity_platform_api_key = "temporary-api-key"

  depends_on = [google_project_service.required_apis]
}

# Outputs
output "cloud_run_url" {
  value       = module.cloud_run.cloud_run_url
  description = "Cloud Run service URL"
}

# output "load_balancer_ip" {
#   value       = module.cloud_run.load_balancer_ip
#   description = "Load balancer IP address (point your DNS here)"
# }

# output "default_tenant_id" {
#   value       = module.identity_platform.default_tenant_id
#   description = "Default tenant ID for Identity Platform"
# }

output "next_steps" {
  value = <<-EOT

    🎉 Deployment Complete!

    1. Your application is running at: ${module.cloud_run.cloud_run_url}

    2. Custom domain setup will be configured in the next phase

    3. Set up Identity Platform:
       - Go to: https://console.cloud.google.com/customer-identity
       - Configure authentication providers
       - Set up Microsoft Entra OIDC if needed

    4. Monitor your application:
       - Cloud Run: https://console.cloud.google.com/run
       - Logs: https://console.cloud.google.com/logs

    5. First time setup:
       - Access the application
       - The first registered user becomes admin
       - Use admin account to create other users
  EOT
}
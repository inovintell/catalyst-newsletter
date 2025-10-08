terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}


provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "identity_platform" {
  service = "identitytoolkit.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_resource_manager" {
  service = "cloudresourcemanager.googleapis.com"
  disable_on_destroy = false
}

# Service Account for Identity Platform
resource "google_service_account" "identity_platform_sa" {
  account_id   = "catalyst-auth-${var.environment}"
  display_name = "Catalyst Newsletter Authentication Service Account"
  description  = "Service account for Identity Platform authentication"
}

# IAM roles for the service account
resource "google_project_iam_member" "identity_platform_admin" {
  project = var.project_id
  role    = "roles/identityplatform.admin"
  member  = "serviceAccount:${google_service_account.identity_platform_sa.email}"
}

resource "google_project_iam_member" "firebase_admin" {
  project = var.project_id
  role    = "roles/firebase.admin"
  member  = "serviceAccount:${google_service_account.identity_platform_sa.email}"
}

# Service Account Key
resource "google_service_account_key" "identity_platform_key" {
  service_account_id = google_service_account.identity_platform_sa.name
  key_algorithm      = "KEY_ALG_RSA_2048"
}

# Identity Platform Config
resource "google_identity_platform_config" "default" {
  project = var.project_id

  autodelete_anonymous_users = true

  sign_in {
    allow_duplicate_emails = false

    email {
      enabled           = true
      password_required = true
    }
  }

  # Blocking functions can be enabled later
  # blocking_functions {
  #   triggers {
  #     event_type   = "beforeSignIn"
  #     function_uri = google_cloudfunctions2_function.auth_blocking.service_config[0].uri
  #   }
  # }

  depends_on = [
    google_project_service.identity_platform
  ]
}

# Default Tenant Configuration
resource "google_identity_platform_tenant" "default" {
  display_name             = "Default Tenant"
  allow_password_signup    = true
  enable_email_link_signin = false

  depends_on = [
    google_identity_platform_config.default
  ]
}

# Production Tenant Configuration (if in prod environment)
resource "google_identity_platform_tenant" "production" {
  count = var.environment == "prod" ? 1 : 0

  display_name             = "InovIntell Production"
  allow_password_signup    = false
  enable_email_link_signin = false

  depends_on = [
    google_identity_platform_config.default
  ]
}

# Cloud Functions can be enabled later for blocking validation
# resource "google_cloudfunctions2_function" "auth_blocking" {
#   name        = "catalyst-auth-blocking-${var.environment}"
#   location    = var.region
#   description = "Authentication blocking function for custom validation"
#   ...
# }

# resource "google_storage_bucket" "functions_bucket" {
#   name     = "${var.project_id}-catalyst-functions-${var.environment}"
#   location = var.region
#   ...
# }

# resource "google_storage_bucket_object" "auth_function_source" {
#   name   = "auth-blocking-function.zip"
#   bucket = google_storage_bucket.functions_bucket.name
#   source = "${path.module}/functions/auth-blocking.zip"
# }

# Firestore for session management - using default database
resource "google_firestore_database" "sessions" {
  project     = var.project_id
  name        = "(default)"  # Use the default database
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  concurrency_mode = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"

  depends_on = [
    google_project_service.identity_platform
  ]
}


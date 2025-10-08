resource "google_cloud_run_service" "catalyst_newsletter" {
  name     = "catalyst-newsletter-${var.environment}"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/catalyst-newsletter:latest"

        ports {
          container_port = 3000
        }

        env {
          name  = "NODE_ENV"
          value = var.environment == "prod" ? "production" : "development"
        }

        env {
          name  = "ADMIN_EMAIL"
          value = var.admin_email
        }

        env {
          name = "ADMIN_PASSWORD"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.admin_password.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "DEFAULT_TENANT_ID"
          value = var.default_tenant_id
        }

        env {
          name = "IDENTITY_PLATFORM_API_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.identity_api_key.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name = "JWT_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.jwt_secret.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.database_url.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name = "ANTHROPIC_API_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.anthropic_api_key.secret_id
              key  = "latest"
            }
          }
        }

        resources {
          limits = {
            cpu    = "2"
            memory = "2Gi"
          }
          requests = {
            cpu    = "1"
            memory = "1Gi"
          }
        }
      }

      service_account_name = google_service_account.cloud_run_sa.email
      timeout_seconds      = 300
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = var.environment == "prod" ? "1" : "0"
        "autoscaling.knative.dev/maxScale" = var.environment == "prod" ? "10" : "3"
        "run.googleapis.com/cpu-throttling" = "false"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.cloud_run,
    google_secret_manager_secret_version.identity_api_key_version,
    google_secret_manager_secret_version.jwt_secret_version,
    google_secret_manager_secret_version.database_url_version,
    google_secret_manager_secret_version.anthropic_api_key_version,
    google_secret_manager_secret_version.admin_password_version
  ]
}

# Service Account for Cloud Run
resource "google_service_account" "cloud_run_sa" {
  account_id   = "catalyst-cloudrun-${var.environment}"
  display_name = "Catalyst Newsletter Cloud Run Service Account"
  description  = "Service account for Cloud Run service"
}

# IAM permissions for Cloud Run service account
resource "google_project_iam_member" "cloud_run_identity_platform" {
  project = var.project_id
  role    = "roles/identityplatform.viewer"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Enable Cloud Run API
resource "google_project_service" "cloud_run" {
  service = "run.googleapis.com"
  disable_on_destroy = false
}

# Enable Secret Manager API
resource "google_project_service" "secret_manager" {
  service = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# Secret Manager secrets
resource "google_secret_manager_secret" "identity_api_key" {
  secret_id = "catalyst-identity-api-key-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "identity_api_key_version" {
  secret = google_secret_manager_secret.identity_api_key.id
  secret_data = var.identity_platform_api_key
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "catalyst-jwt-secret-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "jwt_secret_version" {
  secret = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

resource "random_password" "jwt_secret" {
  length  = 32
  special = true
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "catalyst-database-url-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "database_url_version" {
  secret = google_secret_manager_secret.database_url.id
  secret_data = var.database_url
}

resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "catalyst-anthropic-api-key-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "anthropic_api_key_version" {
  secret = google_secret_manager_secret.anthropic_api_key.id
  secret_data = var.anthropic_api_key
}

resource "google_secret_manager_secret" "admin_password" {
  secret_id = "catalyst-admin-password-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "admin_password_version" {
  secret = google_secret_manager_secret.admin_password.id
  secret_data = var.admin_password
}

# Cloud Run IAM - Allow unauthenticated access
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.catalyst_newsletter.name
  location = google_cloud_run_service.catalyst_newsletter.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Load Balancer configuration commented out for initial deployment
# Can be enabled later for custom domain support
#
# resource "google_compute_global_address" "catalyst_ip" {
#   name = "catalyst-newsletter-ip-${var.environment}"
# }
#
# resource "google_compute_managed_ssl_certificate" "catalyst_cert" {
#   name = "catalyst-newsletter-cert-${var.environment}"
#
#   managed {
#     domains = [var.domain_name]
#   }
# }
#
# Additional load balancer resources would go here...


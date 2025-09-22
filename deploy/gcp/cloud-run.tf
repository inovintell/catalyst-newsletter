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
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "DEFAULT_TENANT_ID"
          value = google_identity_platform_tenant.default.name
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
    google_secret_manager_secret_version.anthropic_api_key_version
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
  secret_data = google_identity_platform_config.default.api_key
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

# Cloud Run IAM - Allow unauthenticated access
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.catalyst_newsletter.name
  location = google_cloud_run_service.catalyst_newsletter.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Load Balancer with SSL
resource "google_compute_global_address" "catalyst_ip" {
  name = "catalyst-newsletter-ip-${var.environment}"
}

resource "google_compute_managed_ssl_certificate" "catalyst_cert" {
  name = "catalyst-newsletter-cert-${var.environment}"

  managed {
    domains = [var.domain_name]
  }
}

resource "google_compute_url_map" "catalyst_url_map" {
  name            = "catalyst-newsletter-urlmap-${var.environment}"
  default_service = google_compute_backend_service.catalyst_backend.id
}

resource "google_compute_backend_service" "catalyst_backend" {
  name = "catalyst-newsletter-backend-${var.environment}"

  backend {
    group = google_compute_network_endpoint_group.catalyst_neg.id
  }

  timeout_sec = 30
}

resource "google_compute_network_endpoint_group" "catalyst_neg" {
  name         = "catalyst-newsletter-neg-${var.environment}"
  network      = "default"
  subnetwork   = "default"
  default_port = "443"
  zone         = "${var.region}-a"
}

resource "google_compute_target_https_proxy" "catalyst_https_proxy" {
  name             = "catalyst-newsletter-https-proxy-${var.environment}"
  url_map          = google_compute_url_map.catalyst_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.catalyst_cert.id]
}

resource "google_compute_global_forwarding_rule" "catalyst_forwarding_rule" {
  name       = "catalyst-newsletter-forwarding-rule-${var.environment}"
  target     = google_compute_target_https_proxy.catalyst_https_proxy.id
  port_range = "443"
  ip_address = google_compute_global_address.catalyst_ip.address
}

# Variables for sensitive data
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

# Outputs
output "cloud_run_url" {
  value       = google_cloud_run_service.catalyst_newsletter.status[0].url
  description = "Cloud Run service URL"
}

output "load_balancer_ip" {
  value       = google_compute_global_address.catalyst_ip.address
  description = "Load balancer IP address"
}
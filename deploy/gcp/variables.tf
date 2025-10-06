variable "admin_password" {
  description = "Admin user password (stored in Secret Manager during deployment)"
  type        = string
  sensitive   = true
}

output "cloud_run_url" {
  value       = google_cloud_run_service.catalyst_newsletter.status[0].url
  description = "Cloud Run service URL"
}

# output "load_balancer_ip" {
#   value       = google_compute_global_address.catalyst_ip.address
#   description = "Load balancer IP address"
# }
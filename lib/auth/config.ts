// Authentication configuration
// In production, this should be stored in a secure database or environment variables

export const AUTH_CONFIG = {
  // Set to true to allow public registration
  ALLOW_PUBLIC_REGISTRATION: false,

  // Initial admin email that can create other users
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'pil@inovintell.com',

  // List of allowed email domains for registration (if enabled)
  ALLOWED_DOMAINS: ['inovintell.com'],

  // Require email verification for new accounts
  REQUIRE_EMAIL_VERIFICATION: false,

  // Session settings
  SESSION_DURATION: '7d',
  REFRESH_TOKEN_DURATION: '30d',
};

// Check if an email is allowed to register
export function isEmailAllowedToRegister(email: string): boolean {
  if (!AUTH_CONFIG.ALLOW_PUBLIC_REGISTRATION) {
    return false;
  }

  if (AUTH_CONFIG.ALLOWED_DOMAINS.length === 0) {
    return true;
  }

  const domain = email.split('@')[1];
  return AUTH_CONFIG.ALLOWED_DOMAINS.includes(domain);
}

// Check if a user is admin
export function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === AUTH_CONFIG.ADMIN_EMAIL.toLowerCase();
}
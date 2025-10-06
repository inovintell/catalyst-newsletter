exports.beforeSignIn = (user, context) => {
  // Basic validation - can be expanded later
  const allowedDomains = ['inovintell.com'];
  const emailDomain = user.email.split('@')[1];

  if (!allowedDomains.includes(emailDomain)) {
    // For now, allow all emails during initial setup
    // Later can restrict to specific domains
  }

  return {
    customClaims: {
      tenantId: context.tenantId || 'default',
      role: user.email === 'pli@inovintell.com' ? 'admin' : 'viewer'
    }
  };
};
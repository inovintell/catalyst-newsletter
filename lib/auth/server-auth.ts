import 'server-only';

let admin: any;
let auth: any;

export async function getServerAuth() {
  if (!admin) {
    admin = await import('firebase-admin');
    const { getAuth } = await import('firebase-admin/auth');
    const { initializeApp, cert } = await import('firebase-admin/app');

    const projectId = process.env.GCP_PROJECT_ID;
    const serviceAccountPath = process.env.GCP_SERVICE_ACCOUNT_KEY;

    if (!projectId) {
      console.warn('GCP_PROJECT_ID not set, using mock authentication mode');
      return null;
    }

    let serviceAccount: any;
    if (serviceAccountPath && serviceAccountPath !== 'path-to-service-account-key.json') {
      try {
        serviceAccount = require(serviceAccountPath);
      } catch (error) {
        console.error('Failed to load service account key:', error);
      }
    }

    const appConfig: any = {
      projectId,
    };

    if (serviceAccount) {
      appConfig.credential = cert(serviceAccount);
    }

    const app = initializeApp(appConfig, 'identity-platform');
    auth = getAuth(app);
  }

  return auth;
}

export async function verifyIdTokenServer(idToken: string, tenantId?: string) {
  const authInstance = await getServerAuth();
  if (!authInstance) return null;

  try {
    const tenantAuth = tenantId
      ? authInstance.tenantManager().authForTenant(tenantId)
      : authInstance;
    return await tenantAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error('Failed to verify ID token:', error);
    return null;
  }
}

export async function createUserServer(
  email: string,
  password: string,
  displayName?: string,
  tenantId?: string
) {
  const authInstance = await getServerAuth();
  if (!authInstance) return null;

  try {
    const tenantAuth = tenantId
      ? authInstance.tenantManager().authForTenant(tenantId)
      : authInstance;

    return await tenantAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    return null;
  }
}

export async function getUserByEmailServer(email: string, tenantId?: string) {
  const authInstance = await getServerAuth();
  if (!authInstance) return null;

  try {
    const tenantAuth = tenantId
      ? authInstance.tenantManager().authForTenant(tenantId)
      : authInstance;

    return await tenantAuth.getUserByEmail(email);
  } catch (error) {
    console.error('Failed to get user by email:', error);
    return null;
  }
}

export async function getUserByIdServer(uid: string, tenantId?: string) {
  const authInstance = await getServerAuth();
  if (!authInstance) return null;

  try {
    const tenantAuth = tenantId
      ? authInstance.tenantManager().authForTenant(tenantId)
      : authInstance;

    return await tenantAuth.getUser(uid);
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    return null;
  }
}

export async function deleteUserServer(uid: string, tenantId?: string) {
  const authInstance = await getServerAuth();
  if (!authInstance) return;

  try {
    const tenantAuth = tenantId
      ? authInstance.tenantManager().authForTenant(tenantId)
      : authInstance;

    await tenantAuth.deleteUser(uid);
  } catch (error) {
    console.error('Failed to delete user:', error);
  }
}

export async function setCustomUserClaimsServer(
  uid: string,
  claims: any,
  tenantId?: string
) {
  const authInstance = await getServerAuth();
  if (!authInstance) return;

  try {
    const tenantAuth = tenantId
      ? authInstance.tenantManager().authForTenant(tenantId)
      : authInstance;

    await tenantAuth.setCustomUserClaims(uid, claims);
  } catch (error) {
    console.error('Failed to set custom claims:', error);
  }
}

export async function createCustomTokenServer(
  uid: string,
  claims?: object,
  tenantId?: string
) {
  const authInstance = await getServerAuth();
  if (!authInstance) return null;

  try {
    const tenantAuth = tenantId
      ? authInstance.tenantManager().authForTenant(tenantId)
      : authInstance;

    return await tenantAuth.createCustomToken(uid, claims);
  } catch (error) {
    console.error('Failed to create custom token:', error);
    return null;
  }
}
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  tenantId: string;
  role: string;
  permissions: string[];
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';

const users = new Map<string, User>();

export async function createUser(
  email: string,
  password: string,
  displayName?: string,
  tenantId: string = 'default-tenant'
): Promise<User | null> {
  const userKey = `${tenantId}:${email}`;

  if (users.has(userKey)) {
    return null;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const user: User = {
    uid,
    email,
    displayName,
    emailVerified: false,
    tenantId,
    role: 'user',
    permissions: [],
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.set(userKey, user);
  return user;
}

export async function getUserByEmail(
  email: string,
  tenantId: string = 'default-tenant'
): Promise<User | null> {
  const userKey = `${tenantId}:${email}`;
  return users.get(userKey) || null;
}

export async function getUserById(
  uid: string,
  tenantId: string = 'default-tenant'
): Promise<User | null> {
  for (const [key, user] of users.entries()) {
    if (user.uid === uid && user.tenantId === tenantId) {
      return user;
    }
  }
  return null;
}

export async function validatePassword(
  email: string,
  password: string,
  tenantId: string = 'default-tenant'
): Promise<User | null> {
  const user = await getUserByEmail(email, tenantId);
  if (!user || !user.passwordHash) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword as User;
}

export function generateAuthToken(user: User): string {
  return jwt.sign(
    {
      uid: user.uid,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      permissions: user.permissions,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAuthToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function updateUserRole(
  uid: string,
  role: string,
  tenantId: string = 'default-tenant'
): boolean {
  for (const [key, user] of users.entries()) {
    if (user.uid === uid && user.tenantId === tenantId) {
      user.role = role;
      user.updatedAt = new Date();
      users.set(key, user);
      return true;
    }
  }
  return false;
}

export function deleteUser(
  uid: string,
  tenantId: string = 'default-tenant'
): boolean {
  for (const [key, user] of users.entries()) {
    if (user.uid === uid && user.tenantId === tenantId) {
      users.delete(key);
      return true;
    }
  }
  return false;
}
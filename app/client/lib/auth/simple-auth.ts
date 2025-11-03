import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

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

// Initialize default admin user
async function initializeDefaultAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'pli@inovintell.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const tenantId = 'default-tenant';

  try {
    // Check if admin already exists in database
    const existingAdmin = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: adminEmail,
        },
      },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          uid: 'admin_default',
          email: adminEmail,
          displayName: 'Administrator',
          emailVerified: true,
          tenantId,
          role: 'admin',
          permissions: ['manage:users', 'manage:tenants', 'manage:sources', 'manage:newsletters'],
          passwordHash,
        },
      });
      console.log('Default admin user created in database:', adminEmail);
    } else {
      console.log('Default admin user already exists in database:', adminEmail);
    }
  } catch (error) {
    console.error('Failed to initialize default admin:', error);
  }
}

// Initialize on module load
initializeDefaultAdmin().catch(console.error);

export async function createUser(
  email: string,
  password: string,
  displayName?: string,
  tenantId: string = 'default-tenant'
): Promise<User | null> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (existingUser) {
      return null;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dbUser = await prisma.user.create({
      data: {
        uid,
        email,
        displayName,
        emailVerified: false,
        tenantId,
        role: 'user',
        permissions: [],
        passwordHash,
      },
    });

    // Convert to User interface format
    const user: User = {
      uid: dbUser.uid,
      email: dbUser.email,
      displayName: dbUser.displayName || undefined,
      emailVerified: dbUser.emailVerified,
      tenantId: dbUser.tenantId,
      role: dbUser.role,
      permissions: Array.isArray(dbUser.permissions) ? dbUser.permissions as string[] : [],
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };

    return user;
  } catch (error) {
    console.error('Failed to create user:', error);
    return null;
  }
}

export async function getUserByEmail(
  email: string,
  tenantId: string = 'default-tenant'
): Promise<User | null> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (!dbUser) {
      return null;
    }

    const user: User = {
      uid: dbUser.uid,
      email: dbUser.email,
      displayName: dbUser.displayName || undefined,
      emailVerified: dbUser.emailVerified,
      tenantId: dbUser.tenantId,
      role: dbUser.role,
      permissions: Array.isArray(dbUser.permissions) ? dbUser.permissions as string[] : [],
      passwordHash: dbUser.passwordHash,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };

    return user;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    return null;
  }
}

export async function getUserById(
  uid: string,
  tenantId: string = 'default-tenant'
): Promise<User | null> {
  try {
    const dbUser = await prisma.user.findFirst({
      where: {
        uid,
        tenantId,
      },
    });

    if (!dbUser) {
      return null;
    }

    const user: User = {
      uid: dbUser.uid,
      email: dbUser.email,
      displayName: dbUser.displayName || undefined,
      emailVerified: dbUser.emailVerified,
      tenantId: dbUser.tenantId,
      role: dbUser.role,
      permissions: Array.isArray(dbUser.permissions) ? dbUser.permissions as string[] : [],
      passwordHash: dbUser.passwordHash,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };

    return user;
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    return null;
  }
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

export async function updateUserRole(
  uid: string,
  role: string,
  tenantId: string = 'default-tenant'
): Promise<boolean> {
  try {
    const result = await prisma.user.updateMany({
      where: {
        uid,
        tenantId,
      },
      data: {
        role,
      },
    });

    return result.count > 0;
  } catch (error) {
    console.error('Failed to update user role:', error);
    return false;
  }
}

export async function deleteUser(
  uid: string,
  tenantId: string = 'default-tenant'
): Promise<boolean> {
  try {
    const result = await prisma.user.deleteMany({
      where: {
        uid,
        tenantId,
      },
    });

    return result.count > 0;
  } catch (error) {
    console.error('Failed to delete user:', error);
    return false;
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { tenantManager } from '@/lib/auth/tenant-manager';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';

const createTenantSchema = z.object({
  id: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(3).max(100),
  displayName: z.string().min(3).max(100),
  settings: z.object({
    allowPasswordSignup: z.boolean(),
    enableEmailLinkSignin: z.boolean(),
    requireEmailVerification: z.boolean(),
    allowedDomains: z.array(z.string()).optional(),
    defaultRole: z.string().optional(),
  }),
});

export const GET = withAuth(
  async (req: NextRequest, context) => {
    try {
      const tenants = await tenantManager.listTenants();

      const userTenants = context.user?.email
        ? await tenantManager.getUserTenants(context.user.email)
        : [];

      return NextResponse.json({
        tenants: tenants.filter(t => userTenants.includes(t.id)),
        currentTenant: context.tenantId,
      });
    } catch (error) {
      console.error('Error listing tenants:', error);
      return NextResponse.json(
        { error: 'Failed to list tenants' },
        { status: 500 }
      );
    }
  },
  { optional: true }
);

export const POST = withAuth(
  async (req: NextRequest, context) => {
    try {
      const body = await req.json();
      const validation = createTenantSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid request data', details: validation.error.issues },
          { status: 400 }
        );
      }

      const tenant = await tenantManager.createTenant(validation.data);

      if (context.user) {
        await tenantManager.assignUserToTenant(
          context.user.uid,
          tenant.id,
          'admin'
        );
      }

      return NextResponse.json({
        success: true,
        tenant,
      });
    } catch (error) {
      console.error('Error creating tenant:', error);
      return NextResponse.json(
        { error: 'Failed to create tenant' },
        { status: 500 }
      );
    }
  },
  { requiredRole: 'admin' }
);
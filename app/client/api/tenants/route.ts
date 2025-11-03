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
    customClaims: z.record(z.any()).optional(),
    providers: z.array(z.object({
      type: z.enum(['oidc', 'saml', 'oauth2']),
      id: z.string(),
      displayName: z.string(),
      enabled: z.boolean(),
      config: z.record(z.any()).optional(),
    })).optional(),
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
  }
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

      const tenant = await tenantManager.createTenant({
        id: validation.data.id,
        name: validation.data.name,
        displayName: validation.data.displayName,
        settings: {
          allowPasswordSignup: validation.data.settings.allowPasswordSignup,
          enableEmailLinkSignin: validation.data.settings.enableEmailLinkSignin,
          requireEmailVerification: validation.data.settings.requireEmailVerification,
          ...(validation.data.settings.allowedDomains && { allowedDomains: validation.data.settings.allowedDomains }),
          ...(validation.data.settings.defaultRole && { defaultRole: validation.data.settings.defaultRole }),
          ...(validation.data.settings.customClaims && { customClaims: validation.data.settings.customClaims }),
          ...(validation.data.settings.providers && { providers: validation.data.settings.providers as any }),
        },
      });

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
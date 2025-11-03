import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/auth/simple-auth';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    }

    // In production, send password reset email here
    console.log('Password reset would be sent to:', email);

    return NextResponse.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
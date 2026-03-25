/**
 * POST /api/auth/signin
 * Login user and return tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { usersRepo } from '@/lib/database-repositories';
import { generateTokens, comparePassword } from '@/lib/jwt';
import { auditLogsRepo } from '@/lib/database-repositories';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await usersRepo.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await comparePassword(password, user.password_hash || '');
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    try {
      await usersRepo.updateLastLogin(user.id!);
    } catch (updateError) {
      console.warn('[Auth] Could not update last login:', updateError);
    }

    // Generate tokens
    const tokens = generateTokens(user.id!, email, user.role || 'user');

    // Log audit
    if (user.id) {
      try {
        await auditLogsRepo.log({
          user_id: user.id,
          action: 'SIGNIN',
          resource: 'user',
          resource_id: user.id.toString(),
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
        });
      } catch (auditError) {
        console.warn('[Auth] Could not log audit:', auditError);
      }
    }

    const response = NextResponse.json(
      {
        message: 'Signin successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        ...tokens
      },
      { status: 200 }
    );

    // Set secure cookie
    response.cookies.set('railsense_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('[Auth] Signin error:', error);
    return NextResponse.json(
      { error: 'Signin failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

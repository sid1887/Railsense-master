/**
 * POST /api/auth/signup
 * Register a new user
 */

import { NextRequest, NextResponse } from 'next/server';
import { usersRepo } from '@/lib/database-repositories';
import { generateTokens, hashPassword } from '@/lib/jwt';
import { auditLogsRepo } from '@/lib/database-repositories';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    // Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await usersRepo.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = await usersRepo.create({
      email,
      password_hash: passwordHash,
      name: name || email.split('@')[0],
      role: 'user'
    });

    // Generate tokens
    const tokens = generateTokens(userId, email, 'user');

    // Log audit
    try {
      await auditLogsRepo.log({
        user_id: userId,
        action: 'SIGNUP',
        resource: 'user',
        resource_id: userId.toString(),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
    } catch (auditError) {
      console.warn('[Auth] Could not log audit:', auditError);
    }

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: userId,
          email,
          name: name || email.split('@')[0],
          role: 'user'
        },
        ...tokens
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    return NextResponse.json(
      { error: 'Signup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

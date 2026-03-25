/**
 * POST /api/auth/seed-demo
 * Create demo user if it doesn't exist
 */

import { NextRequest, NextResponse } from 'next/server';
import { usersRepo } from '@/lib/database-repositories';
import { hashPassword } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    // Check if demo user already exists
    const existingUser = await usersRepo.findByEmail('demo@railsense.com');

    if (existingUser) {
      return NextResponse.json(
        { message: 'Demo user already exists' },
        { status: 200 }
      );
    }

    // Hash the demo password
    const passwordHash = await hashPassword('demo123456');

    // Create demo user
    const userId = await usersRepo.create({
      email: 'demo@railsense.com',
      password_hash: passwordHash,
      name: 'Demo User',
      role: 'user'
    });

    return NextResponse.json(
      { message: 'Demo user created', userId },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Auth] Seed demo error:', error);
    return NextResponse.json(
      { error: 'Failed to seed demo user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

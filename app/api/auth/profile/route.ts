/**
 * GET /api/auth/profile
 * Get current user profile
 * Requires: Authorization header with Bearer token
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/jwt';
import { usersRepo } from '@/lib/database-repositories';

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization') || '');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Fetch user details (excluding password hash)
    const user = await usersRepo.findById(payload.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at,
          lastLogin: user.last_login
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Get profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

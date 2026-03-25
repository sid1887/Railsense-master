/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, refreshAccessToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token and get payload
    const payload = verifyToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Generate new access token
    const newAccessToken = refreshAccessToken(refreshToken);
    if (!newAccessToken) {
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        accessToken: newAccessToken,
        expiresIn: 86400, // 24 hours
        tokenType: 'Bearer'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * API Route: /api/auth
 * PHASE 11: User authentication endpoints
 * Supports login, logout, token verification, permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/authService';
import { buildApiResponse } from '@/services/apiResponseWrapper';

const defaultConfidence = {
  overall: 0,
  location: 0,
  delay: 0,
  halt: 0,
  crowdLevel: 0,
  sources: [] as any[],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, token } = body;

    if (action === 'login') {
      // Login endpoint
      if (!email || !password) {
        return NextResponse.json(
          buildApiResponse(
            null,
            { ...defaultConfidence },
            false,
            'Email and password are required'
          ),
          { status: 400 }
        );
      }

      const authToken = await authService.loginUser(email, password);

      if (!authToken) {
        return NextResponse.json(
          buildApiResponse(
            null,
            { ...defaultConfidence },
            false,
            'Invalid email or password'
          ),
          { status: 401 }
        );
      }

      const response = NextResponse.json(
        buildApiResponse(
          {
            token: authToken.token,
            userId: authToken.userId,
            role: authToken.role,
            expiresAt: authToken.expiresAt,
          },
          {
            overall: 90,
            location: 0,
            delay: 0,
            halt: 0,
            crowdLevel: 0,
            sources: [
              {
                name: 'local-auth',
                qualityScore: 100,
                lastUpdated: Date.now(),
                isCached: false,
                cacheTTLSeconds: 86400,
              },
            ],
          },
          true
        )
      );

      // Set token in secure cookie
      response.cookies.set('railsense_auth', authToken.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400, // 24 hours
      });

      return response;
    }

    if (action === 'verify') {
      // Verify token endpoint
      if (!token) {
        return NextResponse.json(
          buildApiResponse(
            null,
            { ...defaultConfidence },
            false,
            'Token is required'
          ),
          { status: 400 }
        );
      }

      const verified = await authService.verifyToken(token);

      if (!verified) {
        return NextResponse.json(
          buildApiResponse(
            null,
            { ...defaultConfidence },
            false,
            'Invalid or expired token'
          ),
          { status: 401 }
        );
      }

      const user = await authService.getUserById(verified.userId);

      return NextResponse.json(
        buildApiResponse(
          {
            valid: true,
            userId: verified.userId,
            role: verified.role,
            user,
          },
          {
            overall: 95,
            location: 0,
            delay: 0,
            halt: 0,
            crowdLevel: 0,
            sources: [
              {
                name: 'local-auth',
                qualityScore: 100,
                lastUpdated: Date.now(),
                isCached: false,
                cacheTTLSeconds: 86400,
              },
            ],
          },
          true
        )
      );
    }

    if (action === 'logout') {
      // Logout endpoint
      if (!token) {
        return NextResponse.json(
          buildApiResponse(
            null,
            { ...defaultConfidence },
            false,
            'Token is required'
          ),
          { status: 400 }
        );
      }

      await authService.logoutUser(token);

      const response = NextResponse.json(
        buildApiResponse(
          { message: 'Logged out successfully' },
          {
            overall: 90,
            location: 0,
            delay: 0,
            halt: 0,
            crowdLevel: 0,
            sources: [
              {
                name: 'local-auth',
                qualityScore: 100,
                lastUpdated: Date.now(),
                isCached: false,
                cacheTTLSeconds: 0,
              },
            ],
          },
          true
        )
      );

      // Clear token cookie
      response.cookies.delete('railsense_auth');

      return response;
    }

    if (action === 'demo-users') {
      // Get demo users for testing
      const demoUsers = authService.getDemoUsers();
      return NextResponse.json(
        buildApiResponse(
          { users: demoUsers },
          {
            overall: 85,
            location: 0,
            delay: 0,
            halt: 0,
            crowdLevel: 0,
            sources: [
              {
                name: 'local-auth',
                qualityScore: 100,
                lastUpdated: Date.now(),
                isCached: false,
                cacheTTLSeconds: 0,
              },
            ],
          },
          true
        )
      );
    }

    return NextResponse.json(
      buildApiResponse(
        null,
        { ...defaultConfidence },
        false,
        'Invalid action'
      ),
      { status: 400 }
    );
  } catch (error) {
    console.error('[auth API] Error:', error);
    return NextResponse.json(
      buildApiResponse(
        null,
        { ...defaultConfidence },
        false,
        'Internal server error'
      ),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');

    if (action === 'me') {
      // Get current user info
      const token = request.cookies.get('railsense_auth')?.value;

      if (!token) {
        return NextResponse.json(
          buildApiResponse(
            null,
            { ...defaultConfidence },
            false,
            'Not authenticated'
          ),
          { status: 401 }
        );
      }

      const verified = await authService.verifyToken(token);
      if (!verified) {
        return NextResponse.json(
          buildApiResponse(
            null,
            { ...defaultConfidence },
            false,
            'Invalid token'
          ),
          { status: 401 }
        );
      }

      const user = await authService.getUserById(verified.userId);

      return NextResponse.json(
        buildApiResponse(
          { user },
          {
            overall: 95,
            location: 0,
            delay: 0,
            halt: 0,
            crowdLevel: 0,
            sources: [
              {
                name: 'local-auth',
                qualityScore: 100,
                lastUpdated: Date.now(),
                isCached: false,
                cacheTTLSeconds: 0,
              },
            ],
          },
          true
        )
      );
    }

    return NextResponse.json(
      buildApiResponse(
        null,
        { ...defaultConfidence },
        false,
        'Invalid action'
      ),
      { status: 400 }
    );
  } catch (error) {
    console.error('[auth API] Error:', error);
    return NextResponse.json(
      buildApiResponse(
        null,
        { ...defaultConfidence },
        false,
        'Internal server error'
      ),
      { status: 500 }
    );
  }
}

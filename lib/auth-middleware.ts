/**
 * API Authentication Middleware
 * Protects endpoints based on authentication status and user roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload, extractToken } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
  userId?: number;
}

/**
 * Middleware to verify JWT token
 * Returns 401 if token is missing or invalid
 */
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<Response>) {
  return async (req: AuthenticatedRequest) => {
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

      req.user = payload;
      req.userId = payload.id;

      return handler(req);
    } catch (error) {
      console.error('[Auth Middleware] Error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Middleware to verify JWT token and check for admin role
 * Returns 403 if user doesn't have admin role
 */
export function withAdminAuth(handler: (req: AuthenticatedRequest) => Promise<Response>) {
  return async (req: AuthenticatedRequest) => {
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

      if (payload.role !== 'admin') {
        return NextResponse.json(
          { error: 'Insufficient permissions. Admin access required.' },
          { status: 403 }
        );
      }

      req.user = payload;
      req.userId = payload.id;

      return handler(req);
    } catch (error) {
      console.error('[Admin Auth Middleware] Error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Middleware for optional authentication
 * Doesn't fail if token is missing, but verifies if present
 */
export function withOptionalAuth(handler: (req: AuthenticatedRequest) => Promise<Response>) {
  return async (req: AuthenticatedRequest) => {
    try {
      const authHeader = req.headers.get('authorization') || '';
      const token = extractToken(authHeader);

      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          req.user = payload;
          req.userId = payload.id;
        }
      }

      return handler(req);
    } catch (error) {
      console.error('[Optional Auth Middleware] Error:', error);
      return handler(req); // Continue without auth
    }
  };
}

/**
 * Helper function to combine multiple middlewares
 */
export function composeMiddleware(...middlewares: Array<(req: AuthenticatedRequest) => Promise<Response>>) {
  return async (req: AuthenticatedRequest) => {
    for (const middleware of middlewares) {
      const response = await middleware(req);
      if (response.status !== 200) {
        return response;
      }
    }
    return NextResponse.json({ error: 'No handler found' }, { status: 404 });
  };
}

/**
 * Validate request method
 */
export function validateMethod(req: NextRequest, allowedMethods: string[]): boolean {
  return allowedMethods.includes(req.method.toUpperCase());
}

/**
 * Standard error response format
 */
export function errorResponse(message: string, status: number = 400, details?: any) {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details })
    },
    { status }
  );
}

/**
 * Standard success response format
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

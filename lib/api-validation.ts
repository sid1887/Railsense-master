/**
 * API Request Validation and Rate Limiting
 * Middleware for input validation, sanitization, and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limit store (for single instance, use Redis for distributed)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  default: { requests: 100, windowMs: 60000 }, // 100 requests per minute
  auth: { requests: 5, windowMs: 60000 }, // 5 requests per minute for auth endpoints
  search: { requests: 30, windowMs: 60000 }, // 30 requests per minute for search
  admin: { requests: 200, windowMs: 60000 }, // 200 requests per minute for admin
};

/**
 * Get client IP from request
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Rate limit check
 */
export function checkRateLimit(
  req: NextRequest,
  limitKey: keyof typeof RATE_LIMITS = 'default'
): { allowed: boolean; remaining: number; resetTime: number } {
  const clientIp = getClientIp(req);
  const key = `${clientIp}:${limitKey}`;
  const now = Date.now();
  const limit = RATE_LIMITS[limitKey];

  let record = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + limit.windowMs };
    rateLimitStore.set(key, record);
  }

  // Increment counter
  record.count++;

  const allowed = record.count <= limit.requests;
  const remaining = Math.max(0, limit.requests - record.count);
  const resetTime = record.resetTime;

  return { allowed, remaining, resetTime };
}

/**
 * Middleware to apply rate limiting
 */
export function withRateLimit(limitKey: keyof typeof RATE_LIMITS = 'default') {
  return async (handler: (req: NextRequest) => Promise<Response>) => {
    return async (req: NextRequest) => {
      const { allowed, remaining, resetTime } = checkRateLimit(req, limitKey);

      const headers = new Headers();
      headers.set('X-RateLimit-Limit', String(RATE_LIMITS[limitKey].requests));
      headers.set('X-RateLimit-Remaining', String(remaining));
      headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

      if (!allowed) {
        return new NextResponse(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          {
            status: 429,
            headers: {
              ...Object.fromEntries(headers),
              'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000))
            }
          }
        );
      }

      const response = await handler(req);
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    };
  };
}

/**
 * Validate request method
 */
export function validateMethod(allowedMethods: string[]) {
  return (req: NextRequest) => {
    if (!allowedMethods.includes(req.method.toUpperCase())) {
      return NextResponse.json(
        { error: `Method ${req.method} not allowed` },
        { status: 405 }
      );
    }
    return null;
  };
}

/**
 * Validate JSON content type
 */
export function validateContentType(req: NextRequest): boolean {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers.get('content-type');
    return !contentType || contentType.includes('application/json');
  }
  return true;
}

/**
 * Sanitize query parameters
 */
export function sanitizeQuery(query: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      sanitized[key] = value
        .replace(/[<>\"']/g, '') // Remove HTML-unsafe characters
        .trim();
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v =>
        typeof v === 'string' ? v.replace(/[<>\"']/g, '').trim() : v
      );
    }
  }

  return sanitized;
}

/**
 * Parse and validate query parameters
 */
export async function parseAndValidateQuery(
  req: NextRequest,
  allowedParams: Record<string, 'string' | 'number' | 'boolean' | 'string[]'>
): Promise<{ valid: boolean; params: Record<string, any>; error?: string }> {
  const searchParams = req.nextUrl.searchParams;
  const params: Record<string, any> = {};

  for (const [key, expectedType] of Object.entries(allowedParams)) {
    const rawValue = searchParams.get(key);

    if (!rawValue) {
      continue;
    }

    try {
      if (expectedType === 'string') {
        params[key] = rawValue.trim();
      } else if (expectedType === 'number') {
        const num = Number(rawValue);
        if (isNaN(num)) {
          return { valid: false, params: {}, error: `${key} must be a number` };
        }
        params[key] = num;
      } else if (expectedType === 'boolean') {
        params[key] = rawValue.toLowerCase() === 'true';
      } else if (expectedType === 'string[]') {
        params[key] = rawValue.split(',').map(v => v.trim());
      }
    } catch (error) {
      return { valid: false, params: {}, error: `Invalid value for ${key}` };
    }
  }

  return { valid: true, params };
}

/**
 * Parse and validate JSON body
 */
export async function parseAndValidateBody(
  req: NextRequest,
  requiredFields: string[] = []
): Promise<{ valid: boolean; data: any; error?: string }> {
  try {
    const data = await req.json();

    if (!data || typeof data !== 'object') {
      return { valid: false, data: {}, error: 'Request body must be JSON object' };
    }

    // Check required fields
    for (const field of requiredFields) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        return { valid: false, data: {}, error: `Missing required field: ${field}` };
      }
    }

    return { valid: true, data };
  } catch (error) {
    return {
      valid: false,
      data: {},
      error: error instanceof SyntaxError ? 'Invalid JSON' : 'Failed to parse body'
    };
  }
}

/**
 * Cleanup old rate limit records (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Standard error response
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
 * Standard success response
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * JWT Authentication Module
 * Handles token generation, verification, and refresh logic
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const SECRET = (process.env.JWT_SECRET || 'your-secret-key-change-in-production') as string;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production') as string;
const TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload extends JwtPayload {
  id: number;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate access and refresh tokens for a user
 */
export function generateTokens(userId: number, email: string, role: string): AuthTokens {
  const payload = { id: userId, email, role };

  const accessToken = jwt.sign(payload, SECRET, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: 'HS256'
  });

  const refreshToken = jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256'
  });

  // Decode to get expiration time
  const decoded = jwt.decode(accessToken) as TokenPayload | null;
  const expiresIn = decoded && decoded.exp && decoded.iat
    ? (decoded.exp - decoded.iat)
    : 86400; // Default to 24 hours

  return { accessToken, refreshToken, expiresIn };
}

/**
 * Verify an access token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] }) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('[JWT] Token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Verify and refresh an expired access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): string | null {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      SECRET,
      { expiresIn: TOKEN_EXPIRY, algorithm: 'HS256' }
    );
    return newAccessToken;
  } catch (error) {
    console.error('[JWT] Refresh token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a simple API key for service-to-service authentication
 */
export function generateApiKey(prefix: string = 'sk'): string {
  const randomBytes = Math.random().toString(36).substring(2, 15) +
                     Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}${randomBytes}`;
}

/**
 * Authentication Service
 * PHASE 11: User authentication, JWT tokens, and role-based access control
 *
 * User Roles:
 * - passenger: Can view their train details and analytics
 * - staff: Can view all trains, mark incidents, manage operations
 * - admin: Full access to all features and configuration
 * - analyst: Can access historical data and reports
 *
 * TODO: In production, integrate with OAuth2, Cognito, or Auth0
 */

import * as crypto from 'crypto';

export type UserRole = 'passenger' | 'staff' | 'analyst' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: number;
  lastLogin?: number;
  isActive: boolean;
}

export interface AuthToken {
  userId: string;
  token: string;
  expiresAt: number;
  role: UserRole;
}

// In-memory user store (TODO: Replace with database)
const users = new Map<string, AuthUser>();
const tokens = new Map<string, AuthToken>();
const DEMO_USERS: AuthUser[] = [
  {
    id: 'user_passenger_1',
    email: 'passenger@railsense.local',
    name: 'John Passenger',
    role: 'passenger',
    createdAt: Date.now(),
    isActive: true,
  },
  {
    id: 'user_staff_1',
    email: 'staff@railsense.local',
    name: 'Jane Staff',
    role: 'staff',
    createdAt: Date.now(),
    isActive: true,
  },
  {
    id: 'user_analyst_1',
    email: 'analyst@railsense.local',
    name: 'Dev Analyst',
    role: 'analyst',
    createdAt: Date.now(),
    isActive: true,
  },
  {
    id: 'user_admin_1',
    email: 'admin@railsense.local',
    name: 'Admin User',
    role: 'admin',
    createdAt: Date.now(),
    isActive: true,
  },
];

class AuthenticationService {
  private tokenExpiration = 86400000; // 24 hours

  constructor() {
    // Initialize demo users
    DEMO_USERS.forEach((user) => {
      users.set(user.id, user);
    });
  }

  /**
   * Authenticate user with email and password (demo)
   * In production: Use bcrypt and database validation
   */
  async loginUser(email: string, password: string): Promise<AuthToken | null> {
    // Demo: Accept any password for known users
    const user = Array.from(users.values()).find((u) => u.email === email);

    if (!user || !user.isActive) {
      return null;
    }

    const token = this._generateToken(user);
    tokens.set(token, {
      userId: user.id,
      token,
      expiresAt: Date.now() + this.tokenExpiration,
      role: user.role,
    });

    // Update last login
    user.lastLogin = Date.now();

    console.log(`[Auth] User logged in: ${user.email} (${user.role})`);

    return tokens.get(token) || null;
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<AuthToken | null> {
    const authToken = tokens.get(token);

    if (!authToken) {
      return null;
    }

    // Check if token has expired
    if (Date.now() > authToken.expiresAt) {
      tokens.delete(token);
      return null;
    }

    return authToken;
  }

  /**
   * Logout user (invalidate token)
   */
  async logoutUser(token: string): Promise<boolean> {
    return tokens.delete(token);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    return users.get(userId) || null;
  }

  /**
   * Check if user has permission for action
   */
  hasPermission(role: UserRole, action: string): boolean {
    const permissions: Record<UserRole, string[]> = {
      passenger: ['view_own_train', 'view_analytics', 'view_news'],
      staff: [
        'view_own_train',
        'view_analytics',
        'view_news',
        'view_all_trains',
        'record_incident',
        'mark_resolved',
      ],
      analyst: [
        'view_own_train',
        'view_analytics',
        'view_news',
        'view_all_trains',
        'view_historical_data',
        'generate_reports',
        'export_data',
      ],
      admin: [
        'view_own_train',
        'view_analytics',
        'view_news',
        'view_all_trains',
        'record_incident',
        'mark_resolved',
        'view_historical_data',
        'generate_reports',
        'export_data',
        'manage_users',
        'manage_system',
        'view_audit_logs',
      ],
    };

    return permissions[role]?.includes(action) || false;
  }

  /**
   * List all users (admin only)
   */
  getAllUsers(): AuthUser[] {
    return Array.from(users.values());
  }

  /**
   * Create new user (admin only)
   */
  async createUser(
    email: string,
    name: string,
    role: UserRole
  ): Promise<AuthUser | null> {
    // Check if user exists
    if (Array.from(users.values()).some((u) => u.email === email)) {
      return null;
    }

    const user: AuthUser = {
      id: `user_${role}_${Date.now()}`,
      email,
      name,
      role,
      createdAt: Date.now(),
      isActive: true,
    };

    users.set(user.id, user);
    console.log(`[Auth] New user created: ${email} (${role})`);

    return user;
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<boolean> {
    const user = users.get(userId);
    if (user) {
      user.isActive = false;
      return true;
    }
    return false;
  }

  /**
   * Change user role (admin only)
   */
  async changeUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    const user = users.get(userId);
    if (user) {
      user.role = newRole;
      console.log(`[Auth] User role changed: ${user.email} → ${newRole}`);
      return true;
    }
    return false;
  }

  /**
   * Generate random JWT-like token
   */
  private _generateToken(user: AuthUser): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    };

    // Simple token format: base64(payload).randomSignature
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.randomBytes(32).toString('hex');

    return `${encoded}.${signature}`;
  }

  /**
   * Get demo users for testing
   */
  getDemoUsers(): { email: string; role: UserRole; password: string }[] {
    return DEMO_USERS.map((user) => ({
      email: user.email,
      role: user.role,
      password: '(any password works in demo mode)',
    }));
  }
}

export const authService = new AuthenticationService();

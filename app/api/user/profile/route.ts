import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/jwt';
import { parseAndValidateBody } from '@/lib/api-validation';
import { dbRun, dbGet } from '@/lib/database';
import { usersRepo } from '@/lib/database-repositories';
import { log } from '@/lib/logger';

export async function PUT(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const parsed = await parseAndValidateBody(req, ['name']);
    if (!parsed.valid) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { name } = parsed.data;

    // Validate input
    if (name && typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name format' }, { status: 400 });
    }

    if (name && (name.length < 2 || name.length > 100)) {
      return NextResponse.json({ error: 'Name must be between 2 and 100 characters' }, { status: 400 });
    }

    // Update user profile
    const updates: any = {};
    if (name) updates.name = name;

    const result = await dbRun(
      `UPDATE users SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...Object.values(updates), payload.id]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch updated user
    const user = await usersRepo.findById(payload.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    log.error('Profile update error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Delete user account (irreversible)
    const result = await dbRun('DELETE FROM users WHERE id = ?', [payload.id]);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    log.error('Account deletion error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const user = await usersRepo.findById(payload.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    log.error('Profile fetch error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

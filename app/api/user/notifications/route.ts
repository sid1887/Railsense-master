import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/api-validation';
import { dbRun, dbAll, dbGet } from '@/lib/database';
import { log } from '@/lib/logger';

// GET user notifications
export async function GET(req: NextRequest) {
  try {
    await checkRateLimit(req, 'default');

    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    let query = `SELECT * FROM user_notifications WHERE user_id = ?`;
    const params: any[] = [payload.id];

    if (unreadOnly) query += ` AND is_read = 0`;
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const notifications = await dbAll<any>(query, params);
    const unreadCount = await dbGet<any>(
      `SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = 0`,
      [payload.id]
    );

    return NextResponse.json({ notifications, unreadCount: unreadCount?.count || 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST handle notification actions
export async function POST(req: NextRequest) {
  try {
    await checkRateLimit(req, 'default');

    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, notificationId } = body;

    if (action === 'markAsRead' && notificationId) {
      await dbRun(
        `UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
        [notificationId, payload.id]
      );
      return NextResponse.json({ message: 'Marked as read' });
    }

    if (action === 'markAllAsRead') {
      await dbRun(
        `UPDATE user_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
        [payload.id]
      );
      return NextResponse.json({ message: 'All marked as read' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process notification' }, { status: 500 });
  }
}

// DELETE notification
export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const notificationId = url.searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const result = await dbRun(
      `DELETE FROM user_notifications WHERE id = ? AND user_id = ?`,
      [notificationId, payload.id]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/api-validation';
import { dbRun, dbAll } from '@/lib/database';
import { log } from '@/lib/logger';

// GET user activity history
export async function GET(req: NextRequest) {
  try {
    await checkRateLimit(req, 'default');

    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const activityType = url.searchParams.get('type');

    let query = `SELECT id, activity_type, train_number, details, created_at
                 FROM user_activity WHERE user_id = ?`;
    const params: any[] = [payload.id];

    if (activityType) {
      query += ` AND activity_type = ?`;
      params.push(activityType);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const activities = await dbAll<any>(query, params);

    log.api('GET /api/user/activity', 'GET', 200, 0, payload.id);

    return NextResponse.json({ activities, count: activities.length });
  } catch (error) {
    log.error('Fetch activity error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}

// POST record user activity
export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { activityType, trainNumber, details } = body;

    if (!activityType) {
      return NextResponse.json({ error: 'Activity type required' }, { status: 400 });
    }

    // Get user agent from request
    const userAgent = req.headers.get('user-agent') || '';

    await dbRun(
      `INSERT INTO user_activity (user_id, activity_type, train_number, details, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [payload.id, activityType, trainNumber || null, details || null, userAgent]
    );

    return NextResponse.json({ message: 'Activity recorded' }, { status: 201 });
  } catch (error) {
    log.error('Record activity error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 });
  }
}

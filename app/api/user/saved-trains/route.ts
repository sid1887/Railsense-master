import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/jwt';
import { parseAndValidateBody, checkRateLimit } from '@/lib/api-validation';
import { dbRun, dbAll, dbGet } from '@/lib/database';
import { log } from '@/lib/logger';

// GET saved trains for current user
export async function GET(req: NextRequest) {
  try {
    await checkRateLimit(req, 'default');

    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const trains = await dbAll<any>(
      `SELECT train_number, train_name, from_station, to_station, saved_at
       FROM saved_trains
       WHERE user_id = ?
       ORDER BY saved_at DESC`,
      [payload.id]
    );

    log.api('GET /api/user/saved-trains', 'GET', 200, 0, payload.id);

    return NextResponse.json({ trains, count: trains.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch saved trains' }, { status: 500 });
  }
}

// POST save a train
export async function POST(req: NextRequest) {
  try {
    await checkRateLimit(req, 'default');

    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const parsed = await parseAndValidateBody(req, ['trainNumber']);
    if (!parsed.valid) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { trainNumber, fromStation, toStation, trainName } = parsed.data;

    // Check if already saved
    const existing = await dbGet<any>(
      `SELECT id FROM saved_trains WHERE user_id = ? AND train_number = ?`,
      [payload.id, trainNumber]
    );

    if (existing) {
      return NextResponse.json({ error: 'Train already saved' }, { status: 400 });
    }

    // Save train
    await dbRun(
      `INSERT INTO saved_trains (user_id, train_number, train_name, from_station, to_station, saved_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [payload.id, trainNumber, trainName || '', fromStation || '', toStation || '']
    );

    return NextResponse.json({ message: 'Train saved successfully' }, { status: 201 });
  } catch (error) {
    log.error('Save train error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to save train' }, { status: 500 });
  }
}

// DELETE unsave a train
export async function DELETE(req: NextRequest) {
  try {
    await checkRateLimit(req, 'default');

    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const url = new URL(req.url);
    const trainNumber = url.searchParams.get('trainNumber');

    if (!trainNumber) {
      return NextResponse.json({ error: 'trainNumber parameter required' }, { status: 400 });
    }

    const result = await dbRun(
      `DELETE FROM saved_trains WHERE user_id = ? AND train_number = ?`,
      [payload.id, trainNumber]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Saved train not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Train unsaved successfully' });
  } catch (error) {
    log.error('Unsave train error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to unsave train' }, { status: 500 });
  }
}

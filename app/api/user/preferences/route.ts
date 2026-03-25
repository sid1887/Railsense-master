import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/jwt';
import { dbRun, dbGet } from '@/lib/database';
import { log } from '@/lib/logger';

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

    const preferences = await dbGet<any>(
      `SELECT * FROM user_preferences WHERE user_id = ?`,
      [payload.id]
    );

    // Return default preferences if not found
    const defaults = {
      notification_enabled: true,
      email_enabled: true,
      push_enabled: true,
      theme: 'dark',
      language: 'en',
      alert_frequency: 'immediate',
    };

    return NextResponse.json({ preferences: preferences || defaults });
  } catch (error) {
    log.error('Fetch preferences error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

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

    const body = await req.json();
    const {
      notificationEnabled,
      emailEnabled,
      pushEnabled,
      theme,
      language,
      alertFrequency,
      favoriteTrains,
    } = body;

    // Check if preferences exist
    const exists = await dbGet<any>(
      `SELECT id FROM user_preferences WHERE user_id = ?`,
      [payload.id]
    );

    if (exists) {
      // Update
      const updates: string[] = [];
      const values: any[] = [];

      if (notificationEnabled !== undefined) {
        updates.push('notification_enabled = ?');
        values.push(notificationEnabled);
      }
      if (emailEnabled !== undefined) {
        updates.push('email_enabled = ?');
        values.push(emailEnabled);
      }
      if (pushEnabled !== undefined) {
        updates.push('push_enabled = ?');
        values.push(pushEnabled);
      }
      if (theme) {
        updates.push('theme = ?');
        values.push(theme);
      }
      if (language) {
        updates.push('language = ?');
        values.push(language);
      }
      if (alertFrequency) {
        updates.push('alert_frequency = ?');
        values.push(alertFrequency);
      }
      if (favoriteTrains) {
        updates.push('favorite_trains = ?');
        values.push(favoriteTrains);
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'No preferences to update' }, { status: 400 });
      }

      values.push(payload.id);

      await dbRun(
        `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
        values
      );
    } else {
      // Insert
      await dbRun(
        `INSERT INTO user_preferences
         (user_id, notification_enabled, email_enabled, push_enabled, theme, language, alert_frequency, favorite_trains)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.id,
          notificationEnabled ?? true,
          emailEnabled ?? true,
          pushEnabled ?? true,
          theme || 'dark',
          language || 'en',
          alertFrequency || 'immediate',
          favoriteTrains || '',
        ]
      );
    }

    return NextResponse.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    log.error('Update preferences error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}

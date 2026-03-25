import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/jwt';
import { parseAndValidateBody, checkRateLimit } from '@/lib/api-validation';
import { dbRun, dbAll, dbGet } from '@/lib/database';
import { log } from '@/lib/logger';

// GET reviews for a train or user's reviews
export async function GET(req: NextRequest) {
  try {
    await checkRateLimit(req, 'default');

    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const trainNumber = url.searchParams.get('trainNumber');
    const userOnly = url.searchParams.get('userOnly') === 'true';

    let query = `SELECT id, train_number, rating, review_text, cleanliness, comfort,
                        punctuality, staff_behavior, created_at FROM user_reviews`;
    const params: any[] = [];

    if (userOnly) {
      query += ` WHERE user_id = ?`;
      params.push(payload.id);
    } else if (trainNumber) {
      query += ` WHERE train_number = ?`;
      params.push(trainNumber);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const reviews = await dbAll<any>(query, params);

    // If this is a specific train, calculate average ratings
    if (trainNumber) {
      const stats = await dbGet<any>(
        `SELECT
          AVG(rating) as avgRating,
          AVG(cleanliness) as avgCleanliness,
          AVG(comfort) as avgComfort,
          AVG(punctuality) as avgPunctuality,
          AVG(staff_behavior) as avgStaff,
          COUNT(*) as totalReviews
         FROM user_reviews WHERE train_number = ?`,
        [trainNumber]
      );

      return NextResponse.json({ reviews, stats });
    }

    return NextResponse.json({ reviews });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST create or update review
export async function POST(req: NextRequest) {
  try {
    await checkRateLimit(req, 'default');

    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = await parseAndValidateBody(req, ['trainNumber', 'rating']);
    if (!parsed.valid) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { trainNumber, rating, reviewText, cleanliness, comfort, punctuality, staffBehavior } = parsed.data;

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Check if review exists
    const existing = await dbGet<any>(
      `SELECT id FROM user_reviews WHERE user_id = ? AND train_number = ?`,
      [payload.id, trainNumber]
    );

    if (existing) {
      // Update
      await dbRun(
        `UPDATE user_reviews
         SET rating = ?, review_text = ?, cleanliness = ?, comfort = ?, punctuality = ?,
             staff_behavior = ?, updated_at = datetime('now')
         WHERE user_id = ? AND train_number = ?`,
        [
          rating,
          reviewText || null,
          cleanliness || null,
          comfort || null,
          punctuality || null,
          staffBehavior || null,
          payload.id,
          trainNumber,
        ]
      );
    } else {
      // Create new review
      await dbRun(
        `INSERT INTO user_reviews
         (user_id, train_number, rating, review_text, cleanliness, comfort, punctuality, staff_behavior, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          payload.id,
          trainNumber,
          rating,
          reviewText || null,
          cleanliness || null,
          comfort || null,
          punctuality || null,
          staffBehavior || null,
        ]
      );
    }

    return NextResponse.json({ message: 'Review saved successfully' }, { status: existing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}

// DELETE review
export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const reviewId = url.searchParams.get('id');
    const trainNumber = url.searchParams.get('trainNumber');

    if (!reviewId && !trainNumber) {
      return NextResponse.json({ error: 'ID or train number required' }, { status: 400 });
    }

    let query = 'DELETE FROM user_reviews WHERE user_id = ?';
    const params: any[] = [payload.id];

    if (reviewId) {
      query += ' AND id = ?';
      params.push(reviewId);
    } else if (trainNumber) {
      query += ' AND train_number = ?';
      params.push(trainNumber);
    }

    const result = await dbRun(query, params);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Review deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}

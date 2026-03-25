/**
 * Track Snapping API Endpoint
 * GET /api/track-snap - Snap train coordinates to railway tracks
 *
 * Query Parameters:
 * - latitude (required): Train latitude
 * - longitude (required): Train longitude
 * - train (optional): Train number for context
 *
 * Response: Snapped position with track segment metadata
 */

import { NextRequest, NextResponse } from 'next/server';

let mapTrackSnapping: any = null;

// Load track snapping service on server-side
if (typeof window === 'undefined') {
  try {
    mapTrackSnapping = require('@/services/mapTrackSnapping').default;
  } catch (e) {
    console.error('[TrackSnap API] Failed to load service:', e);
  }
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse required parameters
    const latStr = searchParams.get('latitude');
    const lngStr = searchParams.get('longitude');
    const trainNumber = searchParams.get('train') || 'unknown';

    if (!latStr || !lngStr) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          required: ['latitude', 'longitude']
        },
        { status: 400 }
      );
    }

    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude values' },
        { status: 400 }
      );
    }

    // Validate coordinate ranges (India)
    if (latitude < 8 || latitude > 35 || longitude < 68 || longitude > 97) {
      return NextResponse.json(
        {
          error: 'Coordinates outside India',
          note: 'Latitude must be 8-35, Longitude must be 68-97'
        },
        { status: 400 }
      );
    }

    if (!mapTrackSnapping) {
      return NextResponse.json(
        { error: 'Track snapping service not initialized' },
        { status: 503 }
      );
    }

    // Snap to nearest track
    const snappedPosition = mapTrackSnapping.snapToNearestTrack(latitude, longitude);

    // Response structure
    const response = {
      timestamp: new Date().toISOString(),
      input: {
        trainNumber,
        latitude,
        longitude,
      },
      result: snappedPosition ? {
        success: true,
        original: snappedPosition.original,
        snapped: snappedPosition.snapped,
        distanceKm: parseFloat(snappedPosition.distance.toFixed(2)),
        confidence: calculateConfidence(snappedPosition.distance),
        trackSegment: {
          id: snappedPosition.trackSegment.id,
          name: snappedPosition.trackSegment.name,
          section: snappedPosition.trackSegment.section,
          startStation: snappedPosition.trackSegment.startStation,
          endStation: snappedPosition.trackSegment.endStation,
        },
        snappingQuality: classifySnappingQuality(snappedPosition.distance),
      } : {
        success: false,
        original: { latitude, longitude },
        reason: 'No track found within snapping tolerance (2km)',
        distanceKm: null,
        confidence: 0,
        recommendation: 'Train position is off-network. Check GPS source.',
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[TrackSnap API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate confidence score based on snapping distance
 * Closer distance = higher confidence
 */
function calculateConfidence(distanceKm: number): number {
  if (distanceKm < 0.1) return 0.99; // Excellent
  if (distanceKm < 0.3) return 0.95; // Very good
  if (distanceKm < 0.5) return 0.90; // Good
  if (distanceKm < 1.0) return 0.80; // Fair
  if (distanceKm < 1.5) return 0.70; // Poor
  return 0.50; // Very poor
}

/**
 * Classify snapping quality level
 */
function classifySnappingQuality(distanceKm: number): string {
  if (distanceKm < 0.1) return 'excellent';
  if (distanceKm < 0.3) return 'very_good';
  if (distanceKm < 0.5) return 'good';
  if (distanceKm < 1.0) return 'fair';
  if (distanceKm < 1.5) return 'poor';
  return 'critical';
}

/**
 * POST endpoint for batch snapping
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.positions)) {
      return NextResponse.json(
        { error: 'Request body must contain "positions" array' },
        { status: 400 }
      );
    }

    if (!mapTrackSnapping) {
      return NextResponse.json(
        { error: 'Track snapping service not initialized' },
        { status: 503 }
      );
    }

    // Process batch positions
    const results = body.positions.map((pos: any) => {
      const latitude = parseFloat(pos.latitude);
      const longitude = parseFloat(pos.longitude);

      if (isNaN(latitude) || isNaN(longitude)) {
        return {
          trainNumber: pos.trainNumber || 'unknown',
          error: 'Invalid coordinates',
          success: false,
        };
      }

      const snappedPosition = mapTrackSnapping.snapToNearestTrack(latitude, longitude);

      return {
        trainNumber: pos.trainNumber || 'unknown',
        original: { latitude, longitude },
        snapped: snappedPosition?.snapped || null,
        distanceKm: snappedPosition?.distance ? parseFloat(snappedPosition.distance.toFixed(2)) : null,
        confidence: snappedPosition ? calculateConfidence(snappedPosition.distance) : 0,
        success: !!snappedPosition,
      };
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      total: body.positions.length,
      successful: results.filter((r: any) => r.success).length,
      results,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[TrackSnap API] Batch error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

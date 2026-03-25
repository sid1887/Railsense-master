/**
 * Tracked Trains Endpoint
 * GET /api/train/tracked
 *
 * Returns list of trains currently being tracked by the system
 * (live trains + cached trains from recent searches)
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TrackedTrain {
  number: string;
  name: string;
  status: 'moving' | 'halted' | 'delayed';
  delayMinutes: number;
  currentStation: string;
  nextStation: string;
  speedKmph: number;
  confidence: number;
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with actual backend query
    // For now, return mock list of tracked trains
    // In production, this should query:
    // 1. Live trains from trainPositionTracker
    // 2. Recently cached trains
    // 3. User-bookmarked trains

    const trackedTrains: TrackedTrain[] = [
      {
        number: '12955',
        name: 'Rajendra Express',
        status: 'moving',
        delayMinutes: 12,
        currentStation: 'Vikarabad',
        nextStation: 'Tandur',
        speedKmph: 78,
        confidence: 0.88,
      },
      {
        number: '12728',
        name: 'South Western Express',
        status: 'halted',
        delayMinutes: 45,
        currentStation: 'Virar Station',
        nextStation: 'Valsad',
        speedKmph: 0,
        confidence: 0.82,
      },
      {
        number: '17015',
        name: 'Hyderabad Express',
        status: 'delayed',
        delayMinutes: 28,
        currentStation: 'Secunderabad Junction',
        nextStation: 'Kacheguda',
        speedKmph: 45,
        confidence: 0.85,
      },
    ];

    return NextResponse.json(
      { trains: trackedTrains },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch tracked trains', details: error.message },
      { status: 500 }
    );
  }
}

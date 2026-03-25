/**
 * Tracked Trains Endpoint
 * GET /api/train/tracked
 *
 * Returns list of trains currently being tracked by the system.
 * Data is resolved from live/schedule-backed train data service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrainData } from '@/services/trainDataService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const limitParam = Number(request.nextUrl.searchParams.get('limit') || 6);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(12, Math.floor(limitParam))) : 6;

    const configuredNumbers = (process.env.HOME_SNAPSHOT_TRAINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const requestNumbers = (request.nextUrl.searchParams.get('numbers') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const fallbackNumbers = ['12955', '12728', '17015', '12702', '11039'];
    const selectedNumbers = Array.from(
      new Set((requestNumbers.length ? requestNumbers : configuredNumbers.length ? configuredNumbers : fallbackNumbers))
    ).slice(0, limit);

    const resolved = await Promise.all(
      selectedNumbers.map(async (trainNumber) => {
        const data = await getTrainData(trainNumber);
        if (!data) return null;

        const currentIdx = Math.max(0, Math.min(data.currentStationIndex || 0, Math.max(data.scheduledStations.length - 1, 0)));
        const nextIdx = Math.min(currentIdx + 1, Math.max(data.scheduledStations.length - 1, 0));
        const currentStation = data.scheduledStations[currentIdx]?.name || data.currentStationCode || 'Unknown';
        const nextStation = data.scheduledStations[nextIdx]?.name || currentStation;
        const delayMinutes = Math.max(0, Number(data.delay || 0));
        const speedKmph = Math.max(0, Number(data.speed || 0));
        const statusText = String(data.status || '').toLowerCase();

        let status: TrackedTrain['status'] = 'moving';
        if (statusText.includes('halt') || speedKmph <= 2) {
          status = 'halted';
        } else if (statusText.includes('delay') || delayMinutes >= 8) {
          status = 'delayed';
        }

        const quality = Number(data.dataQuality || 0);
        const confidence = Number.isFinite(quality)
          ? Math.max(0.35, Math.min(0.99, quality / 100))
          : 0.7;

        return {
          number: data.trainNumber || trainNumber,
          name: data.trainName || `Train ${trainNumber}`,
          status,
          delayMinutes,
          currentStation,
          nextStation,
          speedKmph,
          confidence,
        } as TrackedTrain;
      })
    );

    const trackedTrains = resolved.filter((item): item is TrackedTrain => item !== null);

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        trains: trackedTrains,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=10',
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

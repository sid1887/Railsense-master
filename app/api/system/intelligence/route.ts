/**
 * Unified Intelligence Dashboard Endpoint
 * GET /api/system/intelligence?trainNumber=12955
 *
 * Returns all intelligence insights for a selected train
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchTrain } from '@/services/trainSearchOrchestrator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const trainNumber = request.nextUrl.searchParams.get('trainNumber') || '01211';

    const trainData = await searchTrain(trainNumber, false);

    if (!trainData) {
      return NextResponse.json({ error: 'Train not found' }, { status: 404 });
    }

    return NextResponse.json({
      train: {
        number: trainData.trainNumber,
        name: trainData.trainName,
        source: trainData.source,
        destination: trainData.destination,
      },
      liveStatus: {
        available: !trainData.liveUnavailable,
        currentStation: trainData.currentStation,
        nextStation: trainData.nextStation,
        delayMinutes: trainData.delayMinutes,
        speedKmph: trainData.currentSpeed || 0,
        latitude: trainData.location.lat,
        longitude: trainData.location.lng,
        timestamp: trainData.lastUpdated,
      },
      confidence: {
        prediction: trainData.predictionConfidence,
        mapping: trainData.mapConfidence,
        dataQuality: Math.min(95, Math.round(((trainData.predictionConfidence || 0.7) + (trainData.mapConfidence || 0.8)) / 2 * 100)),
      },
      modules: {
        realTimeTracking: {
          available: !trainData.liveUnavailable,
          confidence: trainData.mapConfidence,
          lastUpdate: trainData.lastUpdated,
        },
        delayPrediction: {
          available: true,
          currentDelay: trainData.delayMinutes,
          confidence: trainData.predictionConfidence,
        },
        haltDetection: {
          available: trainData.currentSpeed !== undefined,
          isHalted: trainData.currentSpeed === 0,
          speed: trainData.currentSpeed || 0,
        },
        networkIntelligence: {
          available: true,
          routeIndex: 0,
          totalStations: trainData.route?.length || 0,
        },
      },
      dataFreshness: {
        gpsAge: '< 5 minutes',
        scheduleAge: '> 24 hours',
        lastUpdate: new Date(trainData.lastUpdated).toLocaleTimeString(),
      },
    });
  } catch (error: any) {
    console.error('[Intelligence API]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch intelligence' },
      { status: 500 }
    );
  }
}

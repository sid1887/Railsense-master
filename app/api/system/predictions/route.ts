/**
 * PREDICTIONS API ENDPOINT
 *
 * GET /api/system/predictions?trainNumber=<number>
 *
 * Returns advanced predictions:
 * - Dwell time forecasts
 * - Crossing probability
 * - Platform occupancy prediction
 * - Delay propagation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIntelligenceInsight } from '@/services/ntesIntelligenceService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DwellPrediction {
  estimatedMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  confidence: number;
}

interface CrossingPrediction {
  probability: number;
  sections: number;
  confidence: number;
}

interface PlatformPrediction {
  occupancyPercentage: number;
  confidence: number;
  capacity: number;
  expectedPassengers: number;
}

interface PredictionResponse {
  trainNumber: string;
  dwellPrediction?: DwellPrediction;
  crossingPrediction?: CrossingPrediction;
  platformPrediction?: PlatformPrediction;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    const trainNumber = request.nextUrl.searchParams.get('trainNumber')?.trim();
    const stationCode = request.nextUrl.searchParams.get('stationCode')?.trim();

    if (!trainNumber) {
      return NextResponse.json(
        { error: 'trainNumber parameter required' },
        { status: 400 }
      );
    }

    const insight = await getIntelligenceInsight(trainNumber, stationCode);
    if (!insight) {
      return NextResponse.json({ error: 'Train intelligence unavailable' }, { status: 404 });
    }

    const network = insight.modules.networkIntelligence;
    const halt = insight.modules.haltAnalysis;
    const cascade = insight.modules.cascadeDetection;
    const station = insight.modules.stationLive;

    const dwellEstimate = Math.max(
      2,
      Math.round(insight.delay * 0.2 + network.congestionScore / 22 + (halt.detected ? 6 : 0))
    );
    const crossingProbability = Math.min(
      0.95,
      Math.max(0.05, network.congestionScore / 160 + (cascade.detected ? 0.22 : 0.08))
    );
    const platformOccupancy =
      station.totalActiveTrains > 0
        ? Math.min(100, Math.round((station.platformTrains.length / station.totalActiveTrains) * 100))
        : Math.min(100, Math.round(network.congestionScore * 0.6));

    const predictions: PredictionResponse = {
      trainNumber: trainNumber.toUpperCase(),
      dwellPrediction: {
        estimatedMinutes: dwellEstimate,
        minMinutes: Math.max(1, dwellEstimate - 4),
        maxMinutes: dwellEstimate + 8,
        confidence: Math.max(0.35, Math.min(0.97, insight.confidence / 100)),
      },
      crossingPrediction: {
        probability: Number(crossingProbability.toFixed(2)),
        sections: Math.max(1, Math.round(network.trainsBetween / 2) || 1),
        confidence: Math.max(0.3, Math.min(0.95, (insight.confidence - 6) / 100)),
      },
      platformPrediction: {
        occupancyPercentage: platformOccupancy,
        confidence: Math.max(0.3, Math.min(0.94, (insight.confidence - 8) / 100)),
        capacity: 2000,
        expectedPassengers: Math.round((platformOccupancy / 100) * 2000),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          ...predictions,
          summary: {
            speed: insight.speed,
            delay: insight.delay,
            expectedArrival: insight.expectedArrival,
            confidence: insight.confidence,
          },
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=15',
        },
      }
    );
  } catch (error) {
    console.error('[Predictions API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to compute predictions', details: String(error) },
      { status: 500 }
    );
  }
}

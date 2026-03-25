/**
 * Network Intelligence Endpoint
 * GET /api/system/network-intelligence?trainNumber=12955
 *
 * Analyzes train in context of broader network
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedTrainData } from '@/services/trainOrchestratorService';
import { getIntelligenceInsight } from '@/services/ntesIntelligenceService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const trainNumber = request.nextUrl.searchParams.get('trainNumber')?.trim() || '';
    if (!trainNumber) {
      return NextResponse.json({ error: 'trainNumber is required' }, { status: 400 });
    }

    const [unified, insight] = await Promise.all([
      getUnifiedTrainData(trainNumber),
      getIntelligenceInsight(trainNumber),
    ]);

    if (!unified) {
      return NextResponse.json({ error: 'Train not found' }, { status: 404 });
    }

    const nearby = unified.networkIntelligence.nearbyTrains || [];

    return NextResponse.json(
      {
        success: true,
        data: {
          train: {
            number: unified.trainNumber,
            name: unified.trainName,
            source: unified.route.source,
            destination: unified.route.destination,
          },
          networkPosition: {
            currentStation: unified.currentLocation.station,
            route: {
              totalStations: unified.route.totalStations,
              completedStations: unified.route.currentStationIndex,
              upcomingStations: Math.max(0, unified.route.totalStations - unified.route.currentStationIndex - 1),
            },
          },
          nearbyTrains: {
            onSameRoute: nearby.filter((item) => item.sameTrack).length,
            onIntersectingRoutes: nearby.filter((item) => !item.sameTrack && item.direction === 'crossing').length,
            nearbyInNetwork: nearby.length,
            trains: nearby,
          },
          segmentPressure: {
            from: insight?.modules?.trainsBetween?.fromStationCode || null,
            to: insight?.modules?.trainsBetween?.toStationCode || null,
            trainsBetween: insight?.modules?.trainsBetween?.totalTrains || 0,
            source: insight?.modules?.trainsBetween?.source || 'unavailable',
          },
          congestionAnalysis: {
            level: insight?.modules?.networkIntelligence?.sectionLoad || unified.networkIntelligence.congestionLevel,
            score: insight?.modules?.networkIntelligence?.congestionScore || unified.networkIntelligence.congestionScore,
          },
          risk: unified.crossingRisk,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=15',
        },
      }
    );
  } catch (error: any) {
    console.error('[NetworkIntelligence API]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch network intel' },
      { status: 500 }
    );
  }
}

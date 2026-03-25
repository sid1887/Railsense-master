/**
 * API Route: /api/train-details
 * Returns UNIFIED train data with all intelligence features
 *
 * Response: UnifiedTrainResponse (canonical format)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedTrainData } from '@/services/trainOrchestratorService';
import snapshotDatabase from '@/services/snapshotDatabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const trainNumber = request.nextUrl.searchParams.get('trainNumber');

  try {
    if (!trainNumber) {
      return NextResponse.json(
        { error: 'Train number is required' },
        { status: 400 }
      );
    }

    // Fetch unified data
    const unifiedData = await getUnifiedTrainData(trainNumber);

    if (!unifiedData) {
      return NextResponse.json(
        { error: `Train ${trainNumber} not found` },
        { status: 404 }
      );
    }

    // Non-blocking persistence for historical analytics and provider observability.
    (async () => {
      try {
        const liveSource = unifiedData.dataQuality.sources.find((source) =>
          source.startsWith('live-') || source.startsWith('stale-live-')
        ) || 'none';
        const hasVerifiedLive = unifiedData.dataQuality.liveGPS && !unifiedData.dataQuality.liveUnavailable;

        await snapshotDatabase.initialize();
        await snapshotDatabase.saveSnapshot({
          trainNumber: unifiedData.trainNumber,
          stationCode: unifiedData.currentLocation.stationCode || 'UNKNOWN',
          stationName: unifiedData.currentLocation.station || 'Unknown',
          latitude: unifiedData.currentLocation.latitude,
          longitude: unifiedData.currentLocation.longitude,
          speed: unifiedData.liveMetrics.speed,
          delay: unifiedData.liveMetrics.delay,
          status: unifiedData.liveMetrics.status === 'halted' ? 'halted' : unifiedData.liveMetrics.status === 'delayed' ? 'stopped' : 'running',
          timestamp: new Date(unifiedData.lastUpdated).toISOString(),
        });

        await snapshotDatabase.logDataQuality({
          trainNumber: unifiedData.trainNumber,
          provider: liveSource,
          isSuccessful: hasVerifiedLive,
          dataQualityScore: hasVerifiedLive ? 90 : 55,
          isSynthetic: !hasVerifiedLive,
          cacheHit: false,
        });
      } catch (persistError) {
        console.warn('[API] train-details persistence warning:', persistError);
      }
    })();

    const response = NextResponse.json(unifiedData);

    // Set cache headers for 15-second refresh
    response.headers.set('Cache-Control', 'public, max-age=15');

    return response;
  } catch (error: any) {
    console.error('[API] /train-details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch train details' },
      { status: 500 }
    );
  }
}

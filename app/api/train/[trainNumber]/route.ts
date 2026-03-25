import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedTrainData } from '@/services/trainOrchestratorService';
import snapshotDatabase from '@/services/snapshotDatabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TrainDataResponse {
  trainNumber: string;
  trainName: string;
  source: string;
  destination: string;
  route: Array<{
    code: string;
    name: string;
    arrivalTime: string;
    departureTime: string;
    status: 'completed' | 'current' | 'upcoming';
    platformNumber?: string;
    distance?: number;
  }>;
  currentStationCode: string;
  currentStationName: string;
  nextStationCode: string;
  nextStationName: string;
  status?: 'approaching' | 'at-station' | 'departed' | 'completed' | 'unknown';
  progress?: number;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  location?: {
    lat: number;
    lng: number;
  };
  speedKmph: number;
  delayMinutes: number;
  timestamp: string;
  liveAvailable: boolean;
  liveProvider?: string;
  predictionConfidence: number;
  mapConfidence: number;
  dataQuality: number;
  safetyConfidence: number;
  quality?: {
    staticDataQuality: number;
    liveDataQuality: number;
    predictionConfidence: number;
    mapConfidence: number;
    liveAvailable: boolean;
  };
  intelligence?: {
    delayRisk?: number;
    networkImpact?: number;
    safetyRisk?: number;
    explainabilityScore?: number;
    activeAlertsCount?: number;
  };
}

interface Params {
  params: Promise<{
    trainNumber: string;
  }>;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export async function GET(
  _request: NextRequest,
  { params }: Params
): Promise<NextResponse<TrainDataResponse | { error: string; trainNumber: string }>> {
  let trainNumber = '';

  try {
    const { trainNumber: rawTrainNumber } = await params;
    trainNumber = rawTrainNumber.trim();
    const unified = await getUnifiedTrainData(trainNumber);

    if (!unified) {
      return NextResponse.json(
        {
          error: `Train ${trainNumber} not found in real data sources`,
          trainNumber,
        },
        { status: 404 }
      );
    }

    const totalStations = unified.route.allStations.length;
    const currentIndex = Math.max(0, Math.min(unified.route.currentStationIndex, Math.max(totalStations - 1, 0)));
    const nextIndex = Math.min(currentIndex + 1, Math.max(totalStations - 1, 0));
    const liveAvailable = unified.dataQuality.liveGPS && !unified.dataQuality.liveUnavailable;

    const route: TrainDataResponse['route'] = unified.route.allStations.map((stop, index) => ({
      code: stop.code || '',
      name: stop.name || '',
      arrivalTime: stop.estimatedArrival || stop.scheduledArrival || '',
      departureTime: stop.estimatedDeparture || stop.scheduledDeparture || '',
      status: (index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming') as 'completed' | 'current' | 'upcoming',
    }));

    const progress = totalStations > 1
      ? Number(((currentIndex / (totalStations - 1)) * 100).toFixed(2))
      : 0;

    const currentStation = unified.route.allStations[currentIndex];
    const nextStation = unified.route.allStations[nextIndex];

    const liveProvider = unified.dataQuality.sources.find((source) =>
      source.startsWith('live-') || source.startsWith('stale-live-') || source === 'estimated-fallback'
    ) || 'none';

    const predictionConfidence = clamp01(unified.prediction.confidence);
    const staticQuality = unified.dataQuality.stationMapping ? 0.88 : 0.65;
    const liveQuality = liveAvailable ? 0.9 : 0.15;
    const mapConfidence = clamp01(
      unified.route.allStations.length > 1 && unified.currentLocation.latitude !== 0 && unified.currentLocation.longitude !== 0
        ? 0.92
        : 0.4
    );
    const compositeDataQuality = clamp01((staticQuality * 0.45) + (liveQuality * 0.4) + (predictionConfidence * 0.15));

    const response: TrainDataResponse = {
      trainNumber: unified.trainNumber,
      trainName: unified.trainName,
      source: unified.route.source,
      destination: unified.route.destination,
      route,
      currentStationCode: currentStation?.code || unified.currentLocation.stationCode || '',
      currentStationName: currentStation?.name || unified.currentLocation.station || '',
      nextStationCode: nextStation?.code || unified.nextStation.stationCode || '',
      nextStationName: nextStation?.name || unified.nextStation.station || '',
      status:
        unified.liveMetrics.status === 'halted'
          ? 'at-station'
          : unified.liveMetrics.status === 'running' || unified.liveMetrics.status === 'on-time'
            ? 'departed'
            : 'unknown',
      progress,
      lat: unified.currentLocation.latitude,
      lng: unified.currentLocation.longitude,
      latitude: unified.currentLocation.latitude,
      longitude: unified.currentLocation.longitude,
      location: {
        lat: unified.currentLocation.latitude,
        lng: unified.currentLocation.longitude,
      },
      speedKmph: liveAvailable ? unified.liveMetrics.speed : 0,
      delayMinutes: unified.liveMetrics.delay,
      timestamp: new Date(unified.lastUpdated).toISOString(),
      liveAvailable,
      liveProvider,
      predictionConfidence,
      mapConfidence,
      dataQuality: compositeDataQuality,
      safetyConfidence: clamp01(1 - (unified.crossingRisk.riskLevel === 'critical' ? 0.7 : unified.crossingRisk.riskLevel === 'high' ? 0.45 : unified.crossingRisk.riskLevel === 'medium' ? 0.25 : 0.1)),
      quality: {
        staticDataQuality: staticQuality,
        liveDataQuality: liveQuality,
        predictionConfidence,
        mapConfidence,
        liveAvailable,
      },
      intelligence: {
        delayRisk: Math.min(100, Math.round(unified.liveMetrics.delay * 3.2)),
        networkImpact: Math.min(100, Math.round(unified.networkIntelligence.congestionScore)),
        safetyRisk: unified.crossingRisk.riskLevel === 'critical' ? 90 : unified.crossingRisk.riskLevel === 'high' ? 70 : unified.crossingRisk.riskLevel === 'medium' ? 45 : 20,
        explainabilityScore: Math.round(predictionConfidence * 100),
        activeAlertsCount:
          (unified.crossingRisk.riskLevel === 'critical' ? 2 : 0) +
          (unified.liveMetrics.delay > 20 ? 1 : 0) +
          (unified.networkIntelligence.congestionScore > 70 ? 1 : 0),
      },
    };

    // Non-blocking persistence for observability and historical analytics.
    (async () => {
      try {
        await snapshotDatabase.initialize();
        await snapshotDatabase.saveSnapshot({
          trainNumber: unified.trainNumber,
          stationCode: response.currentStationCode || 'UNKNOWN',
          stationName: response.currentStationName || 'Unknown',
          latitude: unified.currentLocation.latitude,
          longitude: unified.currentLocation.longitude,
          speed: unified.liveMetrics.speed,
          delay: unified.liveMetrics.delay,
          status: unified.liveMetrics.status === 'halted' ? 'halted' : unified.liveMetrics.status === 'delayed' ? 'stopped' : 'running',
          timestamp: new Date(unified.lastUpdated).toISOString(),
        });

        await snapshotDatabase.logDataQuality({
          trainNumber: unified.trainNumber,
          provider: liveProvider,
          isSuccessful: liveAvailable,
          dataQualityScore: Math.round(compositeDataQuality * 100),
          isSynthetic: !liveAvailable,
          cacheHit: false,
        });
      } catch (persistError) {
        console.warn('[API] train endpoint persistence warning:', persistError);
      }
    })();

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=15',
      },
    });
  } catch (error: any) {
    console.error('[API] Train search error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Train not found',
        trainNumber,
      },
      { status: 404 }
    );
  }
}
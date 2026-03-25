/**
 * Dynamic Train Search Endpoint
 *
 * GET /api/train/:trainNumber
 *
 * Returns unified train data contract:
 * - identity (trainNumber, trainName, source, destination)
 * - route with stop details
 * - current live position (if available)
 * - confidence metrics
 * - data quality flags
 *
 * Query Parameters:
 * - refresh=1: Force refresh from scraper
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchTrain } from '@/services/trainSearchOrchestrator';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse<TrainDataResponse | { error: string; trainNumber: string }>> {
  let trainNumber = '';
  try {
    const { trainNumber: rawTrainNumber } = await params;
    trainNumber = rawTrainNumber.trim();
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';

    console.log(
      `[API] Train search request: ${trainNumber} (refresh=${forceRefresh})`
    );

    // Execute complete search pipeline
    const result = await searchTrain(trainNumber, forceRefresh);

    // Normalize response to unified contract
    const resultAny = result as any;
    const response: TrainDataResponse = {
      trainNumber: resultAny.trainNumber || trainNumber,
      trainName: resultAny.trainName || 'Unknown Train',
      source: resultAny.source || resultAny.sourceCode || '',
      destination: resultAny.destination || resultAny.destinationCode || '',
      route: (resultAny.route || resultAny.scheduledStations || []).map((stop: any) => ({
        code: stop.code || stop.stationCode || '',
        name: stop.name || stop.station || '',
        arrivalTime: stop.arrivalTime || stop.estimatedArrival || stop.scheduledArrival || '',
        departureTime: stop.departureTime || stop.estimatedDeparture || stop.scheduledDeparture || '',
        status: stop.status || 'upcoming',
        platformNumber: stop.platformNumber || stop.platform,
        distance: stop.distance || stop.km,
        latitude: typeof stop.latitude === 'number' ? stop.latitude : undefined,
        longitude: typeof stop.longitude === 'number' ? stop.longitude : undefined,
      })),
      currentStationCode: resultAny.currentStationCode || resultAny.currentStation || '',
      currentStationName: resultAny.currentStation || resultAny.currentStationName || '',
      nextStationCode: resultAny.nextStationCode || '',
      nextStationName: resultAny.nextStationName || '',
      status: resultAny.status || 'unknown',
      progress: typeof resultAny.progress === 'number' ? resultAny.progress : 0,
      lat: resultAny.latitude || resultAny.lat || 0,
      lng: resultAny.longitude || resultAny.lng || 0,
      latitude: resultAny.latitude || resultAny.lat || 0,
      longitude: resultAny.longitude || resultAny.lng || 0,
      location: {
        lat: resultAny.latitude || resultAny.lat || 0,
        lng: resultAny.longitude || resultAny.lng || 0,
      },
      speedKmph: resultAny.speed || resultAny.speedKmph || 0,
      delayMinutes: resultAny.delay || resultAny.delayMinutes || 0,
      timestamp: resultAny.timestamp || new Date().toISOString(),
      liveAvailable: resultAny.liveAvailable !== false,
      liveProvider: resultAny.source || 'unknown',
      predictionConfidence: resultAny.confidence?.prediction || resultAny.predictionConfidence || 0.75,
      mapConfidence: resultAny.confidence?.map || resultAny.mapConfidence || 0.85,
      dataQuality: resultAny.confidence?.data || resultAny.dataQuality || 0.8,
      safetyConfidence: resultAny.confidence?.safety || resultAny.safetyConfidence || 0.7,
      quality: {
        staticDataQuality: resultAny.staticDataQuality || 0.9,
        liveDataQuality: resultAny.liveAvailable ? 0.85 : 0,
        predictionConfidence: resultAny.confidence?.prediction || 0.75,
        mapConfidence: resultAny.confidence?.map || 0.85,
        liveAvailable: resultAny.liveAvailable || false,
      },
      intelligence: {
        delayRisk: resultAny.delayRisk || (resultAny.delay > 15 ? 75 : resultAny.delay > 5 ? 50 : 25),
        networkImpact: resultAny.networkImpact || 50,
        safetyRisk: resultAny.safetyRisk || 30,
        explainabilityScore: resultAny.explainability?.score || 0.7,
        activeAlertsCount: resultAny.alerts?.length || 0,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error: any) {
    console.error('[API] Train search error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Train not found',
        trainNumber: trainNumber,
      },
      { status: 404 }
    );
  }
}

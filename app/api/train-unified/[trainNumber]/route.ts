/**
 * Unified Train Data API
 * Combines static timetable, live position, mapping, and ETA prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStaticTrain, getTrainRoute } from '@/services/staticRailwayDatabase';
import { getLiveTrainData } from '@/services/liveTrainDataService';
import { mapTrainPosition } from '@/services/trainPositionMappingService';
import { predictETA } from '@/services/etaPredictionEngine';

export const dynamic = 'force-dynamic';

interface TrainDataResponse {
  trainNumber: string;
  trainName: string;
  staticData: {
    source: string;
    destination: string;
    route: any[];
  };
  liveData?: {
    speed: number;
    delayMinutes: number;
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  positionMapping?: {
    nearestStation: string;
    status: string;
    progress: number;
  };
  etaPrediction?: {
    nextStation: string;
    predictedArrival: string;
    delayForecast: number;
  };
  lastUpdated: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trainNumber: string }> }
) {
  try {
    const { trainNumber } = await params;
    const includeLive = request.nextUrl.searchParams.get('live') === '1';

    // Get static data
    const staticTrain = await getStaticTrain(trainNumber);
    if (!staticTrain) {
      return NextResponse.json(
        { error: `Train ${trainNumber} not found` },
        { status: 404 }
      );
    }

    const routeData = await getTrainRoute(trainNumber);

    const response: TrainDataResponse = {
      trainNumber,
      trainName: staticTrain.trainName,
      staticData: {
        source: staticTrain.source,
        destination: staticTrain.destination,
        route: routeData?.route || [],
      },
      lastUpdated: new Date().toISOString(),
    };

    // Get live data if requested
    if (includeLive) {
      const liveData = await getLiveTrainData(trainNumber);
      if (liveData) {
        response.liveData = {
          speed: liveData.speed,
          delayMinutes: liveData.delayMinutes,
          latitude: liveData.latitude,
          longitude: liveData.longitude,
          timestamp: liveData.timestamp,
        };

        // Map position to route
        const positionMapping = await mapTrainPosition(
          trainNumber,
          liveData.latitude,
          liveData.longitude
        );

        if (positionMapping) {
          response.positionMapping = {
            nearestStation: positionMapping.nearestStation.name,
            status: positionMapping.status,
            progress: positionMapping.progress,
          };

          // Predict ETA
          const etaPrediction = await predictETA(
            trainNumber,
            liveData,
            positionMapping
          );

          if (etaPrediction) {
            response.etaPrediction = {
              nextStation: etaPrediction.nextStation.name,
              predictedArrival: etaPrediction.nextStation.predictedArrival,
              delayForecast: etaPrediction.nextStation.delayForecast,
            };
          }
        }
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in unified train API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

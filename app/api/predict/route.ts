/**
 * API Route: /api/predict
 * Multi-purpose prediction API for:
 * 1. Halt duration prediction (ML-based)
 * 2. Train delay/ETA prediction (heuristic + historical)
 *
 * Query params for halt: region, hour, latitude, longitude, month (optional)
 * Query params for train ETA: train (train number)
 */

import { NextRequest, NextResponse } from 'next/server';
import { predictHaltDuration, getModelStatus } from '@/services/mlPredictor';
import { predictFinalDelay, generateDelayActions } from '@/services/predictionEngine';
import { logger } from '@/services/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if this is a train delay prediction or halt prediction
    const trainNumber = request.nextUrl.searchParams.get('train');

    if (trainNumber) {
      // Train ETA/Delay prediction endpoint
      return handleTrainPrediction(trainNumber, request);
    }

    // Otherwise, handle halt duration prediction
    return handleHaltPrediction(request);
  } catch (error: any) {
    logger.error('[API] Prediction error:', { error: String(error) });

    return NextResponse.json(
      {
        error: error.message || 'Prediction failed',
        predicted_delay_min: null,
        confidence: 0,
        method: 'error',
      },
      { status: 200 } // Return 200 to not break UI
    );
  }
}

/**
 * Handle train delay/ETA prediction
 */
async function handleTrainPrediction(trainNumber: string, request: NextRequest): Promise<NextResponse> {
  try {
    // Try to get train data from trainDataService first
    let trainData: any = null;
    try {
      const { getTrainData } = require('@/services/trainDataService');
      trainData = await getTrainData(trainNumber);
    } catch (e) {
      console.log('[API/Predict] trainDataService not available, trying searchTrain');
    }

    // If not found, try the train search orchestrator (which has knowledge base)
    if (!trainData) {
      try {
        const { searchTrain } = require('@/services/trainSearchOrchestrator');
        trainData = await searchTrain(trainNumber);
      } catch (e) {
        console.log('[API/Predict] searchTrain failed:', e);
      }
    }

    if (!trainData) {
      console.log(`[API/Predict] Train ${trainNumber} not found in any source`);
      return NextResponse.json(
        {
          error: `Train ${trainNumber} not found`,
          trainNumber,
          method: 'error',
          predicted_delay_min: null,
          confidence: 0,
        },
        { status: 404 }
      );
    }

    console.log(`[API/Predict] Found train data: ${trainData.trainName || trainNumber}`);

    // Prepare prediction input
    const routeLength = trainData.route?.length || 10;
    const delayTrend = [
      (trainData.delayMinutes || 0) * 0.8,
      trainData.delayMinutes || 0,
    ].filter((d: any) => typeof d === 'number' && !isNaN(d));

    const predictionInput = {
      trainNumber,
      currentDelay: trainData.delayMinutes || 0,
      currentSpeed: 60, // Default train speed
      distanceToDestination: 500, // km estimate
      stationsRemaining: Math.max(1, Math.floor(routeLength / 2)),
      recentDelayTrend: delayTrend,
      haltIndicators: trainData.status === 'Halted' ? 1 : 0,
      nearbyTrainCount: 0,
      currentHour: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
    };

    // Get prediction from ML engine or use heuristic
    let finalDelay = trainData.delayMinutes || 0;
    let confidence = 0.65;
    let method = 'heuristic';

    try {
      const { predictFinalDelay } = require('@/services/predictionEngine');
      const prediction = await predictFinalDelay(predictionInput);
      if (prediction) {
        finalDelay = prediction.predicted_delay_minutes || finalDelay;
        confidence = prediction.confidence || 0.65;
        method = 'engine';
      }
    } catch (e) {
      console.log('[API/Predict] Prediction engine error, using current delay');
    }

    // Calculate ETA based on final delay
    const now = new Date();
    const eta = new Date(now.getTime() + Math.max(0, finalDelay * 60000)).toISOString();

    // Determine risk level based on delay
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (Math.abs(finalDelay) > 60) riskLevel = 'critical';
    else if (Math.abs(finalDelay) > 30) riskLevel = 'high';
    else if (Math.abs(finalDelay) > 10) riskLevel = 'medium';

    console.log(`[API/Predict] Prediction: current=${trainData.delayMinutes}m, final=${finalDelay}m, risk=${riskLevel}`);

    // Return in format expected by ETAForecastCard component
    return NextResponse.json(
      {
        train: {
          trainNumber,
          trainName: trainData.trainName || `Train ${trainNumber}`,
        },
        currentStatus: {
          speed: 60, // Default train speed
          currentDelay: trainData.delayMinutes || 0,
          distanceToDestination: (routeLength * 50), // Rough estimate: 50km per stop
          stationsRemaining: Math.max(0, routeLength - 1),
        },
        prediction: {
          forecastDelay: Math.round(finalDelay),
          confidence,
          eta,
          method: method as 'heuristic' | 'historical' | 'ml',
          riskLevel,
        },
        analysis: {
          factors: [
            {
              name: 'Current Delay',
              impact: trainData.delayMinutes || 0,
              direction: (trainData.delayMinutes || 0) > 0 ? 'negative' : 'positive',
            },
            {
              name: 'Distance to Destination',
              impact: Math.round((routeLength * 50) / 60), // Time in minutes
              direction: 'neutral' as const,
            },
            {
              name: 'Delay Propagation',
              impact: Math.round(finalDelay - (trainData.delayMinutes || 0)),
              direction: 'negative' as const,
            },
          ],
          alertLevel: riskLevel === 'critical' ? 'ALERT' :
                     riskLevel === 'high' ? 'WARNING' :
                     riskLevel === 'medium' ? 'CAUTION' : 'OK',
        },
        recommendations: [
          trainData.delayMinutes && trainData.delayMinutes > 0 ? '⚠️ Train is running behind schedule' : '✅ Train is on time',
          `Estimated final delay: ${Math.round(finalDelay)} minutes`,
          finalDelay > 15 ? '📞 Consider informing passengers' : '✓ Monitor progress',
        ],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API/Predict] Train prediction error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Prediction failed',
        predicted_delay_min: null,
        confidence: 0,
        method: 'error',
      },
      { status: 200 }
    );
  }
}

/**
 * Handle halt duration prediction (original ML-based)
 */
async function handleHaltPrediction(request: NextRequest): Promise<NextResponse> {
  const region = request.nextUrl.searchParams.get('region') || 'Centre';
  const hourStr = request.nextUrl.searchParams.get('hour');
  const latStr = request.nextUrl.searchParams.get('latitude');
  const lngStr = request.nextUrl.searchParams.get('longitude');
  const monthStr = request.nextUrl.searchParams.get('month');

  // Validate input
  if (!hourStr || !latStr || !lngStr) {
    return NextResponse.json(
      { error: 'Missing required params: hour, latitude, longitude' },
      { status: 400 }
    );
  }

  const hour = parseInt(hourStr);
  const latitude = parseFloat(latStr);
  const longitude = parseFloat(lngStr);
  const month = monthStr ? parseInt(monthStr) : undefined;

  // Validate ranges
  if (isNaN(hour) || hour < 0 || hour > 23) {
    return NextResponse.json(
      { error: 'hour must be 0-23' },
      { status: 400 }
    );
  }

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: 'latitude and longitude must be numbers' },
      { status: 400 }
    );
  }

  console.log('[API] Halt prediction request:', {
    region,
    hour,
    latitude,
    longitude,
    month,
  });

  // Make prediction using ML predictor
  try {
    const { predictHaltDuration, getModelStatus } = require('@/services/mlPredictor');
    const result = await predictHaltDuration({
      region,
      hour,
      latitude,
      longitude,
      month,
    });

    const response = NextResponse.json({
      ...result,
      model_status: getModelStatus(),
      query: { region, hour, latitude, longitude, month },
    });

    // Cache for 10 minutes
    response.headers.set('Cache-Control', 'public, max-age=600');
    return response;
  } catch (error: any) {
    console.error('[API] Halt prediction error:', error);
    return NextResponse.json(
      { error: 'Halt prediction unavailable', details: String(error) },
      { status: 500 }
    );
  }
}

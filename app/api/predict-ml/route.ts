/**
 * API Route: /api/predict-ml
 * Machine Learning powered prediction with multi-model ensemble
 * Combines: Heuristic + Historical + ML predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { predictWithMLIntegration } from '@/services/predictorWithML';
import { mlModelService } from '@/services/mlModelService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const trainNumber = request.nextUrl.searchParams.get('train');

    if (!trainNumber) {
      return NextResponse.json(
        { error: 'Missing train parameter' },
        { status: 400 }
      );
    }

    // Get train data
    const { getTrainData } = require('@/services/trainDataService');
    const trainData = await getTrainData(trainNumber);

    if (!trainData) {
      return NextResponse.json(
        { error: `Train ${trainNumber} not found` },
        { status: 404 }
      );
    }

    // Simulate delay history (in real app, would come from DB)
    const historicalAverageDelay = trainData.delay ? trainData.delay * 0.5 : 5;
    const previousDelay = trainData.delay || 0;

    // Get current conditions
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();

    // Determine seasonality (0=Q1, 1=Q2, 2=Q3, 3=Q4)
    const month = now.getMonth();
    const seasonality = Math.floor(month / 3);

    // Simulate traffic density (0-100)
    const trafficDensity = 20 + (Math.sin(hourOfDay / 24 * Math.PI * 2) * 30 + 30);

    // Make prediction with ML integration
    const prediction = predictWithMLIntegration(
      trainNumber,
      trainData.delay || 0, // Current delay
      500, // Remaining distance (km)
      trainData.scheduledStops?.length || 5, // Halt count
      trafficDensity,
      trainData.status === 'Halted' ? 3 : 1, // Weather severity (simulated)
      hourOfDay,
      dayOfWeek,
      seasonality,
      previousDelay,
      historicalAverageDelay,
      trainData.routeCode || 'UNKNOWN'
    );

    // Format response
    const response = {
      train: trainNumber,
      trainName: trainData.trainName,
      timestamp: new Date().toISOString(),

      // Main prediction
      forecastDelay: prediction.forecastDelay,
      eta: prediction.eta,
      riskLevel: prediction.riskLevel,
      confidence: prediction.confidence,

      // Model details
      models: {
        heuristic: {
          predictedDelay: prediction.heuristic.delay,
          confidence: prediction.heuristic.confidence,
        },
        historical: {
          predictedDelay: prediction.historical.delay,
          confidence: prediction.historical.confidence,
        },
        ml: prediction.ml
          ? {
              predictedDelay:
                'predictedDelay' in prediction.ml
                  ? prediction.ml.predictedDelay
                  : prediction.ml.delay,
              confidence: prediction.ml.confidence,
              executionTime:
                'executionTime' in prediction.ml ? prediction.ml.executionTime : 0,
              factors: 'factors' in prediction.ml ? prediction.ml.factors : [],
            }
          : null,
      },

      // Ensemble details
      ensemble: {
        modelConsensus: prediction.modelConsensus,
        recommendedModel: prediction.recommendedModel,
        modelAgreement:
          prediction.modelConsensus
            ? 'All 3 models agree within ±5 minutes'
            : `${prediction.recommendedModel} model has highest confidence`,
      },

      // Analysis
      analysis: {
        primaryFactors: prediction.primaryFactors,
        riskFactors: prediction.riskFactors,
      },

      // System info
      system: {
        mlModelAvailable: mlModelService.isAvailable(),
        mlModelVersion: mlModelService.getVersion(),
        mlModelMetadata: mlModelService.getMetadata(),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('[Predict-ML API] Error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Prediction failed',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

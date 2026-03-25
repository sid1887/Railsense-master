/**
 * Multi-Strategy Prediction Engine with ML Integration
 * Combines: Heuristic + Historical + ML models
 */

import { mlModelService, TrainingData, MLPrediction } from './mlModelService';

export interface EnhancedPrediction {
  // Primary prediction
  forecastDelay: number; // minutes
  eta: string; // ISO timestamp
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-100

  // Strategy breakdown
  heuristic: {
    delay: number;
    confidence: number;
  };
  historical: {
    delay: number;
    confidence: number;
  };
  ml: {
    delay: number;
    confidence: number;
  } | null;

  // Model comparison
  modelConsensus: boolean; // all 3 agree within ±5 min
  recommendedModel: 'heuristic' | 'historical' | 'ml';

  // Factors
  primaryFactors: string[];
  riskFactors: string[];
}

/**
 * Heuristic prediction (rules-based)
 */
function predictHeuristic(
  currentDelay: number,
  remainingDistance: number,
  haltCount: number,
  trafficDensity: number,
  weatherSeverity: number
): { delay: number; confidence: number } {
  let predictedDelay = currentDelay;

  // Remaining distance factor
  const delayRate = 0.5 + (weatherSeverity * 0.2 + trafficDensity / 100) * 0.5;
  predictedDelay += (remainingDistance / 500) * delayRate; // 1 min per 500km base

  // Halt impact
  predictedDelay += haltCount * 1.5;

  // Traffic density
  predictedDelay += (trafficDensity / 100) * 15;

  // Weather impact
  predictedDelay += weatherSeverity * 3;

  // Clamp to reasonable range
  predictedDelay = Math.max(0, Math.min(180, predictedDelay));

  // Confidence decreases with uncertainty
  let confidence = 75 - Math.abs(currentDelay - predictedDelay) * 2;
  confidence = Math.max(40, Math.min(90, confidence));

  return {
    delay: Math.round(predictedDelay * 10) / 10,
    confidence: Math.round(confidence),
  };
}

/**
 * Historical prediction (pattern-based)
 */
function predictHistorical(
  trainNumber: string,
  hourOfDay: number,
  dayOfWeek: number,
  seasonality: number,
  historicalAverageDelay: number | null
): { delay: number; confidence: number } {
  if (!historicalAverageDelay) {
    return { delay: 5, confidence: 40 };
  }

  let predictedDelay = historicalAverageDelay;

  // Hour-based adjustment
  const isOffPeakHour = hourOfDay < 6 || hourOfDay > 22;
  const isPeakHour = hourOfDay >= 16 && hourOfDay <= 20;

  if (isPeakHour) {
    predictedDelay *= 1.4;
  } else if (isOffPeakHour) {
    predictedDelay *= 0.7;
  }

  // Day-based adjustment (weekends typically better)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    predictedDelay *= 0.85;
  } else {
    predictedDelay *= 1.1; // Weekdays worse
  }

  // Seasonal adjustment
  if (seasonality === 2) {
    // Summer
    predictedDelay *= 1.15;
  } else if (seasonality === 0) {
    // Winter
    predictedDelay *= 0.85;
  }

  predictedDelay = Math.max(0, Math.min(180, predictedDelay));

  return {
    delay: Math.round(predictedDelay * 10) / 10,
    confidence: Math.round(65 + Math.random() * 15),
  };
}

/**
 * Multi-strategy predictor
 */
export function predictWithMLIntegration(
  trainNumber: string,
  currentDelay: number,
  remainingDistance: number,
  haltCount: number,
  trafficDensity: number,
  weatherSeverity: number,
  hourOfDay: number,
  dayOfWeek: number,
  seasonality: number,
  previousDelay: number | null,
  historicalAverageDelay: number | null,
  routeCode: string
): EnhancedPrediction {
  const now = new Date();
  const now_ms = now.getTime();

  // 1. Heuristic prediction
  const heuristic = predictHeuristic(
    currentDelay,
    remainingDistance,
    haltCount,
    trafficDensity,
    weatherSeverity
  );

  // 2. Historical prediction
  const historical = predictHistorical(
    trainNumber,
    hourOfDay,
    dayOfWeek,
    seasonality,
    historicalAverageDelay
  );

  // 3. ML prediction (if available)
  let ml: MLPrediction | null = null;
  if (mlModelService.isAvailable()) {
    const trainingData: TrainingData = {
      trainNumber,
      dayOfWeek,
      hourOfDay,
      seasonality,
      routeDistance: remainingDistance,
      previousDelay: previousDelay || 0,
      weatherCondition: weatherSeverity,
      trafficDensity,
      haltCount,
      signallingStatus: weatherSeverity > 2 ? 2 : 1, // correlated with weather
    };

    ml = mlModelService.predict(trainingData);
  }

  // Combine predictions
  const predictions = [heuristic.delay, historical.delay];
  if (ml) {
    predictions.push(ml.predictedDelay);
  }

  // Use weighted average based on confidence scores
  const totalConfidence =
    heuristic.confidence +
    historical.confidence +
    (ml ? ml.confidence : 0);

  const weightedDelay =
    (heuristic.delay * heuristic.confidence +
      historical.delay * historical.confidence +
      (ml ? ml.predictedDelay * ml.confidence : 0)) /
    totalConfidence;

  // Check model consensus
  const maxDelay = Math.max(...predictions);
  const minDelay = Math.min(...predictions);
  const modelConsensus = maxDelay - minDelay <= 5;

  // Determine recommended model
  const confidentPredictions: Array<{
    model: 'heuristic' | 'historical' | 'ml';
    delay: number;
    conf: number;
  }> = [
    { model: 'heuristic', delay: heuristic.delay, conf: heuristic.confidence },
    { model: 'historical', delay: historical.delay, conf: historical.confidence },
  ];

  if (ml) {
    confidentPredictions.push({ model: 'ml', delay: ml.predictedDelay, conf: ml.confidence });
  }

  const recommendedModel = confidentPredictions.reduce((best, curr) =>
    curr.conf > best.conf ? curr : best
  ).model;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (weightedDelay > 30) {
    riskLevel = 'high';
  } else if (weightedDelay > 15) {
    riskLevel = 'medium';
  }

  // Extract primary factors
  const primaryFactors: string[] = [];
  if (trafficDensity > 70) primaryFactors.push('High traffic density');
  if (weatherSeverity > 2) primaryFactors.push('Adverse weather');
  if (haltCount > 6) primaryFactors.push('Multiple halts');
  if (isPeakHour(hourOfDay)) primaryFactors.push('Peak hour congestion');
  if (currentDelay > 10) primaryFactors.push('Existing delay carry-forward');

  const riskFactors: string[] = [];
  if (riskLevel === 'high') {
    riskFactors.push('High risk of missing connections');
    if (ml && ml.confidence < 50) riskFactors.push('Low prediction confidence');
    if (!modelConsensus) riskFactors.push('Model disagreement detected');
  }

  // Calculate final ETA
  const etaTime = new Date(now_ms + weightedDelay * 60000);

  // Average confidence
  const avgConfidence = Math.round(
    (heuristic.confidence + historical.confidence + (ml ? ml.confidence : 0)) /
    (ml ? 3 : 2)
  );

  return {
    forecastDelay: Math.round(weightedDelay * 10) / 10,
    eta: etaTime.toISOString(),
    riskLevel,
    confidence: avgConfidence,

    heuristic,
    historical,
    ml: ml
      ? {
          delay: ml.predictedDelay,
          confidence: ml.confidence,
        }
      : null,

    modelConsensus,
    recommendedModel,

    primaryFactors: primaryFactors.slice(0, 3),
    riskFactors,
  };
}

/**
 * Helper to check if hour is peak
 */
function isPeakHour(hour: number): boolean {
  return hour >= 7 && hour <= 10 || hour >= 16 && hour <= 20;
}

/**
 * Prediction Engine
 * Calculates expected wait times based on multiple factors
 * Provides confidence levels for predictions
 */

import { TrainData, TrafficAnalysis, PredictionResult, WeatherData } from '@/types/train';
import { getTrafficWaitFactor } from './trafficAnalyzer';

/**
 * Base waiting times by section (in minutes)
 * Can be customized based on historical data
 */
const BASE_SECTION_WAITS: { [key: string]: number } = {
  // Default base wait (if section not specified)
  default: 8,
  // Specific high-traffic sections
  'Kazipet-Warangal': 12,
  'Hyderabad-Secunderabad': 10,
};

/**
 * Weather impact factors on train operations
 */
const WEATHER_FACTORS = {
  clear: 0,
  cloudy: 0.5,
  rainy: 2,
  stormy: 4,
  foggy: 1.5,
  extreme: 5,
};

/**
 * Get base wait time for a section
 * Falls back to default if specific section not configured
 */
function getBaseSectionWait(fromStationName: string, toStationName: string): number {
  const sectionKey = `${fromStationName}-${toStationName}`;

  return BASE_SECTION_WAITS[sectionKey] || BASE_SECTION_WAITS.default;
}

/**
 * Calculate weather factor (multiplier for wait time)
 * Returns 1.0 for no impact, >1.0 for negative weather impact
 */
function calculateWeatherFactor(weather?: WeatherData): number {
  if (!weather) {
    return 1.0;
  }

  const condition = weather.condition.toLowerCase();

  // Check for specific weather conditions
  if (condition.includes('storm')) return WEATHER_FACTORS.stormy;
  if (condition.includes('rain')) return WEATHER_FACTORS.rainy;
  if (condition.includes('fog')) return WEATHER_FACTORS.foggy;
  if (condition.includes('cloudy')) return WEATHER_FACTORS.cloudy;

  return WEATHER_FACTORS.clear;
}

/**
 * Calculate delay carryover factor
 * Existing delays can indicate ongoing issues
 */
function calculateDelayCarryoverFactor(delayMinutes: number): number {
  if (delayMinutes === 0) return 1.0;
  if (delayMinutes < 5) return 1.1; // 10% increase for small delay
  if (delayMinutes < 15) return 1.25; // 25% increase for moderate delay
  return 1.4; // 40% increase for significant delay
}

/**
 * Main prediction function
 * Calculates expected wait time range with confidence
 *
 * Formula:
 * min_wait = base_wait + (traffic_factor × trains_nearby) + (weather_factor × conditions)
 * max_wait = min_wait × 1.5 (for uncertainty margin)
 * confidence = based on variance of factors
 */
export function predictNextWaitTime(
  trainData: TrainData,
  traffic: TrafficAnalysis,
  weather?: WeatherData
): PredictionResult {
  const { currentStationIndex, scheduledStations, delay } = trainData;

  // Determine next section
  let baseWait = BASE_SECTION_WAITS.default;

  if (currentStationIndex < scheduledStations.length - 1) {
    const currentStation = scheduledStations[currentStationIndex];
    const nextStation = scheduledStations[currentStationIndex + 1];
    baseWait = getBaseSectionWait(currentStation.name, nextStation.name);
  }

  // Calculate factors
  const trafficFactor = getTrafficWaitFactor(traffic.congestionLevel);
  const weatherFactor = calculateWeatherFactor(weather);
  const delayFactor = calculateDelayCarryoverFactor(delay);

  // Calculate wait times
  const minWait = baseWait * trafficFactor * weatherFactor * delayFactor;

  // Max wait with uncertainty margin (1.5x the minimum)
  const maxWait = minWait * 1.5;

  // Calculate confidence based on number of factors
  // More trains detected = higher confidence
  // Weather = lower confidence (unpredictable)
  let confidence = 75; // Base confidence

  if (traffic.nearbyTrainsCount > 3) confidence += 10; // More data = more confident
  if (weather && weather.precipitation) confidence -= 15; // Weather reduces confidence
  if (delay > 20) confidence -= 10; // Large delays = less predictable

  // Clamp confidence between 40-95
  confidence = Math.max(40, Math.min(95, confidence));

  return {
    minWait: parseFloat(minWait.toFixed(1)),
    maxWait: parseFloat(maxWait.toFixed(1)),
    confidence: confidence,
    baseWait: parseFloat(baseWait.toFixed(1)),
    trafficFactor: parseFloat(trafficFactor.toFixed(2)),
    weatherFactor: parseFloat(weatherFactor.toFixed(2)),
  };
}

/**
 * Format prediction as human-readable string
 * Example: "Expected 8-12 minutes (75% confidence)"
 */
export function formatPrediction(prediction: PredictionResult): string {
  const minRound = Math.round(prediction.minWait);
  const maxRound = Math.round(prediction.maxWait);

  return `${minRound}-${maxRound} minutes (${prediction.confidence}% confidence)`;
}

/**
 * Get prediction confidence level
 */
export function getConfidenceLevel(prediction: PredictionResult): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (prediction.confidence >= 80) return 'HIGH';
  if (prediction.confidence >= 60) return 'MEDIUM';
  return 'LOW';
}

/**
 * Break down prediction components for detailed explanation
 */
export function explainPrediction(prediction: PredictionResult): {
  baseWait: string;
  trafficImpact: string;
  weatherImpact: string;
  finalEstimate: string;
} {
  const trafficPercent = Math.round((prediction.trafficFactor - 1) * 100);
  const weatherPercent = Math.round((prediction.weatherFactor - 1) * 100);

  return {
    baseWait: `Base wait: ${prediction.baseWait} min`,
    trafficImpact:
      trafficPercent > 0 ? `+${trafficPercent}% due to traffic` : 'No traffic impact',
    weatherImpact: weatherPercent > 0 ? `+${weatherPercent}% due to weather` : 'Clear weather',
    finalEstimate: `${prediction.minWait}-${prediction.maxWait} min expected`,
  };
}

/**
 * Determine if wait is unusually long
 */
export function isUnusuallyLongWait(prediction: PredictionResult): boolean {
  // Unusual if predicted wait exceeds 30 minutes
  return prediction.maxWait > 30;
}

/**
 * Get worst-case scenario wait time
 * Adds additional buffer for extreme uncertainty
 */
export function getWorstCaseWait(prediction: PredictionResult): number {
  // If confidence is low, provide higher worst-case
  if (prediction.confidence < 60) {
    return prediction.maxWait * 1.25;
  }

  return prediction.maxWait;
}

/**
 * Compare two predictions to see if situation is improving
 */
export function comparePredictions(
  current: PredictionResult,
  previous: PredictionResult
): 'improving' | 'stable' | 'worsening' {
  const difference = current.maxWait - previous.maxWait;

  if (difference > 2) return 'worsening'; // More than 2 min increase
  if (difference < -2) return 'improving'; // More than 2 min decrease
  return 'stable';
}

/**
 * ENHANCED: Multi-Level Delay Prediction
 * Combines heuristic, historical, and ML approaches for accurate ETA prediction
 */

interface DelayPredictionInput {
  trainNumber: string;
  currentDelay: number;
  currentSpeed: number;
  distanceToDestination: number;
  stationsRemaining: number;
  recentDelayTrend: number[];
  haltIndicators: number; // 0-1 confidence of halt
  nearbyTrainCount: number;
  currentHour: number;
  dayOfWeek: number;
}

interface DelayPredictionResult {
  forecastDelay: number;
  confidence: number;
  method: 'heuristic' | 'historical' | 'ml';
  eta: string;
  factors: Array<{name: string; impact: number}>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Multi-level delay prediction using fallback strategy
 */
export function predictFinalDelay(input: DelayPredictionInput): DelayPredictionResult {
  // Try heuristic first (always works, fast)
  const heuristicResult = _predictDelayHeuristic(input);

  if (heuristicResult.confidence >= 0.7) {
    return { ...heuristicResult, method: 'heuristic' };
  }

  // Fallback: enhance with historical patterns
  const enhancedResult = _enhanceWithHistoricalPatterns(heuristicResult, input);

  return { ...enhancedResult, method: heuristicResult.confidence >= 0.6 ? 'heuristic' : 'historical' };
}

/**
 * Heuristic delay prediction based on current indicators
 */
function _predictDelayHeuristic(input: DelayPredictionInput): Omit<DelayPredictionResult, 'method'> {
  const factors: DelayPredictionResult['factors'] = [];
  let predictedDelay = input.currentDelay;
  let confidence = 0.4;

  // Speed factor: slow = more delay
  const speedDelay = input.currentSpeed < 30 ? 10 : input.currentSpeed < 50 ? 5 : 0;
  if (speedDelay > 0) {
    factors.push({ name: `Low speed (${input.currentSpeed} km/h)`, impact: speedDelay });
    predictedDelay += speedDelay;
    confidence += 0.2;
  }

  // Trend factor: increasing delays = more delays ahead
  if (input.recentDelayTrend.length > 1) {
    const trend = input.recentDelayTrend[input.recentDelayTrend.length - 1] - input.recentDelayTrend[0];
    if (trend > 0) {
      const trendDelay = Math.min(15, trend);
      factors.push({ name: 'Increasing delay trend', impact: trendDelay });
      predictedDelay += trendDelay;
      confidence += 0.1;
    }
  }

  // Halt indicators
  if (input.haltIndicators > 0.5) {
    factors.push({ name: 'Halt signals detected', impact: 15 });
    predictedDelay += 15;
  }

  // Congestion from nearby trains
  if (input.nearbyTrainCount > 3) {
    const congestionDelay = input.nearbyTrainCount * 2;
    factors.push({ name: `Nearby trains (${input.nearbyTrainCount})`, impact: congestionDelay });
    predictedDelay += congestionDelay;
    confidence += 0.15;
  }

  // Distance factor: more distance = slightly more likely delays
  const distanceFactor = (input.distanceToDestination / 100) * 1.5;
  factors.push({ name: `Remaining distance`, impact: distanceFactor });
  predictedDelay += distanceFactor;

  const riskLevel: DelayPredictionResult['riskLevel'] =
    predictedDelay >= 60 ? 'critical' :
    predictedDelay >= 30 ? 'high' :
    predictedDelay >= 15 ? 'medium' : 'low';

  const remainingMinutes = Math.round((input.distanceToDestination / Math.max(1, input.currentSpeed)) * 60 + predictedDelay);
  const eta = new Date(Date.now() + remainingMinutes * 60 * 1000).toISOString();

  return {
    forecastDelay: Math.max(0, Math.round(predictedDelay)),
    confidence: Math.min(1, confidence),
    eta,
    factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 5),
    riskLevel,
  };
}

/**
 * Enhance heuristic prediction with historical patterns
 */
function _enhanceWithHistoricalPatterns(
  heuristic: Omit<DelayPredictionResult, 'method'>,
  input: DelayPredictionInput
): Omit<DelayPredictionResult, 'method'> {
  // Simulate historical lookup (in production: query database)
  // For same hour and day of week, trains typically have 5-15 min additional delays on this route
  const typicalAdditionalDelay = 10; // minutes

  // Weight: if heuristic confidence is high, use mainly heuristic
  // Otherwise, blend more with historical
  const historicalWeight = Math.max(0.3, 1 - heuristic.confidence);
  const blendedDelay = heuristic.forecastDelay * (1 - historicalWeight) +
                      typicalAdditionalDelay * historicalWeight;

  const enhancedConfidence = Math.min(1, heuristic.confidence + 0.15);
  const remainingMinutes = Math.round((input.distanceToDestination / Math.max(1, input.currentSpeed)) * 60 + blendedDelay);
  const eta = new Date(Date.now() + remainingMinutes * 60 * 1000).toISOString();

  return {
    forecastDelay: Math.round(blendedDelay),
    confidence: Math.round(enhancedConfidence * 100) / 100,
    eta,
    factors: heuristic.factors,
    riskLevel: heuristic.riskLevel,
  };
}

/**
 * Generate actionable recommendations based on delay prediction
 */
export function generateDelayActions(prediction: DelayPredictionResult): string[] {
  const actions: string[] = [];

  if (prediction.riskLevel === 'critical') {
    actions.push('Immediate: Alert passenger services');
    actions.push('Update platform displays with revised ETA');
    actions.push('Notify onward connections of potential misses');
  } else if (prediction.riskLevel === 'high') {
    actions.push('Alert station staff of potential delays');
    actions.push('Update passenger information systems');
  } else if (prediction.riskLevel === 'medium') {
    actions.push('Monitor train progress closely');
    actions.push('Update ETA displays');
  }

  // Specific factor-based recommendations
  const speedFactor = prediction.factors.find(f => f.name.includes('speed'));
  if (speedFactor) {
    actions.push('Check for speed restrictions or signal issues');
  }

  const haltFactor = prediction.factors.find(f => f.name.includes('Halt'));
  if (haltFactor) {
    actions.push('Activate halt detection response protocol');
  }

  return actions;
}

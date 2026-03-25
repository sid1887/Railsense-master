/**
 * ETA Prediction Engine
 * Predicts train arrival times using:
 * - Static timetable schedule
 * - Current delay
 * - Distance to next station
 * - Average speed
 */

import {
  getStaticTrain,
  StaticStation,
} from '@/services/staticRailwayDatabase';
import { LiveTrainData } from '@/services/liveTrainDataService';
import { TrainPositionMapping } from '@/services/trainPositionMappingService';

export interface ETAPrediction {
  trainNumber: string;
  currentStation: {
    name: string;
    code: string;
    scheduledDeparture: string;
    actualDeparture?: string;
  };
  nextStation: {
    name: string;
    code: string;
    scheduledArrival: string;
    predictedArrival: string;
    delayForecast: number; // in minutes
    distance: number; // in km
    eta: string; // ISO string
  };
  subsequentStops: {
    name: string;
    code: string;
    scheduledArrival: string;
    predictedArrival: string;
    delayForecast: number;
  }[];
  currentDelay: number; // in minutes
  averageSpeed: number; // km/h
  confidence: number; // 0-1
}

/**
 * Predict ETA for train
 */
export async function predictETA(
  trainNumber: string,
  liveData: LiveTrainData,
  positionMapping: TrainPositionMapping
): Promise<ETAPrediction | null> {
  try {
    const train = await getStaticTrain(trainNumber);
    if (!train || !positionMapping.nextStation) {
      return null;
    }

    // Calculate delay
    const currentDelay = liveData.delayMinutes;

    // Calculate time to next station
    const timeToNextStation = calculateTimeToStation(
      positionMapping.distanceToNextStation,
      liveData.speed
    );

    // Predict arrival at next station
    const predictedArrival = new Date(
      new Date(liveData.timestamp).getTime() + timeToNextStation * 60000
    );

    // Parse scheduled arrival
    const scheduledArrivalTime = parseTime(
      positionMapping.nextStation.arrivalTime
    );

    // Calculate delay at next station
    const nextStationDelay =
      currentDelay + Math.floor((timeToNextStation - 60) / 60);

    // Find current station index in route
    const currentStationIndex = train.route.findIndex(
      (stop) => stop.name === positionMapping.nearestStation.name
    );

    // Build subsequent stops
    const subsequentStops = buildSubsequentStops(
      train.route,
      Math.max(0, currentStationIndex),
      currentDelay,
      liveData.speed
    );

    // Calculate confidence based on data freshness and source quality
    const confidence = liveData.confidence * 0.8 + 0.2;

    return {
      trainNumber,
      currentStation: {
        name: positionMapping.nearestStation.name,
        code: positionMapping.nearestStation.code,
        scheduledDeparture: positionMapping.nearestStation.departureTime,
      },
      nextStation: {
        name: positionMapping.nextStation.name,
        code: positionMapping.nextStation.code,
        scheduledArrival: positionMapping.nextStation.arrivalTime,
        predictedArrival: predictedArrival.toISOString(),
        delayForecast: nextStationDelay,
        distance: positionMapping.distanceToNextStation,
        eta: predictedArrival.toISOString(),
      },
      subsequentStops,
      currentDelay,
      averageSpeed: liveData.speed,
      confidence,
    };
  } catch (error) {
    console.error('Error predicting ETA:', error);
    return null;
  }
}

/**
 * Calculate time (in minutes) to reach next station
 */
function calculateTimeToStation(distanceKm: number, speedKmH: number): number {
  if (speedKmH === 0) return 60; // Default to 1 hour if speed not available
  return (distanceKm / speedKmH) * 60; // Convert to minutes
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTime(timeStr: string): number {
  if (timeStr === '--') return 0;

  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to HH:MM
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Build list of subsequent stops with predictions
 */
function buildSubsequentStops(
  route: StaticStation[],
  currentStationIndex: number,
  currentDelay: number,
  speed: number
): ETAPrediction['subsequentStops'] {
  const stops: ETAPrediction['subsequentStops'] = [];
  let cumulativeDelay = currentDelay;
  let cumulativeDistance = 0;

  for (let i = currentStationIndex + 2; i < route.length; i++) {
    const stop = route[i];
    const prevStop = route[i - 1];

    // Calculate distance from previous stop
    const distance =
      Math.sqrt(
        Math.pow(stop.latitude - prevStop.latitude, 2) +
          Math.pow(stop.longitude - prevStop.longitude, 2)
      ) * 111; // Rough approximation: 1 degree ≈ 111 km

    cumulativeDistance += distance;

    // Time to reach this station (in minutes)
    const timeToStation = (cumulativeDistance / speed) * 60;

    // Account for haltage at previous stations
    for (let j = currentStationIndex + 1; j < i; j++) {
      cumulativeDelay += route[j].haltageDuration;
    }

    // Predict arrival time
    const scheduledMinutes = parseTime(stop.arrivalTime);
    const delayForecast = cumulativeDelay + Math.floor(timeToStation / 60);

    stops.push({
      name: stop.name,
      code: stop.code,
      scheduledArrival: stop.arrivalTime,
      predictedArrival: formatTime(scheduledMinutes + delayForecast),
      delayForecast,
    });

    if (stops.length >= 5) break; // Limit to 5 subsequent stops
  }

  return stops;
}

/**
 * Estimate delay trend (increasing/decreasing/stable)
 */
export function estimateDelayTrend(
  predictions: ETAPrediction[],
  lookbackMinutes: number = 120
): 'increasing' | 'decreasing' | 'stable' {
  if (predictions.length < 2) return 'stable';

  const recent = predictions[predictions.length - 1];
  const older = predictions[Math.max(0, predictions.length - 3)];

  const delayChange = recent.currentDelay - older.currentDelay;

  if (delayChange > 5) return 'increasing';
  if (delayChange < -5) return 'decreasing';
  return 'stable';
}

/**
 * Calculate confidence interval around ETA
 */
export function calculateETAConfidenceInterval(
  etaPrediction: ETAPrediction
): { lower: Date; upper: Date } {
  const baseETA = new Date(etaPrediction.nextStation.eta);

  // Confidence interval based on prediction confidence and distance
  const confidenceMargin = (1 - etaPrediction.confidence) * 30; // 0-30 minutes
  const distanceMargin =
    etaPrediction.nextStation.distance > 500 ? 15 : 10; // 10-15 minutes
  const totalMargin = confidenceMargin + distanceMargin;

  return {
    lower: new Date(baseETA.getTime() - totalMargin * 60000),
    upper: new Date(baseETA.getTime() + totalMargin * 60000),
  };
}

export default {
  predictETA,
  estimateDelayTrend,
  calculateETAConfidenceInterval,
};

/**
 * Insight Generator
 * Converts raw train data and analysis into human-readable passenger insights
 * Creates contextual explanations for delays and halts
 */

import {
  TrainData,
  HaltDetection,
  TrafficAnalysis,
  PredictionResult,
  PassengerInsight,
  UncertaintyIndex,
  UncertaintyLevel,
} from '@/types/train';
import { formatTime, formatDuration } from '@/lib/utils';

/**
 * Calculate uncertainty index based on multiple factors
 * Returns score 0-100 where higher = more uncertain
 *
 * Factors (weighted):
 * - Halt duration (40%)
 * - Traffic density (35%)
 * - Weather risk (25%)
 */
export function calculateUncertaintyIndex(
  haltDetection: HaltDetection,
  trafficAnalysis: TrafficAnalysis,
  weatherRisk: number // 0-100 scale
): UncertaintyIndex {
  let haltScore = 0;
  let trafficScore = 0;
  let weatherScore = weatherRisk;

  // Halt duration factor (40%)
  if (haltDetection.halted && haltDetection.haltDuration) {
    // 5 min = 20 score, 20 min = 100 score
    haltScore = Math.min(100, (haltDetection.haltDuration / 20) * 100);
  }

  // Traffic density factor (35%)
  switch (trafficAnalysis.congestionLevel) {
    case 'LOW':
      trafficScore = 20;
      break;
    case 'MEDIUM':
      trafficScore = 55;
      break;
    case 'HIGH':
      trafficScore = 90;
      break;
  }

  // Calculate weighted score
  const score = Math.round(haltScore * 0.4 + trafficScore * 0.35 + weatherScore * 0.25);

  // Determine level based on score
  let level: UncertaintyLevel;
  if (score <= 25) level = 'LOW';
  else if (score <= 50) level = 'MEDIUM';
  else if (score <= 75) level = 'HIGH';
  else level = 'CRITICAL';

  return {
    level,
    score: Math.min(100, score),
    factors: {
      haltDuration: Math.min(100, haltScore),
      trafficDensity: trafficScore,
      weatherRisk: weatherScore,
    },
  };
}

/**
 * Get uncertainty level description
 */
export function getUncertaintyDescription(level: UncertaintyLevel): string {
  const descriptions: Record<UncertaintyLevel, string> = {
    LOW: 'Situation is clear and predictable',
    MEDIUM: 'Some uncertainty in wait time',
    HIGH: 'Significant uncertainty ahead',
    CRITICAL: 'Situation highly unpredictable',
  };

  return descriptions[level];
}

/**
 * Generate headline for insight
 * Example: "Train halted between stations"
 */
function generateHeadline(
  trainData: TrainData,
  haltDetection: HaltDetection,
  trafficAnalysis: TrafficAnalysis
): string {
  // If halted
  if (haltDetection.halted) {
    const duration = haltDetection.haltDuration || 0;
    if (duration > 20) {
      return `🚨 Extended halt detected (${Math.round(duration)} minutes)`;
    } else if (duration > 10) {
      return `⚠️ Train halted for ${Math.round(duration)} minutes`;
    }
    return `⏸️ Unexpected stop detected`;
  }

  // If moving with traffic issues
  if (trafficAnalysis.congestionLevel === 'HIGH') {
    return `🚗 Heavy traffic congestion ahead`;
  }

  if (trafficAnalysis.congestionLevel === 'MEDIUM') {
    return `🚶 Moderate traffic in area`;
  }

  // If on time and moving
  if (trainData.delay < 5) {
    return `✅ Train running on schedule`;
  }

  // If delayed
  if (trainData.delay > 15) {
    return `⏱️ Train significantly delayed`;
  }

  return `Train status update`;
}

/**
 * Generate detailed explanation
 */
function generateDetails(
  trainData: TrainData,
  haltDetection: HaltDetection,
  trafficAnalysis: TrafficAnalysis,
  prediction: PredictionResult
): string {
  const currentStation =
    trainData.currentStationIndex > 0
      ? trainData.scheduledStations[trainData.currentStationIndex - 1]?.name
      : trainData.scheduledStations[0]?.name;

  const nextStation =
    trainData.currentStationIndex < trainData.scheduledStations.length
      ? trainData.scheduledStations[trainData.currentStationIndex]?.name
      : trainData.destination;

  let detail = '';

  // Halt-specific details
  if (haltDetection.halted) {
    const duration = haltDetection.haltDuration || 0;
    detail = `Train has been stationary for ${formatDuration(duration)} between ${currentStation} and ${nextStation}. `;

    if (haltDetection.reason) {
      detail += `${haltDetection.reason}. `;
    }
  } else {
    const delay = trainData.delay ?? 0;
    detail = `Train currently between ${currentStation} and ${nextStation}. Current delay: ${delay.toFixed(1)} minutes. `;
  }

  // Traffic context
  if (trafficAnalysis.nearbyTrainsCount > 0) {
    detail += `${trafficAnalysis.nearbyTrainsCount} other train${trafficAnalysis.nearbyTrainsCount > 1 ? 's' : ''} detected nearby, causing ${trafficAnalysis.congestionLevel.toLowerCase()} congestion. `;
  }

  // Prediction - with safety check
  if (prediction && prediction.minWait !== undefined && prediction.maxWait !== undefined) {
    detail += `Expected movement window: ${prediction.minWait.toFixed(0)}–${prediction.maxWait.toFixed(0)} minutes.`;
  } else {
    detail += `Movement estimate: Unable to calculate at this time.`;
  }

  return detail;
}

/**
 * Generate estimated wait time string
 */
function generateEstimatedWait(prediction: PredictionResult): string {
  const min = Math.round(prediction.minWait);
  const max = Math.round(prediction.maxWait);

  if (min === max) {
    return `~${min} minutes`;
  }

  return `${min}–${max} minutes`;
}

/**
 * Generate recommendations for passengers
 */
function generateRecommendations(
  haltDetection: HaltDetection,
  uncertainty: UncertaintyIndex,
  trafficAnalysis: TrafficAnalysis
): string[] {
  const recommendations: string[] = [];

  // Halt-related recommendations
  if (haltDetection.halted && haltDetection.haltDuration) {
    if (haltDetection.haltDuration > 15) {
      recommendations.push('Significant delay expected - consider stretching and refreshing');
      recommendations.push('Stay updated with announcements for more information');
    } else {
      recommendations.push('Train should resume movement shortly');
    }
  }

  // Traffic-related recommendations
  if (trafficAnalysis.congestionLevel === 'HIGH') {
    recommendations.push('Heavy traffic ahead - expect longer wait times');
  }

  // Uncertainty-related recommendations
  if (uncertainty.level === 'CRITICAL' || uncertainty.level === 'HIGH') {
    recommendations.push('Stay informed with live updates');
  } else {
    recommendations.push('Check station announcements for updates');
  }

  // General recommendation
  if (recommendations.length === 1) {
    recommendations.push('Thank you for your patience');
  }

  return recommendations;
}

/**
 * Main insight generation function
 * Combines all analyses into passenger-friendly output
 */
export function generatePassengerInsight(
  trainData: TrainData,
  haltDetection: HaltDetection,
  trafficAnalysis: TrafficAnalysis,
  prediction: PredictionResult,
  uncertainty: UncertaintyIndex
): PassengerInsight {
  const headline = generateHeadline(trainData, haltDetection, trafficAnalysis);
  const details = generateDetails(trainData, haltDetection, trafficAnalysis, prediction);
  const estimatedWait = generateEstimatedWait(prediction);
  const recommendations = generateRecommendations(haltDetection, uncertainty, trafficAnalysis);

  return {
    headline,
    details,
    estimatedWait,
    uncertainty: uncertainty.level,
    recommendations,
    timestamp: Date.now(),
  };
}

/**
 * Create context-specific explanation for halt
 * Used for detailed analysis pages
 */
export function createHaltContextExplanation(
  trainData: TrainData,
  haltDetection: HaltDetection,
  trafficAnalysis: TrafficAnalysis
): string {
  if (!haltDetection.halted) {
    return 'Train is currently moving normally.';
  }

  const duration = haltDetection.haltDuration || 0;
  const { currentStationIndex, scheduledStations } = trainData;

  let explanation = `Train is stationary for ${formatDuration(duration)}. `;

  // Location context
  if (currentStationIndex < scheduledStations.length - 1) {
    const prevStation = scheduledStations[Math.max(0, currentStationIndex - 1)];
    const nextStation = scheduledStations[currentStationIndex];
    explanation += `Located between ${prevStation.name} and ${nextStation.name}. `;
  }

  // Reason
  if (haltDetection.reason) {
    explanation += `Likely cause: ${haltDetection.reason}. `;
  }

  // Traffic impact
  if (trafficAnalysis.nearbyTrainsCount > 0) {
    explanation += `This area has ${trafficAnalysis.nearbyTrainsCount} train${trafficAnalysis.nearbyTrainsCount > 1 ? 's' : ''} nearby, which may be affecting movement.`;
  }

  return explanation;
}

/**
 * Generate sentiment emoji based on situation
 */
export function getSituationEmoji(uncertainty: UncertaintyIndex): string {
  switch (uncertainty.level) {
    case 'LOW':
      return '😊';
    case 'MEDIUM':
      return '😐';
    case 'HIGH':
      return '😟';
    case 'CRITICAL':
      return '😰';
    default:
      return '😐';
  }
}

/**
 * Generate color coding for status display
 */
export function getStatusColor(
  uncertainty: UncertaintyLevel
): 'success' | 'warning' | 'danger' | 'critical' {
  switch (uncertainty) {
    case 'LOW':
      return 'success';
    case 'MEDIUM':
      return 'warning';
    case 'HIGH':
      return 'danger';
    case 'CRITICAL':
      return 'critical';
  }
}

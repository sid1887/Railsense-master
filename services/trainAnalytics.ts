/**
 * Train Analytics Engine
 * Comprehensive analysis combining:
 * - Halt reason detection
 * - Section intelligence
 * - Wait time prediction
 * - Nearby train awareness
 * - Weather/Signal integration
 */

import haltReasonDetector, { HaltReason } from './haltReasonDetector';
import railwaySectionIntelligence from './railwaySectionIntelligence';
import waitTimePredictor, { WaitTimeBreakdown } from './waitTimePrediction';
import { TrainData, Station } from '@/types/train';

export interface TrainAnalytics {
  trainNumber: string;
  trainName: string;
  currentLocation: {
    stationCode: string;
    stationName: string;
    latitude: number;
    longitude: number;
  };
  movementState: 'running' | 'halted' | 'stopped' | 'stalled';
  speed: number;
  delay: number;

  // Halt Analysis
  haltAnalysis: {
    isHalted: boolean;
    reason: HaltReason | null;
  };

  // Section Intelligence
  sectionAnalytics: {
    currentSection: string;
    congestionLevel: number; // 0-100
    expectedSectionDelay: number;
    networkHeatmap: Record<string, number>;
  };

  // Wait Time Prediction
  waitTimePrediction: {
    breakdown: WaitTimeBreakdown;
    range: { min: number; max: number; mostLikely: number };
    isUnusual: boolean;
  };

  // Nearby Trains Awareness
  nearbyTrains: {
    count: number;
    withinKm: number;
    listingUrl?: string;
    summary: string;
  };

  // Integrated Explanation
  explanation: string;
  recommendedAction?: string;
  nextMajorStop?: {
    stationName: string;
    distance: number;
    estimatedArrival: string;
    expectedDelay: number;
  };

  // Metadata
  lastUpdated: string;
  confidence: number; // 0-100 overall confidence
}

class TrainAnalyticsEngine {
  /**
   * Perform comprehensive train analysis
   */
  async performCompleteAnalysis(
    trainData: TrainData,
    nearbyTrains: TrainData[] = [],
    currentTime: Date = new Date(),
    weatherData?: any,
    signals?: any[]
  ): Promise<TrainAnalytics> {
    // Extract current station
    const currentStationIndex = trainData.currentStationIndex || 0;
    const stations = trainData.scheduledStations || [];
    const currentStation = stations[currentStationIndex] || stations[0];

    // Check if halted
    const isHalted = trainData.speed < 5; // Less than 5 km/h

    // 1. Halt Reason Analysis
    let haltReason: HaltReason | null = null;
    if (isHalted) {
      haltReason = haltReasonDetector.detectHaltReason(
        trainData,
        currentStation,
        nearbyTrains,
        weatherData,
        signals
      );
    }

    // 2. Section Intelligence
    const sectionCode = currentStation?.name || 'UNKNOWN';
    const section = railwaySectionIntelligence.getSectionForStation(sectionCode);
    const sectionInsight = section
      ? railwaySectionIntelligence.getSectionInsight(currentTime, section)
      : null;

    const networkHeatmap = railwaySectionIntelligence.getNetworkHeatmap(currentTime);

    // 3. Wait Time Prediction
    const waitTimeBreakdown = waitTimePredictor.predictWaitTime(
      currentStation,
      trainData,
      nearbyTrains,
      weatherData,
      sectionInsight
    );

    const waitTimeRange = waitTimePredictor.getWaitTimeRange(waitTimeBreakdown);

    // 4. Nearby Trains Summary
    const nearbyTrainsSummary = this.summarizeNearbyTrains(nearbyTrains, currentStation);

    // 5. Calculate next major stop (prediction)
    let nextMajorStop = null;
    const remainingStations = stations.slice(currentStationIndex + 1, currentStationIndex + 5);
    if (remainingStations.length > 0) {
      nextMajorStop = this.predictNextStop(remainingStations[0], trainData, currentTime);
    }

    // 6. Build integrated explanation
    const explanation = this.buildIntegratedExplanation(
      trainData,
      currentStation,
      isHalted,
      haltReason,
      sectionInsight,
      waitTimeBreakdown,
      nearbyTrains
    );

    // 7. Recommend action
    const recommendedAction = this.recommendAction(
      isHalted,
      haltReason,
      waitTimeBreakdown,
      trainData
    );

    // 8. Calculate overall confidence
    const overallConfidence = Math.round(
      (haltReason?.confidence || 50) * 0.3 +
        waitTimeBreakdown.confidence * 0.4 +
        (sectionInsight?.currentCongestion || 50) * 0.3
    );

    return {
      trainNumber: trainData.trainNumber,
      trainName: trainData.trainName,
      currentLocation: {
        stationCode: currentStation?.name || 'UNKNOWN',
        stationName: currentStation?.name || 'Unknown',
        latitude: currentStation?.latitude || 0,
        longitude: currentStation?.longitude || 0,
      },
      movementState: this.determineMovementState(trainData, isHalted),
      speed: trainData.speed || 0,
      delay: trainData.delay || 0,

      haltAnalysis: {
        isHalted,
        reason: haltReason,
      },

      sectionAnalytics: {
        currentSection: section?.name || 'Unknown',
        congestionLevel: sectionInsight?.currentCongestion || 0,
        expectedSectionDelay: sectionInsight?.expectedAdditionalDelay || 0,
        networkHeatmap,
      },

      waitTimePrediction: {
        breakdown: waitTimeBreakdown,
        range: waitTimeRange,
        isUnusual: waitTimePredictor.isUnusualWait(waitTimeBreakdown),
      },

      nearbyTrains: nearbyTrainsSummary,

      explanation,
      recommendedAction,
      nextMajorStop: nextMajorStop || undefined,

      lastUpdated: new Date().toISOString(),
      confidence: overallConfidence,
    };
  }

  /**
   * Determine movement state
   */
  private determineMovementState(trainData: TrainData, isHalted: boolean): 'running' | 'halted' | 'stopped' | 'stalled' {
    if (!isHalted) return 'running';
    if (trainData.delay > 30) return 'stalled';
    return 'halted';
  }

  /**
   * Summarize nearby trains
   */
  private summarizeNearbyTrains(
    nearbyTrains: TrainData[],
    currentStation: any
  ): { count: number; withinKm: number; summary: string } {
    return {
      count: nearbyTrains.length,
      withinKm: 20,
      summary:
        nearbyTrains.length === 0
          ? 'No trains nearby'
          : `${nearbyTrains.length} trains within 20km`,
    };
  }

  /**
   * Predict next major stop
   */
  private predictNextStop(
    nextStation: Station,
    trainData: TrainData,
    currentTime: Date
  ): { stationName: string; distance: number; estimatedArrival: string; expectedDelay: number } {
    const distance = 50; // Default estimate - would calculate from coordinates in production
    const estimatedMinutes = Math.round(distance / (trainData.speed || 65)) + trainData.delay;

    const arrivalTime = new Date(currentTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + estimatedMinutes);

    return {
      stationName: nextStation.name,
      distance,
      estimatedArrival: arrivalTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      expectedDelay: trainData.delay,
    };
  }

  /**
   * Build comprehensive explanation
   */
  private buildIntegratedExplanation(
    trainData: TrainData,
    currentStation: any,
    isHalted: boolean,
    haltReason: HaltReason | null,
    sectionInsight: any,
    waitTimeBreakdown: WaitTimeBreakdown,
    nearbyTrains: TrainData[]
  ): string {
    let parts: string[] = [];

    if (isHalted && haltReason) {
      parts.push(`🔴 Train halted at ${currentStation?.name || 'unknown station'}.`);
      parts.push(`Primary reason: ${haltReason.primaryReason}`);
      parts.push(`Confidence: ${haltReason.confidence}%`);
      parts.push(`${haltReason.explanation}`);
    } else {
      parts.push(`🟢 Train running at ${trainData.speed || 60} km/h`);
    }

    if (sectionInsight) {
      parts.push(`\n📊 Section: ${sectionInsight.section.name}`);
      parts.push(`Congestion: ${sectionInsight.currentCongestion}%`);
    }

    parts.push(`\n⏱️ Wait time: ${waitTimeBreakdown.formula}`);

    if (nearbyTrains.length > 0) {
      parts.push(`\n🚂 ${nearbyTrains.length} trains converging`);
    }

    return parts.join('\n');
  }

  /**
   * Recommend action based on analysis
   */
  private recommendAction(
    isHalted: boolean,
    haltReason: HaltReason | null,
    waitTimeBreakdown: WaitTimeBreakdown,
    trainData: TrainData
  ): string {
    if (!isHalted) {
      return 'Train is running on schedule.';
    }

    if (haltReason) {
      return haltReason.requiredAction || 'Wait for clearance.';
    }

    if (waitTimeBreakdown.totalWaitTime > 20) {
      return `Long wait expected (${waitTimeBreakdown.totalWaitTime}min). Check section for issues.`;
    }

    return 'Normal halt at station.';
  }
}

const trainAnalyticsEngine = new TrainAnalyticsEngine();
export default trainAnalyticsEngine;

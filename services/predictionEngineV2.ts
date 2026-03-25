/**
 * Prediction Engine V2 - ADVANCED
 * Computes ETA and delay forecast using all intelligence factors
 *
 * Formula:
 * ETA = schedule
 *     + currentDelay
 *     + dwellRisk
 *     + congestionPenalty
 *     + crossingDelay
 *     + platformWait
 */

export interface PredictionResult {
  eta: string;
  delayForecast: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    delayPropagation: number;
    dwellRisk: number;
    congestionPenalty: number;
    crossingDelay: number;
    platformWait: number;
  };
}

class PredictionEngineV2 {
  /**
   * Predict arrival at next station
   */
  async predictArrival(
    trainNumber: string,
    baseData: any,
    liveData: any,
    dwellPrediction: any,
    crossingRisk: any,
    platformOccupancy: any,
    networkData: any
  ): Promise<PredictionResult> {
    try {
      const factors = {
        delayPropagation: 0,
        dwellRisk: 0,
        congestionPenalty: 0,
        crossingDelay: 0,
        platformWait: 0,
      };

      // Factor 1: Current delay propagation
      const currentDelay = (liveData?.delayMinutes ?? 0) + (baseData.delay ?? 0);
      factors.delayPropagation = currentDelay * 0.8; // 80% propagates forward

      // Factor 2: Dwell risk penalty
      if (dwellPrediction.dwellRisk === 'high') {
        factors.dwellRisk = 3;
      } else if (dwellPrediction.dwellRisk === 'medium') {
        factors.dwellRisk = 1.5;
      }

      // Factor 3: Congestion penalty
      const congestionPenalty: Record<string, number> = {
        severe: 5,
        high: 3,
        medium: 1.5,
        low: 0,
      };
      factors.congestionPenalty = congestionPenalty[networkData.congestionLevel as string] || 0;

      // Factor 4: Crossing delay
      if (crossingRisk.riskLevel === 'critical') {
        factors.crossingDelay = 10; // Major delay if critical crossing
      } else if (crossingRisk.riskLevel === 'high') {
        factors.crossingDelay = 5;
      } else if (crossingRisk.riskLevel === 'medium') {
        factors.crossingDelay = 2;
      }

      // Factor 5: Platform wait
      factors.platformWait = platformOccupancy.expectedWaitTime || 0;

      // Calculate total delay forecast
      const totalDelayForecast =
        factors.delayPropagation +
        factors.dwellRisk +
        factors.congestionPenalty +
        factors.crossingDelay +
        factors.platformWait;

      // Get scheduled arrival time of next station
      const nextStationIndex = (baseData.currentStationIndex || 0) + 1;
      const nextStation = baseData.scheduledStations?.[nextStationIndex];
      const scheduledArrival = nextStation?.scheduledArrival || '23:59';

      // Parse scheduled time
      const [hours, minutes] = scheduledArrival.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      // Add forecast delay
      const estimatedTime = new Date(scheduledTime.getTime() + totalDelayForecast * 60000);

      // Calculate confidence
      let confidence = 0.7; // Base 70%
      if (liveData?.latitude) confidence += 0.15; // +15% if we have live GPS
      if (dwellPrediction.expectedDwellTime < 5) confidence += 0.1; // +10% if short dwell
      if (networkData.congestionLevel === 'low') confidence += 0.05; // +5% if low congestion
      confidence = Math.min(1.0, confidence); // Cap at 100%

      // Determine risk level
      const totalDelay = currentDelay + totalDelayForecast;
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (totalDelay > 30) {
        riskLevel = 'critical';
      } else if (totalDelay > 20) {
        riskLevel = 'high';
      } else if (totalDelay > 10) {
        riskLevel = 'medium';
      }

      return {
        eta: estimatedTime.toISOString(),
        delayForecast: Math.round(totalDelayForecast * 10) / 10,
        confidence: Math.round(confidence * 100) / 100,
        riskLevel,
        factors,
      };
    } catch (error) {
      console.error('[PredictionEngineV2] Error:', error);
      return {
        eta: new Date().toISOString(),
        delayForecast: 0,
        confidence: 0.5,
        riskLevel: 'medium',
        factors: {
          delayPropagation: 0,
          dwellRisk: 0,
          congestionPenalty: 0,
          crossingDelay: 0,
          platformWait: 0,
        },
      };
    }
  }
}

export const predictionEngineV2 = new PredictionEngineV2();

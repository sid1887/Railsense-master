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
      const sourceType = liveData?.source || 'estimated';
      const liveTimestampMs = liveData?.timestamp ? new Date(liveData.timestamp).getTime() : Number.NaN;
      const liveAgeMinutes = Number.isFinite(liveTimestampMs)
        ? Math.max(0, (Date.now() - liveTimestampMs) / 60000)
        : null;
      const hasLiveCoordinates = typeof liveData?.latitude === 'number' && typeof liveData?.longitude === 'number' && liveData.latitude !== 0 && liveData.longitude !== 0;
      const isStaleFeed = Boolean(liveData?.isStale);

      const factors = {
        delayPropagation: 0,
        dwellRisk: 0,
        congestionPenalty: 0,
        crossingDelay: 0,
        platformWait: 0,
      };

      // Factor 1: Current delay propagation
      const currentDelay = (liveData?.delayMinutes ?? 0) + (baseData.delay ?? 0);
      const propagationWeight =
        sourceType === 'estimated'
          ? 0.64
          : isStaleFeed
            ? 0.88
            : sourceType === 'ntes'
              ? 0.83
              : 0.78;
      factors.delayPropagation = currentDelay * propagationWeight;
      if (isStaleFeed) {
        factors.delayPropagation += liveAgeMinutes ? Math.min(4, Math.max(1, liveAgeMinutes / 8)) : 1.5;
      }

      // Factor 2: Dwell risk penalty
      if (dwellPrediction.dwellRisk === 'high') {
        factors.dwellRisk = 3;
      } else if (dwellPrediction.dwellRisk === 'medium') {
        factors.dwellRisk = 1.5;
      }
      if (sourceType === 'estimated') {
        factors.dwellRisk += 1.2;
      } else if (isStaleFeed) {
        factors.dwellRisk += 0.8;
      }

      // Factor 3: Congestion penalty
      const congestionPenalty: Record<string, number> = {
        severe: 5,
        high: 3,
        medium: 1.5,
        low: 0,
      };
      factors.congestionPenalty = congestionPenalty[networkData.congestionLevel as string] || 0;
      if (isStaleFeed && factors.congestionPenalty > 0) {
        factors.congestionPenalty += 0.5;
      }

      // Factor 4: Crossing delay
      if (crossingRisk.riskLevel === 'critical') {
        factors.crossingDelay = 10; // Major delay if critical crossing
      } else if (crossingRisk.riskLevel === 'high') {
        factors.crossingDelay = 5;
      } else if (crossingRisk.riskLevel === 'medium') {
        factors.crossingDelay = 2;
      }

      // Factor 5: Platform wait
      factors.platformWait = Math.max(0, platformOccupancy.expectedWaitTime || 0);
      if (liveAgeMinutes !== null && liveAgeMinutes > 15) {
        factors.platformWait += 1;
      }

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
      let confidence = 0.48;

      if (hasLiveCoordinates) {
        confidence += 0.16;
      }

      const sourceBoost: Record<string, number> = {
        ntes: 0.14,
        railyatri: 0.12,
        estimated: -0.1,
      };
      confidence += sourceBoost[sourceType] ?? 0;

      if (liveAgeMinutes !== null) {
        if (liveAgeMinutes <= 2) {
          confidence += 0.09;
        } else if (liveAgeMinutes <= 5) {
          confidence += 0.05;
        } else if (liveAgeMinutes > 12) {
          confidence -= 0.1;
        } else if (liveAgeMinutes > 7) {
          confidence -= 0.04;
        }
      }

      if (isStaleFeed) {
        confidence -= 0.17;
      }

      if (dwellPrediction.expectedDwellTime < 5) {
        confidence += 0.06;
      } else if (dwellPrediction.expectedDwellTime > 15) {
        confidence -= 0.05;
      }

      if (networkData.congestionLevel === 'low') {
        confidence += 0.05;
      } else if (networkData.congestionLevel === 'severe') {
        confidence -= 0.08;
      }

      if (crossingRisk.riskLevel === 'critical') {
        confidence -= 0.12;
      } else if (crossingRisk.riskLevel === 'high') {
        confidence -= 0.06;
      } else if (crossingRisk.riskLevel === 'medium') {
        confidence -= 0.03;
      }

      if (totalDelayForecast > 25) {
        confidence -= 0.07;
      }

      confidence = Math.max(0.2, Math.min(0.96, confidence));

      // Determine risk level
      const totalDelay = currentDelay + totalDelayForecast + (isStaleFeed ? 2 : 0);
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (totalDelay > 32 || (crossingRisk.riskLevel === 'critical' && totalDelay > 18)) {
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

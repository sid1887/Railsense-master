/**
 * Crossing Detection Service
 * Detects when opposing trains might cross on same track
 */

export interface CrossingRiskResult {
  hasOpposingTrain: boolean;
  distance: number;
  timeToConflict: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

class CrossingDetectionService {
  /**
   * Detect crossing risk with nearby trains
   */
  async detectCrossing(
    trainNumber: string,
    currentLocation: { latitude: number; longitude: number },
    nearbyTrains: any[]
  ): Promise<CrossingRiskResult> {
    try {
      // Find opposing trains on same track
      const opposingTrains = nearbyTrains.filter(
        (t) => t.direction === 'opposite' && t.sameTrack
      );

      if (opposingTrains.length === 0) {
        return {
          hasOpposingTrain: false,
          distance: -1,
          timeToConflict: -1,
          riskLevel: 'low',
        };
      }

      // Get closest opposing train
      const closest = opposingTrains.sort((a, b) => a.distance - b.distance)[0];

      // Calculate time to conflict
      const combinedSpeed = (100 + (closest.speed || 0)) / 2; // Rough average
      const timeToConflict = (closest.distance / combinedSpeed) * 60; // Convert to minutes

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (timeToConflict < 5) {
        riskLevel = 'critical';
      } else if (timeToConflict < 15) {
        riskLevel = 'high';
      } else if (timeToConflict < 30) {
        riskLevel = 'medium';
      }

      return {
        hasOpposingTrain: true,
        distance: closest.distance,
        timeToConflict: Math.max(0, Math.round(timeToConflict)),
        riskLevel,
      };
    } catch (error) {
      console.error('[CrossingDetection] Error:', error);
      return {
        hasOpposingTrain: false,
        distance: -1,
        timeToConflict: -1,
        riskLevel: 'low',
      };
    }
  }
}

export const crossingDetectionService = new CrossingDetectionService();

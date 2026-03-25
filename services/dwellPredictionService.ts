/**
 * Dwell Prediction Service
 * Predicts station dwell time based on delay, congestion, etc.
 */

export interface DwellPrediction {
  expectedDwellTime: number; // minutes
  dwellRisk: 'low' | 'medium' | 'high';
  reasons: string[];
}

class DwellPredictionService {
  /**
   * Predict dwell time at next station
   */
  async predictDwell(
    trainNumber: string,
    baseData: any,
    networkData: any,
    currentDelay: number
  ): Promise<DwellPrediction> {
    try {
      let baseDwell = 3; // Base 3 minutes
      const reasons: string[] = [];

      // Factor 1: Is this a junction/major station?
      const isJunction = this.isJunctionStation(baseData.currentStationCode);
      if (isJunction) {
        baseDwell += 2;
        reasons.push('Junction station (longer dwell expected)');
      }

      // Factor 2: Delay accumulation
      if (currentDelay > 10) {
        baseDwell += Math.min(5, currentDelay / 10); // Add up to 5 min
        reasons.push(`High delay (${currentDelay}m) may cause platform bottleneck`);
      }

      // Factor 3: Network congestion
      if (networkData.congestionLevel === 'severe') {
        baseDwell += 3;
        reasons.push('High network congestion');
      } else if (networkData.congestionLevel === 'high') {
        baseDwell += 1.5;
        reasons.push('Moderate network congestion');
      }

      // Factor 4: Nearby trains
      if (networkData.nearbyTrains.length > 3) {
        baseDwell += 1;
        reasons.push('Multiple nearby trains competing for platform');
      }

      // Determine risk level
      let dwellRisk: 'low' | 'medium' | 'high' = 'low';
      if (baseDwell > 7) {
        dwellRisk = 'high';
        reasons.push('Risk of extended dwell');
      } else if (baseDwell > 5) {
        dwellRisk = 'medium';
      }

      return {
        expectedDwellTime: Math.round(baseDwell * 10) / 10,
        dwellRisk,
        reasons,
      };
    } catch (error) {
      console.error('[DwellPrediction] Error:', error);
      return {
        expectedDwellTime: 3,
        dwellRisk: 'low',
        reasons: ['Unable to compute dwell prediction'],
      };
    }
  }

  private isJunctionStation(stationCode: string): boolean {
    // List of major junction stations
    const junctions = [
      'NDLS', 'GZB', 'ALDS', 'KNW', 'CNB',  // Delhi area
      'LKO', 'JNU', 'GKP',                   // UP
      'BZA', 'HYB', 'SC',                    // South
      'BRC', 'VG', 'DJ',                     // Gujarat
      'PUNE', 'LUR',                         // West
    ];
    return junctions.includes(stationCode);
  }
}

export const dwellPredictionService = new DwellPredictionService();

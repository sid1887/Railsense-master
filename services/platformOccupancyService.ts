/**
 * Platform Occupancy Service
 * Predicts platform load and waiting probability
 */

export interface PlatformOccupancyResult {
  platformLoad: number;
  waitingProbability: number;
  expectedWaitTime: number;
}

class PlatformOccupancyService {
  /**
   * Analyze platform occupancy at next station
   */
  async analyzeOccupancy(
    stationCode: string,
    stationIndex: number,
    allStations: any[],
    nearbyTrains: any[]
  ): Promise<PlatformOccupancyResult> {
    try {
      if (!stationCode) {
        return {
          platformLoad: 0,
          waitingProbability: 0,
          expectedWaitTime: 0,
        };
      }

      // Count trains arriving at this station in next 30 minutes
      let trainCount = 0;
      let maxWaitTime = 0;

      for (const nearbyTrain of nearbyTrains) {
        // Check if this train is heading to same station
        const isHeadingToStation = this.isTrainHeadingToStation(
          nearbyTrain,
          stationCode
        );

        if (isHeadingToStation) {
          trainCount++;
          // Estimate ETA
          const eta = this.estimateETA(nearbyTrain);
          if (eta > 0 && eta < 30) {
            // Within 30 minutes
            maxWaitTime = Math.max(maxWaitTime, eta);
          }
        }
      }

      // Platform load estimation
      // Assume each train adds 20% load
      const baseLoad = 30; // Base occupancy
      const platformLoad = Math.min(100, baseLoad + trainCount * 20);

      // Waiting probability increases with load
      const waitingProbability = Math.min(1.0, platformLoad / 100);

      // Expected wait time based on occupancy and incoming trains
      const expectedWaitTime = waitingProbability * 15; // Max 15 minutes wait

      return {
        platformLoad: Math.round(platformLoad),
        waitingProbability: Math.round(waitingProbability * 100) / 100,
        expectedWaitTime: Math.round(expectedWaitTime * 10) / 10,
      };
    } catch (error) {
      console.error('[PlatformOccupancy] Error:', error);
      return {
        platformLoad: 50,
        waitingProbability: 0.5,
        expectedWaitTime: 5,
      };
    }
  }

  private isTrainHeadingToStation(train: any, stationCode: string): boolean {
    // Check if train's destination or route includes this station
    // In production: use railway network graph
    return false;
  }

  private estimateETA(train: any): number {
    // Rough estimate based on distance and speed
    const distance = train.distance || 0;
    const speed = train.speed || 60;
    return (distance / speed) * 60; // to minutes
  }
}

export const platformOccupancyService = new PlatformOccupancyService();

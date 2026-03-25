/**
 * Network Intelligence Service
 * Analyzes multi-train interactions and network congestion
 */

import { getNearbyTrainsData, getTrainData } from './trainDataService';

interface NearbyTrain {
  trainNumber: string;
  trainName: string;
  distance: number;
  direction: 'same' | 'opposite' | 'crossing';
  sameTrack: boolean;
  relativeSpeed: number;
  collisionRisk: 'low' | 'medium' | 'high';
}

export interface NetworkIntelligenceResult {
  nearbyTrains: NearbyTrain[];
  congestionLevel: 'low' | 'medium' | 'high' | 'severe';
  congestionScore: number;
}

class NetworkIntelligenceService {
  /**
   * Analyze nearby trains and compute network intelligence
   */
  async analyzeNearbyTrains(
    trainNumber: string,
    currentLocation: { latitude: number; longitude: number },
    allStations: any[],
    nearbyTrains: any[]
  ): Promise<NetworkIntelligenceResult> {
    try {
      const analyzed: NearbyTrain[] = [];
      let totalCongestion = 0;

      for (const nearbyTrain of nearbyTrains.slice(0, 10)) {
        // Get direction: same/opposite/crossing
        const direction = this.determineDirection(nearbyTrain.currentLocation, allStations);

        // Check if same track
        const sameTrack = this.isSameTrack(trainNumber, nearbyTrain.trainNumber);

        // Calculate relative speed
        const relativeSpeed = 100 - (nearbyTrain.speed || 0); // Rough estimate

        // Determine collision risk
        const collisionRisk = sameTrack && direction === 'opposite' ? 'high' : 'low';

        analyzed.push({
          trainNumber: nearbyTrain.trainNumber,
          trainName: nearbyTrain.trainName,
          distance: nearbyTrain.distance || 0,
          direction,
          sameTrack,
          relativeSpeed,
          collisionRisk,
        });

        // Add to congestion score
        if (sameTrack) totalCongestion += 20;
        if (direction !== 'same') totalCongestion += 10;
      }

      // Normalize congestion score
      const congestionScore = Math.min(100, totalCongestion);
      const congestionLevel =
        congestionScore > 75 ? 'severe' :
        congestionScore > 50 ? 'high' :
        congestionScore > 25 ? 'medium' : 'low';

      return {
        nearbyTrains: analyzed,
        congestionLevel,
        congestionScore,
      };
    } catch (error) {
      console.error('[NetworkIntelligence] Error:', error);
      return {
        nearbyTrains: [],
        congestionLevel: 'low',
        congestionScore: 0,
      };
    }
  }

  private determineDirection(
    trainLocation: { latitude: number; longitude: number },
    allStations: any[]
  ): 'same' | 'opposite' | 'crossing' {
    // Simple heuristic: check if train is progressing along route
    // In production: use actual route geometry
    return 'same';
  }

  private isSameTrack(train1: string, train2: string): boolean {
    // In production: query railway network graph
    // For now: simple heuristic based on route
    return false;
  }
}

export const networkIntelligenceService = new NetworkIntelligenceService();

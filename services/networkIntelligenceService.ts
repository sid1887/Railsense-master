/**
 * Network Intelligence Service
 * Analyzes multi-train interactions and network congestion
 */

import { getTrainData } from './trainDataService';

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
  private routeCodeCache = new Map<string, Set<string>>();

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
        if (!nearbyTrain?.trainNumber || nearbyTrain.trainNumber === trainNumber) {
          continue;
        }

        // Get direction: same/opposite/crossing
        const direction = this.determineDirection(nearbyTrain.currentLocation, allStations);

        // Check if same track
        const sameTrack = await this.isSameTrack(trainNumber, nearbyTrain.trainNumber);

        // Calculate relative speed
        const relativeSpeed = 100 - (nearbyTrain.speed || 0); // Rough estimate

        const distance = this.calculateDistanceKm(
          currentLocation.latitude,
          currentLocation.longitude,
          nearbyTrain.currentLocation?.latitude || 0,
          nearbyTrain.currentLocation?.longitude || 0
        );

        // Determine collision risk
        const collisionRisk =
          sameTrack && direction === 'opposite'
            ? 'high'
            : sameTrack && direction === 'crossing'
              ? 'medium'
              : 'low';

        analyzed.push({
          trainNumber: nearbyTrain.trainNumber,
          trainName: nearbyTrain.trainName,
          distance: Number(distance.toFixed(2)),
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

  private async isSameTrack(train1: string, train2: string): Promise<boolean> {
    if (!train1 || !train2) {
      return false;
    }

    if (train1.toUpperCase() === train2.toUpperCase()) {
      return true;
    }

    const [primary, secondary] = await Promise.all([
      getTrainData(train1),
      getTrainData(train2),
    ]);

    if (!primary || !secondary) {
      return false;
    }

    if (
      primary.currentStationCode &&
      secondary.currentStationCode &&
      primary.currentStationCode.toUpperCase() === secondary.currentStationCode.toUpperCase()
    ) {
      return true;
    }

    const routeA = await this.getRouteCodeSet(primary.trainNumber, primary);
    const routeB = await this.getRouteCodeSet(secondary.trainNumber, secondary);

    if (!routeA.size || !routeB.size) {
      return false;
    }

    let overlap = 0;
    for (const code of routeA) {
      if (routeB.has(code)) {
        overlap++;
      }
    }

    const smallerRouteSize = Math.max(1, Math.min(routeA.size, routeB.size));
    const overlapRatio = overlap / smallerRouteSize;

    return overlap >= 3 && overlapRatio >= 0.35;
  }

  private async getRouteCodeSet(trainNumber: string, trainData?: any): Promise<Set<string>> {
    const key = trainNumber.toUpperCase();
    const cached = this.routeCodeCache.get(key);
    if (cached) {
      return cached;
    }

    const resolvedData = trainData || await getTrainData(trainNumber);
    const codes = new Set<string>();

    if (resolvedData?.scheduledStations?.length) {
      for (const station of resolvedData.scheduledStations) {
        const code = typeof station?.code === 'string' ? station.code.trim().toUpperCase() : '';
        if (code) {
          codes.add(code);
        }
      }
    }

    this.routeCodeCache.set(key, codes);
    return codes;
  }

  private calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
      return 0;
    }

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const networkIntelligenceService = new NetworkIntelligenceService();

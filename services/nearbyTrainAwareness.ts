/**
 * Nearby Train Awareness Service
 * Detects and analyzes trains within proximity range
 * Enables:
 * - Collision avoidance analysis
 * - Traffic crossing detection
 * - Convoy formation analysis
 * - Signal impact from nearby trains
 */

import { TrainData } from '@/types/train';

export interface NearbyTrain {
  trainNumber: string;
  trainName: string;
  distance: number; // km from reference train
  bearing: number; // 0-360 degrees (0=North, 90=East, etc)
  speed: number; // km/h
  delay: number; // minutes
  heading: string; // N, NE, E, SE, S, SW, W, NW
  isCrossingPath: boolean;
  estimatedCrossingTime?: number; // minutes until crossing
  convergenceRate: number; // km/h approaching/diverging
}

export interface NearbyTrainsAnalysis {
  referenceTrainNumber: string;
  referenceLocation: { latitude: number; longitude: number };
  nearbyTrains: NearbyTrain[];
  summary: {
    count: number;
    convergingTrains: number; // Moving towards reference
    divergingTrains: number; // Moving away
    potentialCrossings: number; // Paths crossing
  };
  riskLevel: 'low' | 'medium' | 'high'; // Traffic risk
  recommendation: string;
}

class NearbyTrainAwareness {
  /**
   * Detect and analyze nearby trains
   */
  analyzeNearbyTrains(
    referenceTrain: TrainData,
    allTrains: TrainData[],
    proximityRangeKm: number = 50
  ): NearbyTrainsAnalysis {
    const nearbyList: NearbyTrain[] = [];

    for (const otherTrain of allTrains) {
      // Skip self
      if (otherTrain.trainNumber === referenceTrain.trainNumber) continue;

      // Calculate distance
      const distance = this.calculateDistance(
        referenceTrain.currentLocation.latitude,
        referenceTrain.currentLocation.longitude,
        otherTrain.currentLocation.latitude,
        otherTrain.currentLocation.longitude
      );

      // Skip if too far
      if (distance > proximityRangeKm) continue;

      // Calculate bearing (direction)
      const bearing = this.calculateBearing(
        referenceTrain.currentLocation.latitude,
        referenceTrain.currentLocation.longitude,
        otherTrain.currentLocation.latitude,
        otherTrain.currentLocation.longitude
      );

      // Check if paths crossing
      const isCrossing = this.arePathsCrossing(
        referenceTrain,
        otherTrain,
        distance
      );

      // Calculate convergence rate
      const convergenceRate = this.calculateConvergenceRate(
        referenceTrain,
        otherTrain,
        bearing
      );

      // Estimate crossing time if applicable
      let estimatedCrossingTime: number | undefined;
      if (isCrossing && Math.abs(convergenceRate) > 0.5) {
        estimatedCrossingTime = distance / Math.abs(convergenceRate);
      }

      nearbyList.push({
        trainNumber: otherTrain.trainNumber,
        trainName: otherTrain.trainName,
        distance: Math.round(distance * 10) / 10, // 1 decimal
        bearing: Math.round(bearing),
        speed: otherTrain.speed || 0,
        delay: otherTrain.delay || 0,
        heading: this.bearingToDirection(bearing),
        isCrossingPath: isCrossing,
        estimatedCrossingTime,
        convergenceRate: Math.round(convergenceRate * 10) / 10,
      });
    }

    // Sort by distance (closest first)
    nearbyList.sort((a, b) => a.distance - b.distance);

    // Analyze summary
    const convergingTrains = nearbyList.filter(t => t.convergenceRate < -5).length;
    const divergingTrains = nearbyList.filter(t => t.convergenceRate > 5).length;
    const potentialCrossings = nearbyList.filter(t => t.isCrossingPath).length;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (potentialCrossings > 2) riskLevel = 'high';
    else if (potentialCrossings > 0 || convergingTrains > 3) riskLevel = 'medium';

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      riskLevel,
      potentialCrossings,
      convergingTrains
    );

    return {
      referenceTrainNumber: referenceTrain.trainNumber,
      referenceLocation: referenceTrain.currentLocation,
      nearbyTrains: nearbyList,
      summary: {
        count: nearbyList.length,
        convergingTrains,
        divergingTrains,
        potentialCrossings,
      },
      riskLevel,
      recommendation,
    };
  }

  /**
   * Calculate Haversine distance between two coordinates (km)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing (direction) from point A to B
   * Returns 0-360 degrees (0=North, 90=East, 180=South, 270=West)
   */
  private calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(dLon);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360; // Ensure 0-360
  }

  /**
   * Convert bearing to cardinal direction
   */
  private bearingToDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(bearing / 45) % 8;
    return directions[idx];
  }

  /**
   * Check if two train paths are crossing
   */
  private arePathsCrossing(train1: TrainData, train2: TrainData, distance: number): boolean {
    // Simple heuristic: if trains are within 10km and moving
    if (distance > 10) return false;

    const bothMoving = (train1.speed || 0) > 0 && (train2.speed || 0) > 0;

    // Simplified: consider crossing if both moving and within close range
    return bothMoving;
  }

  /**
   * Calculate convergence rate (positive = diverging, negative = converging)
   */
  private calculateConvergenceRate(
    train1: TrainData,
    train2: TrainData,
    bearing: number
  ): number {
    // Simplified: use speeds and bearing to estimate convergence
    const train1Speed = train1.speed || 0;
    const train2Speed = train2.speed || 0;

    // Rough estimate: if both moving, assume some convergence based on bearing
    const bearingRadian = bearing * (Math.PI / 180);

    // Simple heuristic: trains on same heading converge less
    const convergence = Math.sin(bearingRadian) * (train2Speed - train1Speed) / 10;

    return convergence;
  }

  /**
   * Generate recommendation based on risk analysis
   */
  private generateRecommendation(
    riskLevel: string,
    crossings: number,
    converging: number
  ): string {
    if (riskLevel === 'high') {
      return `🚨 High traffic risk: ${crossings} potential crossing(s), ${converging} converging trains. Maintain caution.`;
    } else if (riskLevel === 'medium') {
      return `⚠️ Moderate traffic: Monitor nearby trains, especially ${crossings} crossing path(s).`;
    } else {
      return '✓ No significant traffic conflicts detected. Clear path.';
    }
  }

  /**
   * Calculate time until potential collision at current trajectory
   */
  calculateCollisionTime(train1: TrainData, train2: TrainData): number | null {
    const distance = this.calculateDistance(
      train1.currentLocation.latitude,
      train1.currentLocation.longitude,
      train2.currentLocation.latitude,
      train2.currentLocation.longitude
    );

    const relativeSpeed = train1.speed + train2.speed; // Closing speed in opposite directions
    if (relativeSpeed === 0) return null;

    // Time in minutes until they meet
    return (distance / relativeSpeed) * 60;
  }
}

const nearbyTrainAwareness = new NearbyTrainAwareness();
export default nearbyTrainAwareness;

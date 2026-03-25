/**
 * Traffic Analysis Service (Phase 12+)
 * Analyzes train congestion and section occupancy using
 * REAL train position data from realTimePositionService
 *
 * Features:
 * - Railway section occupancy detection
 * - Congestion scoring (0-100)
 * - Bottleneck identification
 * - Route optimization suggestions
 * - Real-time traffic patterns
 */

import { realTimePositionService } from './realTimePositionService';
import { getAllTrains, getTrainByNumber } from './realTrainsCatalog';

/**
 * Railway section with occupancy info
 */
export interface RailwaySection {
  sectionCode: string;
  name: string;
  startPoint: string;
  endPoint: string;
  distance: number; // km
  trainsOnSection: string[]; // array of train numbers
  occupancyCount: number;
  occupancyPercentage: number;
  congestionScore: number; // 0-100
  expectedDelay: number; // minutes due to congestion
  status: 'Free' | 'Moderate' | 'Heavy' | 'Critical';
}

/**
 * Traffic zone with aggregated metrics
 */
export interface TrafficZone {
  zone: string;
  region: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  totalTrains: number;
  congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  avgDelay: number; // minutes
  bottlenecks: RailwaySection[];
  travelTime: {
    normal: number; // minutes
    current: number; // minutes with delays
  };
}

/**
 * Traffic pattern for time-series analysis
 */
export interface TrafficPattern {
  timestamp: number;
  activeTrains: number;
  avgSpeed: number;
  congestionLevel: number; // 0-100
  incidents: string[];
}

class TrafficAnalysisService {
  private trafficHistory: TrafficPattern[] = [];
  private maxHistoryPoints = 1440; // 24 hours at 1-min intervals

  /**
   * Analyze occupancy on a specific railway section
   * Simulates real sections between major stations
   */
  analyzeSection(sectionCode: string, startLat: number, startLng: number, endLat: number, endLng: number): RailwaySection {
    const positions = realTimePositionService.getAllPositions();
    const EARTH_RADIUS_KM = 6371;

    // Find trains between start and end points
    const trainsOnSection = positions.filter((pos) => {
      // Simple heuristic: train is "on section" if position is between start/end
      const isInLatRange = (pos.currentLat >= Math.min(startLat, endLat) &&
        pos.currentLat <= Math.max(startLat, endLat));
      const isInLngRange = (pos.currentLng >= Math.min(startLng, endLng) &&
        pos.currentLng <= Math.max(startLng, endLng));
      return isInLatRange && isInLngRange;
    });

    // Calculate section distance
    const latDiff = (endLat - startLat) * Math.PI / 180;
    const lngDiff = (endLng - startLng) * Math.PI / 180;
    const a =
      Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
      Math.cos(startLat * Math.PI / 180) *
        Math.cos(endLat * Math.PI / 180) *
        Math.sin(lngDiff / 2) *
        Math.sin(lngDiff / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const sectionDistance = EARTH_RADIUS_KM * c;

    // Calculate occupancy
    const maxCapacity = 5; // Maximum concurrent trains on section
    const occupancyCount = trainsOnSection.length;
    const occupancyPercentage = (occupancyCount / maxCapacity) * 100;

    // Calculate congestion score
    let congestionScore = occupancyPercentage;
    if (trainsOnSection.some((pos) => pos.status === 'Delayed')) {
      congestionScore += 20; // Increased due to delays
    }
    if (trainsOnSection.some((pos) => pos.estimatedDelay > 30)) {
      congestionScore += 10; // Heavy delays
    }
    congestionScore = Math.min(100, congestionScore);

    // Determine status
    let status: 'Free' | 'Moderate' | 'Heavy' | 'Critical';
    if (congestionScore < 25) status = 'Free';
    else if (congestionScore < 50) status = 'Moderate';
    else if (congestionScore < 75) status = 'Heavy';
    else status = 'Critical';

    // Estimate delay from congestion
    const expectedDelay = Math.ceil(congestionScore / 20); // 0-5 minutes based on score

    return {
      sectionCode,
      name: `Section ${sectionCode}`,
      startPoint: `(${startLat.toFixed(2)}, ${startLng.toFixed(2)})`,
      endPoint: `(${endLat.toFixed(2)}, ${endLng.toFixed(2)})`,
      distance: sectionDistance,
      trainsOnSection: trainsOnSection.map((pos) => pos.trainNumber),
      occupancyCount,
      occupancyPercentage: Math.round(occupancyPercentage),
      congestionScore: Math.round(congestionScore),
      expectedDelay,
      status,
    };
  }

  /**
   * Analyze traffic in a geographic zone
   */
  analyzeZone(
    zone: string,
    region: string,
    centerLat: number,
    centerLng: number,
    radiusKm: number = 100
  ): TrafficZone {
    const trainsInZone = realTimePositionService.getPositionsByRegion(centerLat, centerLng, radiusKm);

    // Calculate metrics
    const congestionCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    const avgDelaySum = trainsInZone.reduce((sum, train) => sum + train.estimatedDelay, 0);
    const avgDelay = trainsInZone.length > 0 ? Math.round(avgDelaySum / trainsInZone.length) : 0;

    trainsInZone.forEach((train) => {
      if (train.currentSpeed > 50) congestionCounts.LOW++;
      else if (train.currentSpeed > 20) congestionCounts.MEDIUM++;
      else if (train.currentSpeed > 5) congestionCounts.HIGH++;
      else congestionCounts.CRITICAL++;
    });

    // Determine overall congestion level
    const totalTrains = trainsInZone.length;
    let congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (totalTrains > 8) congestionLevel = 'CRITICAL';
    else if (totalTrains > 6) congestionLevel = 'HIGH';
    else if (totalTrains > 4) congestionLevel = 'MEDIUM';

    // Identify bottlenecks (simulated sections)
    const bottlenecks = [
      this.analyzeSection(`${zone}-S1`, centerLat, centerLng, centerLat + 0.5, centerLng + 0.5),
      this.analyzeSection(`${zone}-S2`, centerLat + 0.5, centerLng + 0.5, centerLat + 1, centerLng),
      this.analyzeSection(`${zone}-S3`, centerLat + 1, centerLng, centerLat, centerLng - 0.5),
    ].filter((s) => s.occupancyCount > 0);

    // Calculate travel time impact
    const normalTravelTime = 120; // baseline 2 hours
    const delayFactor = congestionLevel === 'CRITICAL' ? 1.5 : congestionLevel === 'HIGH' ? 1.3 : 1.1;
    const currentTravelTime = Math.ceil(normalTravelTime * delayFactor);

    return {
      zone,
      region,
      bounds: {
        north: centerLat + radiusKm / 111,
        south: centerLat - radiusKm / 111,
        east: centerLng + radiusKm / 111,
        west: centerLng - radiusKm / 111,
      },
      totalTrains,
      congestionLevel,
      avgDelay,
      bottlenecks,
      travelTime: {
        normal: normalTravelTime,
        current: currentTravelTime,
      },
    };
  }

  /**
   * Get all major bottlenecks across India
   */
  identifyBottlenecks(): RailwaySection[] {
    // Pre-defined major junction areas
    const majorJunctions = [
      { name: 'Delhi Region', lat: 28.6, lng: 77.2 },
      { name: 'Mumbai Region', lat: 19.0, lng: 72.8 },
      { name: 'Bangalore Region', lat: 12.9, lng: 77.6 },
      { name: 'Hyderabad Region', lat: 17.3, lng: 78.5 },
      { name: 'Kolkata Region', lat: 22.5, lng: 88.3 },
    ];

    const bottlenecks = majorJunctions
      .map((junction, index) => {
        // Analyze a section around each junction
        return this.analyzeSection(
          `JUNCTION-${index + 1}`,
          junction.lat - 0.5,
          junction.lng - 0.5,
          junction.lat + 0.5,
          junction.lng + 0.5
        );
      })
      .filter((section) => section.congestionScore > 30)
      .sort((a, b) => b.congestionScore - a.congestionScore);

    return bottlenecks;
  }

  /**
   * Record current traffic pattern for historical analysis
   */
  recordTrafficPattern(): void {
    const positions = realTimePositionService.getAllPositions();
    const avgSpeed = positions.length > 0 ?
      positions.reduce((sum, pos) => sum + pos.currentSpeed, 0) / positions.length : 0;

    const pattern: TrafficPattern = {
      timestamp: Date.now(),
      activeTrains: positions.length,
      avgSpeed: Math.round(avgSpeed),
      congestionLevel: positions.filter((p) => p.currentSpeed < 30).length / positions.length * 100,
      incidents: positions
        .filter((p) => p.estimatedDelay > 20)
        .map((p) => `Train ${p.trainNumber}: ${p.estimatedDelay}min delay`),
    };

    this.trafficHistory.push(pattern);

    // Keep history limited
    if (this.trafficHistory.length > this.maxHistoryPoints) {
      this.trafficHistory.shift();
    }
  }

  /**
   * Get traffic trends over time
   */
  getTrafficTrends(minutesBack: number = 60): TrafficPattern[] {
    const cutoffTime = Date.now() - minutesBack * 60 * 1000;
    return this.trafficHistory.filter((pattern) => pattern.timestamp > cutoffTime);
  }

  /**
   * Suggest alternate routes based on current congestion
   */
  suggestAlternateRoutes(sourceTrain: string, targetZone: string): string[] {
    const trainInfo = getTrainByNumber(sourceTrain);
    if (!trainInfo) return [];

    // Get current bottlenecks
    const bottlenecks = this.identifyBottlenecks();

    // Simple heuristic: suggest avoiding zones with critical congestion
    const suggestions: string[] = [];

    if (bottlenecks.length > 0) {
      suggestions.push(
        `Avoid route through: ${bottlenecks
          .slice(0, 2)
          .map((b) => b.name)
          .join(', ')}`
      );
    }

    // Additional suggestions based on train type
    if (trainInfo.type === 'Express') {
      suggestions.push('Express trains recommended on main trunk routes');
    } else if (trainInfo.type === 'Passenger') {
      suggestions.push('Consider slower routes for passenger trains during peak hours');
    }

    return suggestions;
  }
}

// Singleton instance
export const trafficAnalysisService = new TrafficAnalysisService();

// Record traffic patterns every 60 seconds
setInterval(() => {
  trafficAnalysisService.recordTrafficPattern();
}, 60000);

export default trafficAnalysisService;

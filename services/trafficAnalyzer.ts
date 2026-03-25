/**
 * Traffic Analyzer
 * Detects congestion by analyzing nearby trains
 * Determines traffic density and impact on current train
 */

import { TrainData, TrainInfo, TrafficAnalysis } from '@/types/train';
import { calculateDistance } from '@/lib/utils';
import { findNearbyTrains } from './railYatriService';

/**
 * Configuration for traffic analysis
 */
const TRAFFIC_CONFIG = {
  DETECTION_RADIUS_KM: 5, // Look for trains within 5km radius
  LOW_THRESHOLD: 1, // 0-1 trains = LOW traffic
  MEDIUM_THRESHOLD: 3, // 2-3 trains = MEDIUM traffic
  // 4+ trains = HIGH traffic
};

/**
 * Analyze traffic around a train
 * Returns congestion level and nearby trains using real data
 *
 * Algorithm (Real Data):
 * 1. Use Haversine distance to find truly nearby trains via RailYatri
 * 2. Filter by detection radius (5km)
 * 3. Determine congestion level based on count
 * 4. Return traffic analysis with real nearby trains
 */
export async function analyzeTrafficAround(
  trainData: TrainData,
  allTrains?: TrainData[]
): Promise<TrafficAnalysis> {
  const { latitude, longitude } = trainData.currentLocation;

  try {
    // Try to get real nearby trains from RailYatri with Haversine distance
    const realNearbyTrainsData = await findNearbyTrains(
      latitude,
      longitude,
      TRAFFIC_CONFIG.DETECTION_RADIUS_KM
    );

    // Convert to TrainInfo format
    const nearbyTrains: TrainInfo[] = realNearbyTrainsData.map((train) => ({
      trainNumber: train.trainNumber,
      trainName: `Train ${train.trainNumber}`, // Fallback name
      distance: train.distance,
      location: {
        latitude: train.lat,
        longitude: train.lng,
        timestamp: Date.now(),
      },
    }));

    // If we got real data, use it; otherwise fall back to mock data from allTrains
    if (nearbyTrains.length > 0) {
      // Determine congestion level
      let congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH';

      if (nearbyTrains.length <= TRAFFIC_CONFIG.LOW_THRESHOLD) {
        congestionLevel = 'LOW';
      } else if (nearbyTrains.length <= TRAFFIC_CONFIG.MEDIUM_THRESHOLD) {
        congestionLevel = 'MEDIUM';
      } else {
        congestionLevel = 'HIGH';
      }

      return {
        congestionLevel,
        nearbyTrainsCount: nearbyTrains.length,
        nearbyTrains: nearbyTrains.slice(0, 5),
        radiusKm: TRAFFIC_CONFIG.DETECTION_RADIUS_KM,
      };
    }

    // Fallback to mock data if real data unavailable
    if (!allTrains || allTrains.length === 0) {
      return {
        congestionLevel: 'LOW',
        nearbyTrainsCount: 0,
        nearbyTrains: [],
        radiusKm: TRAFFIC_CONFIG.DETECTION_RADIUS_KM,
      };
    }
  } catch (err) {
    console.warn('[TrafficAnalyzer] Real traffic lookup failed, using mock:', err);
  }

  // Fallback: use provided mock trains
  const nearbyTrains: TrainInfo[] = [];

  if (allTrains) {
    for (const otherTrain of allTrains) {
      // Skip self
      if (otherTrain.trainNumber === trainData.trainNumber) {
        continue;
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        otherTrain.currentLocation.latitude,
        otherTrain.currentLocation.longitude
      );

      // Include trains within detection radius
      if (distance <= TRAFFIC_CONFIG.DETECTION_RADIUS_KM) {
        nearbyTrains.push({
          trainNumber: otherTrain.trainNumber,
          trainName: otherTrain.trainName,
          distance: parseFloat(distance.toFixed(2)),
          location: otherTrain.currentLocation,
        });
      }
    }
  }

  // Sort by distance (closest first)
  nearbyTrains.sort((a, b) => a.distance - b.distance);

  // Determine congestion level
  let congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  if (nearbyTrains.length <= TRAFFIC_CONFIG.LOW_THRESHOLD) {
    congestionLevel = 'LOW';
  } else if (nearbyTrains.length <= TRAFFIC_CONFIG.MEDIUM_THRESHOLD) {
    congestionLevel = 'MEDIUM';
  } else {
    congestionLevel = 'HIGH';
  }

  return {
    congestionLevel,
    nearbyTrainsCount: nearbyTrains.length,
    nearbyTrains: nearbyTrains.slice(0, 5),
    radiusKm: TRAFFIC_CONFIG.DETECTION_RADIUS_KM,
  };
}

/**
 * Get traffic factor for wait time calculation
 * Returns multiplier to apply to wait time (1.0 = no traffic impact)
 *
 * LOW: 1.0x normal
 * MEDIUM: 1.3x normal
 * HIGH: 1.8x normal
 */
export function getTrafficWaitFactor(congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH'): number {
  const factors: Record<string, number> = {
    LOW: 1.0,
    MEDIUM: 1.3,
    HIGH: 1.8,
  };

  return factors[congestionLevel] || 1.0;
}

/**
 * Analyze if traffic is getting better or worse
 * Compares train count changes over time
 */
export function analyzeTrafficTrend(
  currentTraffic: TrafficAnalysis,
  previousTraffic?: TrafficAnalysis
): 'improving' | 'stable' | 'worsening' {
  if (!previousTraffic) {
    return 'stable';
  }

  const difference = currentTraffic.nearbyTrainsCount - previousTraffic.nearbyTrainsCount;

  if (difference > 0) return 'worsening';
  if (difference < 0) return 'improving';
  return 'stable';
}

/**
 * Get human-readable congestion description
 */
export function getTrafficDescription(traffic: TrafficAnalysis): string {
  const { congestionLevel, nearbyTrainsCount } = traffic;

  switch (congestionLevel) {
    case 'LOW':
      return nearbyTrainsCount === 0
        ? 'Clear track - no traffic detected'
        : `Light traffic - ${nearbyTrainsCount} train${nearbyTrainsCount > 1 ? 's' : ''} nearby`;

    case 'MEDIUM':
      return `Moderate traffic - ${nearbyTrainsCount} trains in area`;

    case 'HIGH':
      return `Heavy congestion - ${nearbyTrainsCount} trains detected`;

    default:
      return 'Traffic level unknown';
  }
}

/**
 * Calculate cumulative traffic impact multiple
 * Includes both number of trains and their distances
 */
export function calculateTrafficImpact(traffic: TrafficAnalysis): number {
  let impact = 1.0;

  // Base factor from congestion level
  impact *= getTrafficWaitFactor(traffic.congestionLevel);

  // Reduce impact based on distance of nearest trains
  if (traffic.nearbyTrains.length > 0) {
    const nearestDistance = traffic.nearbyTrains[0].distance;
    // Trains very close (< 1km) have higher impact
    if (nearestDistance < 1) {
      impact *= 1.2;
    } else if (nearestDistance < 2) {
      impact *= 1.1;
    }
  }

  return impact;
}

/**
 * Check if traffic conditions warrant alert
 */
export function shouldAlertTraffic(traffic: TrafficAnalysis): boolean {
  // Alert if HIGH congestion or multiple very close trains
  if (traffic.congestionLevel === 'HIGH') {
    return true;
  }

  const veryCloseTrains = traffic.nearbyTrains.filter((t) => t.distance < 0.5).length;
  if (veryCloseTrains >= 2) {
    return true;
  }

  return false;
}

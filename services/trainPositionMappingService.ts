/**
 * Train Position Mapping Service
 * Maps GPS coordinates to train route and determines current station
 * Implements haversine distance calculation for accuracy
 */

import {
  getStaticTrain,
  findNearestStation,
  calculateGreatCircleDistance,
  StaticTrain,
  StaticStation,
  StationInfo,
} from '@/services/staticRailwayDatabase';

export interface TrainPositionMapping {
  trainNumber: string;
  currentLatitude: number;
  currentLongitude: number;
  nearestStation: StaticStation & { distance: number };
  previousStation: StaticStation | null;
  nextStation: StaticStation | null;
  status: 'approaching' | 'at-station' | 'departed' | 'unknown';
  distanceToNextStation: number;
  progress: number; // 0-100, position in route
}

/**
 * Map GPS coordinates to train position in route
 */
export async function mapTrainPosition(
  trainNumber: string,
  latitude: number,
  longitude: number
): Promise<TrainPositionMapping | null> {
  try {
    const train = await getStaticTrain(trainNumber);
    if (!train) {
      console.error(`Train ${trainNumber} not found`);
      return null;
    }

    // Find nearest station on the route
    const nearestStation = findNearestStationOnRoute(
      train.route,
      latitude,
      longitude
    );

    if (!nearestStation) {
      return null;
    }

    // Determine position within route
    const { previousStation, nextStation, status, distanceToNext } =
      determineRoutePosition(train.route, nearestStation);

    // Calculate progress as percentage of total route
    const totalDistance = calculateRouteTotalDistance(train.route);
    const distanceToNearest = calculateGreatCircleDistance(
      latitude,
      longitude,
      nearestStation.latitude,
      nearestStation.longitude
    );
    const progress = calculateProgress(train.route, nearestStation, distanceToNearest);

    return {
      trainNumber,
      currentLatitude: latitude,
      currentLongitude: longitude,
      nearestStation: {
        ...nearestStation,
        distance: distanceToNearest,
      },
      previousStation,
      nextStation,
      status,
      distanceToNextStation: distanceToNext,
      progress,
    };
  } catch (error) {
    console.error('Error mapping train position:', error);
    return null;
  }
}

/**
 * Find nearest station on the train's route
 */
function findNearestStationOnRoute(
  route: StaticStation[],
  latitude: number,
  longitude: number
): (StaticStation & {
  distanceFromTrain: number;
  routeIndex: number;
}) | null {
  let nearest: (StaticStation & {
    distanceFromTrain: number;
    routeIndex: number;
  }) | null = null;
  let minDistance = Infinity;

  for (let i = 0; i < route.length; i++) {
    const stop = route[i];
    const distance = calculateGreatCircleDistance(
      latitude,
      longitude,
      stop.latitude,
      stop.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = {
        ...stop,
        distanceFromTrain: distance,
        routeIndex: i,
      };
    }
  }

  return minDistance > 100 ? null : nearest; // Only return if within 100 km
}

/**
 * Determine if train is approaching, at, or departed from station
 */
function determineRoutePosition(
  route: StaticStation[],
  currentNearest: StaticStation & { distanceFromTrain: number; routeIndex: number }
) {
  const index = currentNearest.routeIndex;
  const previousStation = index > 0 ? route[index - 1] : null;
  const nextStation = index < route.length - 1 ? route[index + 1] : null;

  // Determine status based on arrival/departure times and distance
  let status: 'approaching' | 'at-station' | 'departed' | 'unknown' = 'unknown';

  if (currentNearest.distanceFromTrain < 5) {
    // Within 5 km = at station
    status = 'at-station';
  } else if (
    !previousStation ||
    currentNearest.distanceFromTrain < calculateGreatCircleDistance(
      previousStation.latitude,
      previousStation.longitude,
      currentNearest.latitude,
      currentNearest.longitude
    ) / 2
  ) {
    // Closer to this station than previous = approaching
    status = 'approaching';
  } else {
    status = 'departed';
  }

  // Calculate distance to next station
  let distanceToNext = Infinity;
  if (nextStation) {
    distanceToNext = calculateGreatCircleDistance(
      currentNearest.latitude,
      currentNearest.longitude,
      nextStation.latitude,
      nextStation.longitude
    );
  }

  return { previousStation, nextStation, status, distanceToNext };
}

/**
 * Calculate total distance of the route
 */
function calculateRouteTotalDistance(route: StaticStation[]): number {
  if (route.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += calculateGreatCircleDistance(
      route[i - 1].latitude,
      route[i - 1].longitude,
      route[i].latitude,
      route[i].longitude
    );
  }

  return total;
}

/**
 * Calculate train's progress as percentage through route
 */
function calculateProgress(
  route: StaticStation[],
  nearestStation: StaticStation & { routeIndex: number },
  distanceToNearest: number
): number {
  const index = nearestStation.routeIndex;
  const totalDistance = calculateRouteTotalDistance(route);

  if (totalDistance === 0) return 0;

  // Estimate distance covered up to nearest station
  let distanceCovered = 0;
  for (let i = 1; i <= index; i++) {
    distanceCovered += calculateGreatCircleDistance(
      route[i - 1].latitude,
      route[i - 1].longitude,
      route[i].latitude,
      route[i].longitude
    );
  }

  // Add distance from train to nearest station
  const estimatedProgress = (distanceCovered + distanceToNearest) / totalDistance;
  return Math.min(100, Math.max(0, estimatedProgress * 100));
}

/**
 * Validate if coordinates are within expected route area
 */
export function isWithinRouteArea(
  trainRoute: StaticStation[],
  latitude: number,
  longitude: number,
  toleranceKm: number = 200
): boolean {
  const source = trainRoute[0];
  const destination = trainRoute[trainRoute.length - 1];

  // Get bounding box with tolerance
  const minLat = Math.min(source.latitude, destination.latitude) - 1;
  const maxLat = Math.max(source.latitude, destination.latitude) + 1;
  const minLon = Math.min(source.longitude, destination.longitude) - 1;
  const maxLon = Math.max(source.longitude, destination.longitude) + 1;

  // Check if point is within bounding box
  if (latitude < minLat || latitude > maxLat) return false;
  if (longitude < minLon || longitude > maxLon) return false;

  // Check if point is within tolerance distance of route
  for (const stop of trainRoute) {
    const distance = calculateGreatCircleDistance(
      latitude,
      longitude,
      stop.latitude,
      stop.longitude
    );
    if (distance <= toleranceKm) return true;
  }

  return false;
}

export default {
  mapTrainPosition,
  isWithinRouteArea,
};

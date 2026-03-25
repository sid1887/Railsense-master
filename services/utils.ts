/**
 * Utility functions for geo calculations and helpers
 */

/**
 * Haversine distance between two points
 * @returns distance in kilometers
 */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Haversine distance in meters
 */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversine(lat1, lng1, lat2, lng2) * 1000;
}

/**
 * Linear interpolation between two points
 * @param t - progress from 0 to 1
 */
export function interpolateCoords(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  t: number
): { lat: number; lng: number } {
  return {
    lat: lat1 + (lat2 - lat1) * t,
    lng: lng1 + (lng2 - lng1) * t,
  };
}

/**
 * Bearing between two points (in degrees, 0-360)
 */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  return (angle + 360) % 360;
}

/**
 * Mock/simple map-matcher
 * In production, snap to OSM/ORM rail segments
 */
export function mapMatchToNearestStation(
  lat: number,
  lng: number,
  stationList: any[]
): { station_index: number; section_id: string | null; distance_m: number } | null {
  if (!stationList || stationList.length === 0) return null;

  let minDist = Infinity;
  let nearestIdx = -1;

  for (let i = 0; i < stationList.length; i++) {
    const station = stationList[i];
    const dist = haversineMeters(
      lat,
      lng,
      station.latitude || station.lat,
      station.longitude || station.lng
    );
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  if (nearestIdx < 0) return null;

  return {
    station_index: nearestIdx,
    section_id: null, // would be populated by real map-matcher
    distance_m: minDist,
  };
}

/**
 * Smooth a value using exponential moving average
 */
export function exponentialMovingAverage(oldValue: number, newValue: number, alpha: number = 0.3): number {
  return alpha * newValue + (1 - alpha) * oldValue;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Sleep (async delay)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format duration in seconds as human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Get distance category for display
 */
export function getDistanceCategory(meters: number): 'very_close' | 'close' | 'nearby' | 'far' {
  if (meters < 50) return 'very_close';
  if (meters < 200) return 'close';
  if (meters < 1000) return 'nearby';
  return 'far';
}

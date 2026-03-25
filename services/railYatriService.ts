/**
 * RailYatri Service
 * Fetches live train position data from public endpoints
 */

import { TrainData } from '@/types/train';

interface LiveTrainResponse {
  train_no: string;
  lat: number;
  lng: number;
  speed: number;
  delay: number;
  timestamp: number;
  status?: string;
  next_station?: string;
}

/**
 * Try multiple RailYatri endpoint patterns
 */
const RAILYATRI_ENDPOINTS = [
  (trainNo: string) => `https://www.railyatri.in/api/v1/live/train/${trainNo}`,
  (trainNo: string) => `https://www.railyatri.in/api/live/train/${trainNo}`,
  (trainNo: string) => `https://railyatri.in/api/train/live/${trainNo}`,
];

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  timeout: number = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Fetch live train position from RailYatri
 */
export async function getLiveTrainPosition(
  trainNumber: string
): Promise<LiveTrainResponse | null> {
  for (const endpoint of RAILYATRI_ENDPOINTS) {
    try {
      const url = endpoint(trainNumber);
      const response = await fetchWithTimeout(url, 5000);

      if (response.ok) {
        const data = await response.json();
        console.log(`[RailYatri] Got live data for train ${trainNumber}`);
        return data;
      }
    } catch (err) {
      console.warn(`[RailYatri] Endpoint failed: ${endpoint(trainNumber)}`);
    }
  }

  return null;
}

/**
 * Get multiple trains near a location from live data
 * This requires aggregating from RailYatri's live map
 */
export async function getNearbyTrainsLive(
  latitude: number,
  longitude: number,
  radiusKm: number = 5
): Promise<TrainData[]> {
  // This would require accessing RailYatri's live map data
  // For now, returns empty (fallback to mock in trainDataService)
  return [];
}

/**
 * Haversine distance calculation between two coordinates
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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
 * Check if train is halted based on live data
 */
export function detectHaltFromLiveData(
  liveData: LiveTrainResponse,
  previousData?: LiveTrainResponse
): { isHalted: boolean; duration?: number } {
  // Halt detection: speed = 0
  if (liveData.speed === 0) {
    return { isHalted: true };
  }

  // If we have previous data, check if position unchanged for a while
  if (previousData) {
    const latDiff = Math.abs(liveData.lat - previousData.lat);
    const lngDiff = Math.abs(liveData.lng - previousData.lng);

    // Position unchanged (within 0.0001 degrees ~ 10 meters)
    if (latDiff < 0.0001 && lngDiff < 0.0001) {
      const timeDiff = (liveData.timestamp - previousData.timestamp) / 1000 / 60; // minutes
      if (timeDiff > 2) {
        return { isHalted: true, duration: timeDiff };
      }
    }
  }

  return { isHalted: false };
}

/**
 * Location history for tracking halt duration
 * Stores last 10 readings (~10 minutes of history)
 */
const locationHistoryCache = new Map<
  string,
  { lat: number; lng: number; timestamp: number }[]
>();

/**
 * Update location history for a train
 * Used to detect halts over time
 */
export function updateLocationHistory(
  trainNumber: string,
  lat: number,
  lng: number,
  timestamp: number
): void {
  const key = trainNumber.toUpperCase();
  const history = locationHistoryCache.get(key) || [];

  history.push({ lat, lng, timestamp });

  // Keep only last 10 entries (~1 per minute, 10 min window)
  if (history.length > 10) {
    history.shift();
  }

  locationHistoryCache.set(key, history);
}

/**
 * Detect halt from location history
 * True halt = speed = 0 AND same coordinates for 5+ minutes
 */
export function detectHaltFromHistory(
  trainNumber: string,
  currentSpeed: number
): { isHalted: boolean; duration: number } {
  // Quick check: if moving, not halted
  if (currentSpeed > 1) {
    return { isHalted: false, duration: 0 };
  }

  const key = trainNumber.toUpperCase();
  const history = locationHistoryCache.get(key);

  if (!history || history.length < 2) {
    return { isHalted: false, duration: 0 };
  }

  const current = history[history.length - 1];
  let stationaryStart = current.timestamp;
  let isStationary = true;

  // Check backward through history for location consistency
  for (let i = history.length - 2; i >= 0; i--) {
    const prev = history[i];
    const distance = calculateDistance(current.lat, current.lng, prev.lat, prev.lng);

    // If moved more than 111 meters (0.001 degree), not stationary
    if (distance > 0.111) {
      isStationary = false;
      break;
    }

    stationaryStart = prev.timestamp;
  }

  if (!isStationary) {
    return { isHalted: false, duration: 0 };
  }

  // Calculate halt duration in minutes
  const duration = (current.timestamp - stationaryStart) / 1000 / 60;

  // True halt = 5+ minutes stationary
  return {
    isHalted: duration >= 5,
    duration: Math.round(duration),
  };
}

/**
 * Find nearby trains using Haversine distance
 * Fetches parallel requests for major trains
 */
export async function findNearbyTrains(
  latitude: number,
  longitude: number,
  radiusKm: number = 5
): Promise<
  Array<{
    trainNumber: string;
    distance: number;
    lat: number;
    lng: number;
    speed: number;
  }>
> {
  // Major Indian trains to check
  const majorTrains = [
    '12702', '12723', '12724', '12625', '12723', '17015', '11039',
    '19402', '14804', '22696', '16032', '18533', '12144', '22112',
  ];

  try {
    // Fetch all trains in parallel
    const results = await Promise.allSettled(
      majorTrains.map((trainNo: string) =>
        getLiveTrainPosition(trainNo)
      )
    );

    const nearbyTrains: Array<{
      trainNumber: string;
      distance: number;
      lat: number;
      lng: number;
      speed: number;
    }> = [];

    for (let i: number = 0; i < results.length; i++) {
      const result = results[i];
      if (
        result.status === 'fulfilled' &&
        result.value?.lat !== undefined &&
        result.value?.lng !== undefined
      ) {
        const distance = calculateDistance(
          latitude,
          longitude,
          result.value.lat,
          result.value.lng
        );

        if (distance <= radiusKm && distance > 0) {
          nearbyTrains.push({
            trainNumber: majorTrains[i],
            distance: parseFloat(distance.toFixed(2)),
            lat: result.value.lat,
            lng: result.value.lng,
            speed: result.value.speed || 0,
          });
        }
      }
    }

    // Sort by distance
    return nearbyTrains.sort((a, b) => a.distance - b.distance);
  } catch (err) {
    console.warn('[RailYatri] findNearbyTrains failed:', err);
    return [];
  }
}

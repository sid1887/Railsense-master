/**
 * Live Train Data Service
 * Fetches real-time train position and delay data from multiple sources
 * Sources: NTES, RailYatri APIs
 */

import { getLiveTrainDataMerged, mergeProviderResults } from './providerAdapter';
import { ntesProvider } from './providers/ntesProvider';
import { railyatriProvider } from './providers/railyatriProvider';
import { getEnrichedTrain } from './knowledgeBaseService';

export interface LiveTrainData {
  trainNumber: string;
  speed: number;
  delayMinutes: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  source: 'ntes' | 'railyatri' | 'estimated';
  confidence: number;
}

export interface LiveDataDiagnostics {
  attemptedProviders: Array<'ntes' | 'railyatri'>;
  successfulProviders: Array<'ntes' | 'railyatri'>;
  failedProviders: Array<'ntes' | 'railyatri'>;
  selectedSource: 'ntes' | 'railyatri' | 'estimated' | 'none';
  liveCoordinatesAvailable: boolean;
  reason:
    | 'live_coordinates_available'
    | 'fallback_estimated_from_schedule'
    | 'status_only_no_coordinates'
    | 'all_live_providers_unavailable';
}

export interface LiveDataResult {
  data: LiveTrainData | null;
  diagnostics: LiveDataDiagnostics;
}

export interface NTESResponse {
  position: {
    latitude: number;
    longitude: number;
  };
  speed: number;
  delay: number;
}

export interface RailYatriResponse {
  train: {
    number: string;
  };
  position: {
    lat: number;
    lon: number;
  };
  speed: number;
  delay: number;
}

const ENABLE_MOCK_LIVE_DATA = process.env.ENABLE_MOCK_LIVE_DATA === 'true';

/**
 * Fetch live data from NTES (via direct provider call - no merging loop!)
 */
async function fetchFromNTES(trainNumber: string): Promise<LiveTrainData | null> {
  try {
    const result = await ntesProvider.getStatus(trainNumber);
    if (
      result &&
      typeof result.delay === 'number' &&
      typeof result.lat === 'number' &&
      typeof result.lng === 'number' &&
      Number.isFinite(result.lat) &&
      Number.isFinite(result.lng) &&
      result.lat !== 0 &&
      result.lng !== 0
    ) {
      return {
        trainNumber,
        speed: result.speed ?? 0,
        delayMinutes: result.delay ?? 0,
        latitude: result.lat ?? 0,
        longitude: result.lng ?? 0,
        timestamp: new Date((result.timestamp ?? Date.now())).toISOString(),
        source: 'ntes',
        confidence: result.source === 'merged' ? 0.85 : 0.75,
      };
    }

    if (ENABLE_MOCK_LIVE_DATA) {
      // Mark as unavailable instead of simulating fake data
      return markLiveDataUnavailable(trainNumber);
    }

    return null;
  } catch (error) {
    console.error('Error fetching from NTES:', error);
    return null;
  }
}

/**
 * Fetch live data from RailYatri API (direct provider - no merging loop!)
 */
async function fetchFromRailYatri(trainNumber: string): Promise<LiveTrainData | null> {
  try {
    const result = await railyatriProvider.getStatus(trainNumber);
    if (
      result &&
      typeof result.lat === 'number' &&
      typeof result.lng === 'number' &&
      Number.isFinite(result.lat) &&
      Number.isFinite(result.lng) &&
      result.lat !== 0 &&
      result.lng !== 0 &&
      (result.source === 'railyatri' || result.source === 'merged')
    ) {
      return {
        trainNumber,
        speed: result.speed ?? 0,
        delayMinutes: result.delay ?? 0,
        latitude: result.lat,
        longitude: result.lng,
        timestamp: new Date((result.timestamp ?? Date.now())).toISOString(),
        source: 'railyatri',
        confidence: result.source === 'merged' ? 0.9 : 0.8,
      };
    }

    if (ENABLE_MOCK_LIVE_DATA) {
      return markLiveDataUnavailable(trainNumber);
    }

    return null;
  } catch (error) {
    console.error('Error fetching from RailYatri:', error);
    return null;
  }
}

/**
 * Get live train data from multiple sources with fallback
 * NO REDUNDANT CALLS - each provider only called once!
 * NO CIRCULAR DEPENDENCIES - doesn't call getTrainData()
 */
export async function getLiveTrainData(
  trainNumber: string
): Promise<LiveTrainData | null> {
  // Try RailYatri first (has coordinates)
  const railyatriData = await fetchFromRailYatri(trainNumber);
  if (railyatriData && (railyatriData.source === 'estimated' ? railyatriData.confidence > 0.5 : railyatriData.confidence > 0.7)) {
    console.log('[LiveTrainData] Returning RailYatri data for', trainNumber);
    return railyatriData;
  }

  // Fallback to NTES if coordinates present
  const ntesData = await fetchFromNTES(trainNumber);
  if (ntesData && ntesData.confidence > 0.7) {
    console.log('[LiveTrainData] Returning NTES data for', trainNumber);
    return ntesData;
  }

  // Final fallback: return null instead of trying getTrainData (prevents circular dependency)
  // The trainDataService will handle static fallback separately
  const kbEstimated = await estimateLiveDataFromKnowledgeBase(trainNumber);
  if (kbEstimated) {
    console.log('[LiveTrainData] Returning KB estimated data for', trainNumber, {
      lat: kbEstimated.latitude,
      lng: kbEstimated.longitude,
      source: kbEstimated.source,
    });
    return kbEstimated;
  }

  console.log('[LiveTrainData] No live data available for', trainNumber);
  // Production behavior: explicit unavailable when providers fail
  return null;
}

export async function getLiveTrainDataWithDiagnostics(
  trainNumber: string
): Promise<LiveDataResult> {
  const attemptedProviders: Array<'ntes' | 'railyatri'> = ['ntes', 'railyatri'];
  const successfulProviders: Array<'ntes' | 'railyatri'> = [];

  // Get data once - don't call providers multiple times!
  const data = await getLiveTrainData(trainNumber);

  if (data && (data.source === 'ntes' || data.source === 'railyatri')) {
    successfulProviders.push(data.source as 'ntes' | 'railyatri');
  }

  const failedProviders = attemptedProviders.filter(
    provider => !successfulProviders.includes(provider)
  );

  const selectedSource: 'ntes' | 'railyatri' | 'estimated' | 'none' = data
    ? data.source
    : 'none';

  let reason: LiveDataDiagnostics['reason'] = 'all_live_providers_unavailable';
  if (data) {
    reason = data.source === 'estimated' ? 'fallback_estimated_from_schedule' : 'live_coordinates_available';
  }

  return {
    data,
    diagnostics: {
      attemptedProviders,
      successfulProviders,
      failedProviders,
      selectedSource,
      liveCoordinatesAvailable: Boolean(data),
      reason,
    },
  };
}

/**
 * SYNTHETIC DATA FALLBACK
 * When real APIs unavailable, mark data as unavailable rather than simulating
 * This forces frontend to handle gracefully
 */
export function markLiveDataUnavailable(trainNumber: string): LiveTrainData {
  return {
    trainNumber,
    speed: 0,
    delayMinutes: 0,
    latitude: 0,
    longitude: 0,
    timestamp: new Date().toISOString(),
    source: 'estimated',
    confidence: 0,
  };
}

function parseTimeToMinutes(value?: string): number | null {
  if (!value) return null;
  if (value.toLowerCase() === 'source' || value.toLowerCase() === 'destination') return null;

  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

async function estimateLiveDataFromKnowledgeBase(trainNumber: string): Promise<LiveTrainData | null> {
  try {
    // PRIMARY: Use trainPositionTracker for realistic position calculation
    let trainTracker: any;
    try {
      trainTracker = require('./trainPositionTracker');
    } catch (e) {
      console.warn('[LiveData] trainPositionTracker not available, using KB estimation');
    }

    if (trainTracker && trainTracker.getCurrentPosition) {
      try {
        const trackedPosition = trainTracker.getCurrentPosition(trainNumber);
        console.log('[LiveData] trainPositionTracker returned:', {
          trackedPosition,
          lat: trackedPosition?.lat,
          lng: trackedPosition?.lng,
        });
        if (trackedPosition && typeof trackedPosition.lat === 'number' && typeof trackedPosition.lng === 'number') {
          const result: LiveTrainData = {
            trainNumber,
            speed: trackedPosition.speed || 32,
            delayMinutes: trackedPosition.delay || 0,
            latitude: trackedPosition.lat,
            longitude: trackedPosition.lng,
            timestamp: new Date().toISOString(),
            source: 'estimated',
            confidence: 0.72, // Higher confidence than static snapping
          };
          console.log('[LiveData] ✓ Returning trainPositionTracker estimate for', trainNumber, {
            lat: result.latitude,
            lng: result.longitude,
          });
          return result;
        }
      } catch (trackerError) {
        console.warn('[LiveData] trainPositionTracker calculation failed:', trackerError);
      }
    }

    // SECONDARY FALLBACK: Snap to nearest station by time
    const enriched = await getEnrichedTrain(trainNumber);
    const route = enriched?.enrichedRoute || [];

    if (!route.length) {
      return null;
    }

    const validStops = route.filter(
      stop => typeof stop.latitude === 'number' && typeof stop.longitude === 'number'
    );
    if (!validStops.length) {
      return null;
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let selected = validStops[0];
    let smallestDiff = Number.POSITIVE_INFINITY;

    for (const stop of validStops) {
      const minuteCandidates = [parseTimeToMinutes(stop.arrives), parseTimeToMinutes(stop.departs)].filter(
        (v): v is number => typeof v === 'number'
      );

      if (!minuteCandidates.length) {
        continue;
      }

      for (const candidate of minuteCandidates) {
        const diff = Math.abs(candidate - nowMinutes);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          selected = stop;
        }
      }
    }

    console.log('[LiveData] Falling back to static station position for', trainNumber);
    return {
      trainNumber,
      speed: 32,
      delayMinutes: 0,
      latitude: selected.latitude as number,
      longitude: selected.longitude as number,
      timestamp: new Date().toISOString(),
      source: 'estimated',
      confidence: 0.58,
    };
  } catch (error) {
    console.warn('[LiveData] Knowledge-base estimation failed:', error);
    return null;
  }
}

/**
 * Normalize data from different sources to common format
 */
export function normalizeLiveData(
  rawData: any,
  source: 'ntes' | 'railyatri'
): LiveTrainData | null {
  try {
    if (source === 'ntes') {
      return {
        trainNumber: rawData.trainNumber,
        speed: rawData.position?.speed || 0,
        delayMinutes: rawData.delay || 0,
        latitude: rawData.position?.latitude || 0,
        longitude: rawData.position?.longitude || 0,
        timestamp: new Date().toISOString(),
        source: 'ntes',
        confidence: 0.85,
      };
    } else if (source === 'railyatri') {
      return {
        trainNumber: rawData.train?.number || '',
        speed: rawData.speed || 0,
        delayMinutes: rawData.delay || 0,
        latitude: rawData.position?.lat || 0,
        longitude: rawData.position?.lon || 0,
        timestamp: new Date().toISOString(),
        source: 'railyatri',
        confidence: 0.8,
      };
    }
  } catch (error) {
    console.error('Error normalizing live data:', error);
  }

  return null;
}

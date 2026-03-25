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
  isStale?: boolean;
  staleAgeSeconds?: number;
}

export interface LiveDataDiagnostics {
  attemptedProviders: Array<'ntes' | 'railyatri'>;
  successfulProviders: Array<'ntes' | 'railyatri'>;
  failedProviders: Array<'ntes' | 'railyatri'>;
  selectedSource: 'ntes' | 'railyatri' | 'estimated' | 'none';
  liveCoordinatesAvailable: boolean;
  reason:
    | 'live_coordinates_available'
    | 'stale_last_known_live'
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
const LAST_KNOWN_LIVE_TTL_MS = 8 * 60 * 1000;
const lastKnownLiveByTrain = new Map<string, { data: LiveTrainData; timestamp: number }>();

function rememberLive(trainNumber: string, data: LiveTrainData) {
  if (data.source === 'estimated') return;
  lastKnownLiveByTrain.set(trainNumber.toUpperCase(), {
    data: {
      ...data,
      isStale: false,
      staleAgeSeconds: 0,
    },
    timestamp: Date.now(),
  });
}

function getLastKnownLiveFallback(trainNumber: string): LiveTrainData | null {
  const cached = lastKnownLiveByTrain.get(trainNumber.toUpperCase());
  if (!cached) return null;

  const ageMs = Date.now() - cached.timestamp;
  if (ageMs > LAST_KNOWN_LIVE_TTL_MS) {
    lastKnownLiveByTrain.delete(trainNumber.toUpperCase());
    return null;
  }

  return {
    ...cached.data,
    timestamp: new Date().toISOString(),
    confidence: Math.max(0.35, Number((cached.data.confidence * 0.72).toFixed(2))),
    isStale: true,
    staleAgeSeconds: Math.floor(ageMs / 1000),
  };
}

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
      const accuracyMeters = typeof result.accuracy === 'number' && Number.isFinite(result.accuracy)
        ? result.accuracy
        : 320;
      const payloadFreshnessSeconds = typeof result.raw?.freshnessSeconds === 'number' && Number.isFinite(result.raw.freshnessSeconds)
        ? result.raw.freshnessSeconds
        : 0;

      const baseConfidence = result.source === 'merged' ? 0.86 : 0.79;
      const accuracyPenalty = accuracyMeters > 450 ? 0.16 : accuracyMeters > 300 ? 0.1 : accuracyMeters > 180 ? 0.05 : 0;
      const freshnessPenalty = payloadFreshnessSeconds > 600 ? 0.09 : payloadFreshnessSeconds > 240 ? 0.04 : 0;
      const confidence = Math.max(0.55, Number((baseConfidence - accuracyPenalty - freshnessPenalty).toFixed(2)));

      return {
        trainNumber,
        speed: result.speed ?? 0,
        delayMinutes: result.delay ?? 0,
        latitude: result.lat ?? 0,
        longitude: result.lng ?? 0,
        timestamp: new Date((result.timestamp ?? Date.now())).toISOString(),
        source: 'ntes',
        confidence,
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
  // Try NTES first to take advantage of official approximate GPS feeds.
  const ntesData = await fetchFromNTES(trainNumber);
  if (ntesData && ntesData.confidence >= 0.55) {
    rememberLive(trainNumber, ntesData);
    console.log('[LiveTrainData] Returning NTES data for', trainNumber);
    return ntesData;
  }

  // Fallback to RailYatri for additional coordinate coverage.
  const railyatriData = await fetchFromRailYatri(trainNumber);
  if (railyatriData && (railyatriData.source === 'estimated' ? railyatriData.confidence > 0.5 : railyatriData.confidence > 0.7)) {
    rememberLive(trainNumber, railyatriData);
    console.log('[LiveTrainData] Returning RailYatri data for', trainNumber);
    return railyatriData;
  }

  const staleLiveData = getLastKnownLiveFallback(trainNumber);
  if (staleLiveData) {
    console.log('[LiveTrainData] Returning stale last-known live data for', trainNumber, {
      source: staleLiveData.source,
      staleAgeSeconds: staleLiveData.staleAgeSeconds,
      lat: staleLiveData.latitude,
      lng: staleLiveData.longitude,
    });
    return staleLiveData;
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
    if (data.isStale) {
      reason = 'stale_last_known_live';
    } else {
      reason = data.source === 'estimated' ? 'fallback_estimated_from_schedule' : 'live_coordinates_available';
    }
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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

    // Try dynamic interpolation between consecutive route stops based on timetable.
    for (let i = 0; i < validStops.length - 1; i++) {
      const currentStop = validStops[i];
      const nextStop = validStops[i + 1];

      const currentMinute = parseTimeToMinutes(currentStop.departs) ?? parseTimeToMinutes(currentStop.arrives);
      const nextMinuteRaw = parseTimeToMinutes(nextStop.arrives) ?? parseTimeToMinutes(nextStop.departs);

      if (currentMinute === null || nextMinuteRaw === null) {
        continue;
      }

      let start = currentMinute;
      let end = nextMinuteRaw;
      let current = nowMinutes;

      if (end < start) {
        end += 24 * 60;
      }
      if (current < start) {
        current += 24 * 60;
      }

      if (current >= start && current <= end && end > start) {
        const ratio = (current - start) / (end - start);
        const latitude = (currentStop.latitude as number) + ((nextStop.latitude as number) - (currentStop.latitude as number)) * ratio;
        const longitude = (currentStop.longitude as number) + ((nextStop.longitude as number) - (currentStop.longitude as number)) * ratio;
        const segmentDistanceKm = haversineKm(
          currentStop.latitude as number,
          currentStop.longitude as number,
          nextStop.latitude as number,
          nextStop.longitude as number
        );
        const segmentMinutes = Math.max(1, end - start);
        const speed = Math.max(20, Math.min(110, (segmentDistanceKm / (segmentMinutes / 60))));

        console.log('[LiveData] Returning interpolated KB fallback for', trainNumber, {
          from: currentStop.stationCode,
          to: nextStop.stationCode,
          ratio: Number(ratio.toFixed(3)),
          lat: latitude,
          lng: longitude,
        });

        return {
          trainNumber,
          speed: Number(speed.toFixed(1)),
          delayMinutes: 0,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
          source: 'estimated',
          confidence: 0.66,
        };
      }
    }

    // Fallback: nearest timed stop if interpolation window is unavailable.
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

    console.log('[LiveData] Falling back to nearest timed stop for', trainNumber);
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

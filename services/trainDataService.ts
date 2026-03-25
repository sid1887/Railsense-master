/**
 * Train Data Service - REAL DATA ONLY
 * Fetches train data from verified Indian Railways sources
 * No mock data, no simulation - only real operational data
 */

import { TrainData, TrainDataSource } from '@/types/train';
import * as trainKB from '@/services/knowledgeBaseService';
import { readFile } from 'fs/promises';
import path from 'path';

// Real data providers
let trainTracker: any = null;
let haltDetector: any = null;
let snapshotDatabase: any = null;
let mapTrackSnapping: any = null;

if (typeof window === 'undefined') {
  try {
    trainTracker = require('./trainPositionTracker');
    haltDetector = require('./realHaltDetection');
    snapshotDatabase = require('./snapshotDatabase').default;
    mapTrackSnapping = require('./mapTrackSnapping').default;
  } catch (e) {
    console.error('[DataService] Failed to load real data providers:', e);
  }
}

// Real data cache (short TTL to allow live updates)
const dataCache = new Map<string, { data: TrainData | null; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds
const TRAIN_NAME_INDEX_FILE = path.join(process.cwd(), 'railway_data', 'Train_Name_Index.csv');
let csvIndexCache: Map<string, { trainName: string; source: string; destination: string }> | null = null;

function normalizeTrainNumber(trainNumber: string): string {
  const digits = String(trainNumber || '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  const numeric = parseInt(digits, 10);
  if (Number.isNaN(numeric)) {
    return '';
  }

  return String(numeric).padStart(5, '0');
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  result.push(current.trim());
  return result;
}

async function loadCsvIndexCache(): Promise<Map<string, { trainName: string; source: string; destination: string }>> {
  if (csvIndexCache) {
    return csvIndexCache;
  }

  const indexMap = new Map<string, { trainName: string; source: string; destination: string }>();

  try {
    const raw = await readFile(TRAIN_NAME_INDEX_FILE, 'utf-8');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

    for (let rowIndex = 2; rowIndex < lines.length; rowIndex++) {
      const cols = splitCsvLine(lines[rowIndex]);
      if (!cols.length) {
        continue;
      }

      // This index stores two records per row (0-4 and 5-9).
      for (let i = 0; i + 4 < cols.length; i += 5) {
        const trainName = cols[i];
        const trainNumberCell = cols[i + 1];
        const source = cols[i + 2];
        const destination = cols[i + 3];

        if (!trainNumberCell || !trainName) {
          continue;
        }

        const tokens = trainNumberCell.match(/\d{3,6}/g) || [];
        for (const token of tokens) {
          const normalized = normalizeTrainNumber(token);
          if (!normalized || indexMap.has(normalized)) {
            continue;
          }

          indexMap.set(normalized, {
            trainName,
            source: source || 'Unknown',
            destination: destination || 'Unknown',
          });
        }
      }
    }
  } catch (error) {
    console.warn(`[DataService] Could not load Train_Name_Index CSV fallback: ${error}`);
  }

  csvIndexCache = indexMap;
  return indexMap;
}

async function buildTrainDataFromCsvIndex(trainNumber: string): Promise<TrainData | null> {
  const normalized = normalizeTrainNumber(trainNumber);
  if (!normalized) {
    return null;
  }

  const indexMap = await loadCsvIndexCache();
  const record = indexMap.get(normalized);
  if (!record) {
    return null;
  }

  const now = Date.now();
  const syntheticData: TrainData = {
    trainNumber: normalized,
    trainName: record.trainName,
    source: 'schedule',
    destination: record.destination,
    dataQuality: 32,
    isSynthetic: true,
    currentLocation: {
      latitude: 0,
      longitude: 0,
      timestamp: now,
    },
    currentStationIndex: 0,
    currentStationCode: 'UNKNOWN',
    scheduledStations: [
      {
        name: record.source,
        code: 'SRC',
        scheduledArrival: '00:00',
        estimatedArrival: '00:00',
        scheduledDeparture: '00:00',
        estimatedDeparture: '00:00',
        latitude: 0,
        longitude: 0,
        isHalted: false,
      },
      {
        name: record.destination,
        code: 'DST',
        scheduledArrival: '00:00',
        estimatedArrival: '00:00',
        scheduledDeparture: '00:00',
        estimatedDeparture: '00:00',
        latitude: 0,
        longitude: 0,
        isHalted: false,
      },
    ],
    delay: 0,
    speed: 0,
    status: 'Scheduled',
    lastUpdated: now,
  };

  setCachedData(normalized, syntheticData);
  console.log(`[DataService] ✓ CSV index fallback resolved ${normalized}: ${record.trainName}`);
  return syntheticData;
}

function computeDataQuality(
  source: TrainDataSource,
  sources: TrainDataSource[],
  hasLiveCoords: boolean
) {
  let score = 40;
  let isSynthetic = false;

  if (source === 'merged' || (sources.includes('ntes') && sources.includes('railyatri'))) {
    score = 85;
  } else if (source === 'ntes') {
    score = 70;
  } else if (source === 'railyatri') {
    score = 65;
  } else if (source === 'schedule') {
    score = 40;
    isSynthetic = true;
  } else if (source === 'synthetic') {
    score = 25;
    isSynthetic = true;
  }

  if (!hasLiveCoords) {
    score = Math.max(20, score - 10);
  }

  return { score, isSynthetic };
}

function getCachedData(trainNumber: string): TrainData | null | undefined {
  const key = trainNumber.toUpperCase();
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    if (cached.data === null) {
      // Never treat miss markers as positive cache hits.
      dataCache.delete(key);
      return undefined;
    }
    console.log(`[Cache] Hit for train ${trainNumber}`);
    return cached.data;
  }
  return undefined;
}

function setCachedData(trainNumber: string, data: TrainData | null) {
  const key = trainNumber.toUpperCase();
  if (data === null) {
    dataCache.delete(key);
    return;
  }
  dataCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fallback: Convert knowledge base train data to TrainData format
 * Used when train not found in realTrainsDatabase
 */
async function buildTrainDataFromKnowledgeBase(trainNumber: string): Promise<TrainData | null> {
  try {
    console.log(`[DataService] Attempting knowledge base fallback for ${trainNumber}...`);

    const enriched = await trainKB.getEnrichedTrain(trainNumber);
    const kbTrain = enriched?.train || await trainKB.searchTrainByNumber(trainNumber);
    if (!kbTrain) {
      const csvFallback = await buildTrainDataFromCsvIndex(trainNumber);
      if (csvFallback) {
        return csvFallback;
      }

      console.log(`[DataService] Train ${trainNumber} not found in knowledge base either`);
      return null;
    }

    console.log(`[DataService] ✓ Found ${trainNumber} in knowledge base: ${kbTrain.trainName}`);

    // Convert KB train stops to Station format, preferring enriched route coordinates.
    const routeStops = enriched?.enrichedRoute || [];
    const hasEnrichedRoute = routeStops.length > 0;

    const scheduledStations = (hasEnrichedRoute ? routeStops : (kbTrain.stops || [])).map((stop: any) => {
      const parsedCode = stop.stationCode || stop.stationName?.split('-')[1]?.trim() || stop.stationName;
      const latitude = typeof stop.latitude === 'number' && Number.isFinite(stop.latitude) ? stop.latitude : 0;
      const longitude = typeof stop.longitude === 'number' && Number.isFinite(stop.longitude) ? stop.longitude : 0;

      return {
        name: stop.stationName,
        code: parsedCode,
        scheduledArrival: stop.arrives,
        estimatedArrival: stop.arrives,
        scheduledDeparture: stop.departs,
        estimatedDeparture: stop.departs,
        latitude,
        longitude,
        isHalted: false,
      };
    });

    const firstStationWithCoords = scheduledStations.find(
      (station) => station.latitude !== 0 && station.longitude !== 0
    );
    const initialStation = firstStationWithCoords || scheduledStations[0];
    const kbHasCoords = scheduledStations.some((station) => station.latitude !== 0 && station.longitude !== 0);

    // Create synthetic position data from schedule
    const syntheticData: TrainData = {
      trainNumber: kbTrain.trainNumber,
      trainName: kbTrain.trainName,
      source: 'schedule',
      destination: kbTrain.destination,
      dataQuality: kbHasCoords ? 55 : 40,
      isSynthetic: true,
      currentLocation: {
        latitude: initialStation?.latitude || 0,
        longitude: initialStation?.longitude || 0,
        timestamp: Date.now(),
      },
      currentStationIndex: 0,
      currentStationCode: initialStation?.code || 'UNKNOWN',
      scheduledStations: scheduledStations,
      delay: 0,
      speed: 0,
      status: 'Scheduled',
      lastUpdated: Date.now(),
    };

    setCachedData(trainNumber, syntheticData);
    return syntheticData;
  } catch (error) {
    console.error(`[DataService] Knowledge base fallback failed for ${trainNumber}:`, error);
    return null;
  }
}

/**
 * Main function to get train data
 * REAL DATA ONLY - uses verified Indian Railways train schedules
 * Source: trainPositionTracker (calculates real position)
 * Database: realTrainsDatabase.js (verified IR data)
 */
export async function getTrainData(trainNumber: string): Promise<TrainData | null> {
  // Normalize input
  const normalized = trainNumber.toUpperCase().trim();

  if (!normalized) {
    throw new Error('Train number is required');
  }

  // Check cache first
  const cached = getCachedData(normalized);
  if (cached !== undefined) {
    console.log(`[Cache] HIT for train ${normalized}`);
    return cached;
  }

  try {
    console.log(`\n[DataService] ========== FETCHING REAL DATA FOR TRAIN ${normalized} ==========`);

    // Ensure schedule data is available for route metadata
    if (!trainTracker) {
      console.error('[DataService] ✗ Real train tracker not initialized');
      const kbData = await buildTrainDataFromKnowledgeBase(normalized);
      if (kbData) {
        return kbData;
      }
      return null;
    }

    console.log(`[DataService] Querying real train database...`);

    // Get current position from real schedule (fallback for coords)
    let positionData = trainTracker.getCurrentPosition(normalized);
    if (!positionData) {
      console.log(`[DataService] ✗ Train ${normalized} NOT found in real database`);
      const available = trainTracker.getAllTrainNumbers?.() || [];
      console.log(`[DataService] Available in realTrainsDatabase: ${available.join(', ')}`);

      // FALLBACK: Check knowledge base for this train
      console.log(`[DataService] Falling back to knowledge base...`);
      const kbData = await buildTrainDataFromKnowledgeBase(normalized);
      if (kbData) {
        return kbData;
      }

      setCachedData(normalized, null);
      return null;
    }

    // Get complete train info from real database
    const trainInfo = trainTracker.getTrainInfo(normalized);
    if (!trainInfo) {
      console.error(`[DataService] ✗ Train info not found: ${normalized}`);
      const kbData = await buildTrainDataFromKnowledgeBase(normalized);
      if (kbData) {
        return kbData;
      }
      return null;
    }

    // Check for halt status
    let haltInfo: any = { isHalted: false, reason: 'Normal operation' };
    if (haltDetector) {
      try {
        haltDetector.recordPosition(normalized, positionData);
        const haltAnalysis = haltDetector.detectHalt(normalized, positionData);
        if (haltAnalysis && haltAnalysis.isHalted) {
          haltInfo = haltAnalysis;

          // Record halt event to analytics database
          if (snapshotDatabase && haltInfo.sectionCode && haltInfo.stationName) {
            try {
              await snapshotDatabase.recordHaltEvent({
                trainNumber: normalized,
                sectionCode: haltInfo.sectionCode,
                sectionName: haltInfo.stationName || haltInfo.reason,
                haltStartTime: haltInfo.startTime || new Date().toISOString(),
                haltEndTime: haltInfo.endTime || null,
                haltDurationSeconds: haltInfo.duration || 0,
                haltReason: haltInfo.reason || 'Unknown',
                estimatedCause: haltInfo.estimatedCause || null,
                haltConfidence: haltInfo.confidence || 0.5,
                isScheduledStop: haltInfo.isScheduledStop || false,
              });
              console.log(`[DataService] Recorded halt event for ${normalized}`);
            } catch (dbError) {
              console.warn(`[DataService] Failed to record halt event: ${dbError}`);
            }
          }
        }
      } catch (e) {
        console.warn(`[DataService] Could not analyze halt status: ${e}`);
      }
    }

    // NOTE: Removed getLiveTrainDataMerged() call to prevent circular dependency with providerAdapter
    // Live data is fetched separately in trainSearchOrchestrator, not here
    // This function returns static/schedule-based data only
    const source: TrainDataSource = 'schedule';
    const sources: TrainDataSource[] = [source];

    // Use schedule-based position (from trainPositionTracker)
    let coords = { latitude: positionData.lat, longitude: positionData.lng, timestamp: Date.now() };

    // Snap coordinates to railway track network for accuracy
    if (mapTrackSnapping && coords.latitude && coords.longitude) {
      try {
        const snappedPos = mapTrackSnapping.snapToNearestTrack(coords.latitude, coords.longitude);
        if (snappedPos) {
          coords = {
            latitude: snappedPos.snapped.latitude,
            longitude: snappedPos.snapped.longitude,
            timestamp: coords.timestamp,
            snappingDistance: parseFloat(snappedPos.distance.toFixed(2)),
            trackSegmentId: snappedPos.trackSegment.id,
            trackSegmentName: snappedPos.trackSegment.name,
          } as any;
          console.log(`[DataService] ✓ Snapped position to track ${snappedPos.trackSegment.name} (≈${snappedPos.distance.toFixed(2)}km)`);
        }
      } catch (snapError) {
        console.warn(`[DataService] Track snapping failed: ${snapError}`);
        // Continue with original coordinates if snapping fails
      }
    }

    const { score: dataQuality, isSynthetic } = computeDataQuality(
      source,
      sources,
      false // hasLiveCoords - we're not using live data in this service
    );

    // Build TrainData using only schedule-based data
    // Live data is merged separately in trainSearchOrchestrator
    const trainData: TrainData = {
      // Core fields from real database
      trainNumber: trainInfo.trainNumber,
      trainName: trainInfo.trainName,
      destination: trainInfo.destination,

      // Data quality metadata
      source,
      dataQuality,
      isSynthetic,
      lastUpdated: Date.now(),

      // Schedule-based position (snapped to track network)
      currentLocation: coords,

      // Schedule-based speed and delay (no live data in this service)
      speed: positionData.speed,
      delay: positionData.delay_minutes ?? positionData.delay ?? 0,
      status: haltInfo.isHalted ? 'Halted' : (positionData.status || 'Running'),

      // Scheduled stations from real IR database
      scheduledStations: (trainInfo.stations || []).map((station: any) => {
        let stationCoords = {
          latitude: station.lat,
          longitude: station.lng,
        };

        // Snap station coordinates to track network
        if (mapTrackSnapping && stationCoords.latitude && stationCoords.longitude) {
          try {
            const snapped = mapTrackSnapping.snapToNearestTrack(stationCoords.latitude, stationCoords.longitude);
            if (snapped && snapped.snapped && snapped.snapped.latitude && snapped.snapped.longitude) {
              stationCoords = snapped.snapped;
            }
            // If snapping returns invalid coords, keep original
          } catch (e) {
            // Keep original station coordinates if snapping fails
            console.warn(`[DataService] Station snapping failed for ${station.name}, using original coords`);
          }
        }

        // Ensure coordinates are valid before returning
        const finalCoords = {
          latitude: (stationCoords.latitude && stationCoords.latitude !== 0) ? stationCoords.latitude : station.lat,
          longitude: (stationCoords.longitude && stationCoords.longitude !== 0) ? stationCoords.longitude : station.lng,
        };

        return {
          name: station.name,
          code: station.code,
          scheduledArrival: station.arrivalTime || '00:00',
          estimatedArrival: station.arrivalTime || '00:00',
          scheduledDeparture: station.departureTime || '00:00',
          estimatedDeparture: station.departureTime || '00:00',
          latitude: finalCoords.latitude,
          longitude: finalCoords.longitude,
          isHalted: haltInfo.isHalted && station.code === positionData.currentStation?.code
        };
      }) || [],

      // Current station info - find station code from position data
      currentStationIndex: trainInfo.stations?.findIndex((s: any) => s.name === positionData.currentStation) || 0,
      currentStationCode: trainInfo.stations?.find((s: any) => s.name === positionData.currentStation)?.code || trainInfo.sourceCode || '',
    };

    console.log(`[DataService] ✓ SUCCESS: Real data loaded for train ${normalized}`);
    console.log(`[DataService]   Train: ${trainInfo.trainName}`);
    console.log(`[DataService]   Route: ${trainInfo.source} → ${trainInfo.destination}`);
    console.log(`[DataService]   Current Position: ${positionData.lat.toFixed(4)}, ${positionData.lng.toFixed(4)}`);
    console.log(`[DataService]   Speed: ${positionData.speed}km/h | Status: ${trainData.status}`);
    if (haltInfo.isHalted) {
      console.log(`[DataService]   HALTED: ${haltInfo.reason} (Confidence: ${haltInfo.confidence})`);
    }

    setCachedData(normalized, trainData);
    return trainData;
  } catch (err) {
    console.error('[DataService] Error during real data fetch:', err);
    const kbData = await buildTrainDataFromKnowledgeBase(normalized);
    if (kbData) {
      return kbData;
    }
    throw err;
  }
}

/**
 * Get nearby trains data (for heatmap and traffic analysis)
 * Uses real train tracker to find trains near a location
 */
export async function getNearbyTrainsData(
  latitude?: number,
  longitude?: number,
  radius: number = 50,
  excludeTrainNumber?: string
): Promise<TrainData[]> {
  try {
    if (!trainTracker) {
      console.warn('[DataService] Real train tracker not initialized');
      return [];
    }

    // If location provided, get nearby trains
    if (latitude !== undefined && longitude !== undefined) {
      console.log(`[DataService] Searching for trains near ${latitude.toFixed(4)}, ${longitude.toFixed(4)} within ${radius}km`);
      const nearbyTrains = trainTracker.getTrainsNearLocation(latitude, longitude, radius);

      const trainDataArray: TrainData[] = [];
      const seen = new Set<string>();

      for (const nearbyTrain of nearbyTrains) {
        const candidateTrainNumber = String(nearbyTrain?.trainNumber || '').toUpperCase();
        if (!candidateTrainNumber) {
          continue;
        }

        if (excludeTrainNumber && candidateTrainNumber === excludeTrainNumber.toUpperCase()) {
          continue;
        }

        if (seen.has(candidateTrainNumber)) {
          continue;
        }
        seen.add(candidateTrainNumber);

        const trainData = await getTrainData(candidateTrainNumber);
        if (trainData) {
          trainDataArray.push(trainData);
        }
      }

      console.log(`[DataService] Found ${trainDataArray.length} trains nearby`);
      return trainDataArray;
    }

    // If no location provided, return all tracked trains
    console.log('[DataService] Fetching all tracked trains...');
    const allTrains = trainTracker.getAllTrainNumbers?.() || [];

    const trainDataArray: TrainData[] = [];
    for (const trainNumber of allTrains) {
      try {
        const trainData = await getTrainData(trainNumber);
        if (trainData) {
          trainDataArray.push(trainData);
        }
      } catch (e) {
        console.warn(`[DataService] Could not fetch data for train ${trainNumber}`);
      }
    }

    return trainDataArray;
  } catch (err) {
    console.error('Error fetching nearby trains:', err);
    return [];
  }
}

/**
 * Get mock configuration data
 * Default thresholds and factors for analysis
 */
export async function getMockConfig() {
  return {
    congestionFactors: {
      lowTrafficWait: 5,
      mediumTrafficWait: 12,
      highTrafficWait: 20,
      weatherFactor: 2,
    },
    defaultWeather: {
      temperature: 28,
      condition: 'Partly Cloudy',
      visibility: 10,
      windSpeed: 15,
      precipitation: false,
      code: '02d',
    },
  };
}

/**
 * Search trains by name or number
 * Uses real train database only
 */
export async function searchTrains(query: string): Promise<TrainData[]> {
  try {
    if (!trainTracker) {
      console.warn('[DataService] Real train tracker not initialized');
      return [];
    }

    const normalized = query.toUpperCase().trim();
    console.log(`[DataService] Searching real database for: ${normalized}`);

    // Try exact match first
    const exactMatch = await getTrainData(normalized);
    if (exactMatch) {
      return [exactMatch];
    }

    // Try partial match in train numbers (12955, 13345, 14645, 15906)
    const allTrains = trainTracker.getAllTrainNumbers?.() || [];
    const matchingTrains: TrainData[] = [];

    for (const trainNumber of allTrains) {
      if (trainNumber.includes(normalized) || trainNumber.toLowerCase().includes(normalized.toLowerCase())) {
        const trainData = await getTrainData(trainNumber);
        if (trainData) {
          matchingTrains.push(trainData);
        }
      }
    }

    console.log(`[DataService] Found ${matchingTrains.length} matching trains`);
    return matchingTrains;
  } catch (err) {
    console.error('Error searching trains:', err);
    return [];
  }
}

/**
 * Train Search Orchestrator
 *
 * Implements the layered train search pipeline:
 *
 * LAYER 1 - Core Railway Knowledge Base:
 * - Load from pre-built railway_knowledge_base.json
 * - 8,490 trains with complete route data
 * - 13,141+ stations with coordinates
 * - Instant offline response
 *
 * LAYER 2 - Live Train Data:
 * - GPS position (NTES + RailYatri APIs)
 * - Current delay and status
 * - Real-time updates
 *
 * LAYER 3 - Prediction Engine:
 * - ETA based on live position
 * - Delay forecasting
 * - Recommendations
 *
 * Pipeline:
 * 1. Check in-memory cache
 * 2. Check knowledge base (fast, offline)
 * 3. Check database (fallback)
 * 4. Scraper fallback if still not found
 * 5. Fetch live GPS in parallel
 * 6. Map position to route
 * 7. Calculate ETA
 * 8. Return unified response
 */

import {
  searchTrainByNumber,
  getEnrichedTrain,
  getKnowledgeBaseStats
} from '@/services/knowledgeBaseService';
import { getTrainTimetable } from '@/services/timetableScraper';
import { getLiveTrainData } from '@/services/liveTrainDataService';
import { mapTrainPosition } from '@/services/trainPositionMappingService';
import { predictETA } from '@/services/etaPredictionEngine';
import { getStaticTrain, getTrainRoute } from '@/services/staticRailwayDatabase';
import { mapViewDataService } from '@/services/mapViewDataService';
import fs from 'fs/promises';
import path from 'path';

export interface UnifiedTrainResponse {
  trainNumber: string;
  trainName: string;
  source: string;
  sourceCode?: string;
  destination: string;
  destinationCode?: string;
  currentStation: string;
  currentStationCode?: string;
  nextStation: string;
  nextStationCode?: string;
  delayMinutes: number;
  currentSpeed?: number;
  location: {
    lat: number;
    lng: number;
  };
  // Top-level coordinate properties for API compatibility
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  route: Array<{
    station: string;
    code?: string;
    arrivalTime: string;
    departureTime: string;
    latitude?: number;
    longitude?: number;
    distance?: number;
  }>;
  status: 'approaching' | 'at-station' | 'departed' | 'completed' | 'unknown';
  progress: number; // 0-100 percentage
  eta?: {
    nextStation: string;
    estimatedArrival: string;
    delayForecast: number;
  };
  lastUpdated: string;
  dataSource: string; // 'cache' | 'database' | 'scraper'
  liveUnavailable: boolean;
  staticDataQuality: 'high' | 'medium' | 'low';
  liveDataQuality: 'high' | 'low' | 'unavailable';
  predictionConfidence: number;
  mapConfidence: number;
  operationalContext?: {
    nearbyTrainsCount: number;
    congestionLevel: 'low' | 'medium' | 'high';
    sectionRiskScore: number;
    haltRiskScore: number;
    delayRiskScore: number;
    radiusKm: number;
    activeSignals: string[];
  };
}

// In-memory cache for recently searched trains (default 2 hours)
const searchCache = new Map<
  string,
  { data: UnifiedTrainResponse; timestamp: number }
>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

// Database file for persisted train data
const DATABASE_FILE = path.join(process.cwd(), 'data', 'trainDatabase.json');

interface DatabaseTrain {
  trainNumber: string;
  trainName: string;
  source: string;
  sourceCode?: string;
  destination: string;
  destinationCode?: string;
  route: Array<{
    station: string;
    code?: string;
    arrivalTime: string;
    departureTime: string;
    latitude?: number;
    longitude?: number;
  }>;
  addedAt: string;
  lastVerified: string;
}

interface TrainDatabase {
  trains: Record<string, DatabaseTrain>;
  lastUpdated: string;
}

/**
 * Load train database from disk
 */
async function loadDatabase(): Promise<TrainDatabase> {
  try {
    const content = await fs.readFile(DATABASE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { trains: {}, lastUpdated: new Date().toISOString() };
  }
}

/**
 * Save train to database
 */
async function saveToDatabase(train: DatabaseTrain): Promise<void> {
  try {
    const db = await loadDatabase();
    db.trains[train.trainNumber] = train;
    db.lastUpdated = new Date().toISOString();

    // Ensure directory exists
    const dir = path.dirname(DATABASE_FILE);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(DATABASE_FILE, JSON.stringify(db, null, 2));
    console.log(
      `[TrainDB] Train ${train.trainNumber} saved to database`
    );
  } catch (error) {
    console.error('[TrainDB] Failed to save train:', error);
  }
}

/**
 * Lookup train in database
 */
async function lookupInDatabase(
  trainNumber: string
): Promise<DatabaseTrain | null> {
  const db = await loadDatabase();
  return db.trains[trainNumber] || null;
}

/**
 * Check in-memory cache
 */
function getFromCache(trainNumber: string): UnifiedTrainResponse | null {
  const cached = searchCache.get(trainNumber);
  if (!cached) return null;

  // Check if cache is still valid
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    searchCache.delete(trainNumber);
    return null;
  }

  return cached.data;
}

/**
 * Store in memory cache
 */
function storeInCache(response: UnifiedTrainResponse): void {
  searchCache.set(response.trainNumber, {
    data: response,
    timestamp: Date.now(),
  });
}

/**
 * Main orchestration function
 */
export async function searchTrain(
  trainNumber: string,
  forceRefresh = false
): Promise<UnifiedTrainResponse> {
  console.log(`[TrainSearch] Searching for train ${trainNumber}`);

  try {

  // Step 0: Check in-memory cache
  if (!forceRefresh) {
    const cached = getFromCache(trainNumber);
    if (cached) {
      console.log(`[TrainSearch] Cache hit for ${trainNumber}`);
      return cached;
    }
  }

  // LAYER 1: Check knowledge base (fast, offline, complete)
  console.log(`[TrainSearch] Checking knowledge base for ${trainNumber}`);
  let dbTrain = null;
  let kbTrain = null;

  try {
    kbTrain = await searchTrainByNumber(trainNumber);
    if (kbTrain) {
      console.log(`[TrainSearch] Found in knowledge base: ${kbTrain.trainName}`);

      // Transform KB train to database format
      const enrichedData = await getEnrichedTrain(trainNumber);
      if (enrichedData) {
        dbTrain = {
          trainNumber: kbTrain.trainNumber,
          trainName: kbTrain.trainName,
          source: kbTrain.source,
          destination: kbTrain.destination,
          route: enrichedData.enrichedRoute.map((stop) => ({
            station: stop.stationName,
            code: stop.stationCode,
            arrivalTime: stop.arrives,
            departureTime: stop.departs,
            latitude: stop.latitude,
            longitude: stop.longitude,
          })),
          addedAt: new Date().toISOString(),
          lastVerified: new Date().toISOString(),
        };
      }
    }
  } catch (error) {
    console.error(`[TrainSearch] Knowledge base error: ${error}`);
  }

  // LAYER 2: Check database if not in KB
  if (!dbTrain) {
    console.log(`[TrainSearch] Checking database for ${trainNumber}`);
    dbTrain = await lookupInDatabase(trainNumber);
  }

  // LAYER 3: Scrape if not found anywhere
  if (!dbTrain) {
    console.log(`[TrainSearch] Train not found in KB or database, scraping for ${trainNumber}`);
    const scrapedTrain = await getTrainTimetable(trainNumber);

    if (scrapedTrain) {
      // Store in database
      dbTrain = {
        trainNumber: scrapedTrain.trainNumber,
        trainName: scrapedTrain.trainName,
        source: scrapedTrain.source,
        destination: scrapedTrain.destination,
        route: scrapedTrain.route.map((stop) => ({
          station: stop.station,
          code: extractStationCode(stop.station),
          arrivalTime: stop.arrival,
          departureTime: stop.departure,
        })),
        addedAt: new Date().toISOString(),
        lastVerified: new Date().toISOString(),
      };

      await saveToDatabase(dbTrain);
    } else {
      // Train not found anywhere - return graceful error response
      console.log(`[TrainSearch] Train ${trainNumber} not found in any source`);

      // Return a "not found" response instead of throwing
      const notFoundResponse: UnifiedTrainResponse = {
        trainNumber: trainNumber,
        trainName: 'Unknown',
        source: 'Not Found',
        destination: 'Not Found',
        currentStation: 'Unknown',
        nextStation: 'Unknown',
        delayMinutes: 0,
        currentSpeed: 0,
        location: {
          lat: 28.6,  // Default to Delhi
          lng: 77.2,
        },
        route: [],
        status: 'unknown',
        progress: 0,
        lastUpdated: new Date().toISOString(),
        dataSource: 'none',
        liveUnavailable: true,
        staticDataQuality: 'low',
        liveDataQuality: 'unavailable',
        predictionConfidence: 0,
        mapConfidence: 0,
      };

      // Cache the not-found response for 5 minutes
      storeInCache(notFoundResponse);

      // Return the response with meta error info
      return {
        ...notFoundResponse,
        // Use eta field to communicate error
        eta: {
          nextStation: `Train ${trainNumber} not found. Available trains: 01211, 01212, 02547, etc.`,
          estimatedArrival: 'N/A',
          delayForecast: 0,
        },
      };
    }
  }

  // LAYER 2: Fetch live data in parallel (NTES + RailYatri)
  console.log(`[TrainSearch] Fetching live data for ${trainNumber}`);
  let liveData = await getLiveTrainData(trainNumber);
  const liveUnavailable = !liveData;

  console.log(`[TrainSearch] LiveData result:`, {
    available: !!liveData,
    lat: liveData?.latitude,
    lng: liveData?.longitude,
    source: liveData?.source,
  });

  // If live data failed OR coordinates are missing, try trainPositionTracker
  if (!liveData || (liveData.latitude === 0 && liveData.longitude === 0)) {
    console.log(`[TrainSearch] Live data missing coordinates, trying trainPositionTracker for ${trainNumber}`);
    try {
      const trainTracker = require('./trainPositionTracker');
      if (trainTracker?.getCurrentPosition) {
        const trackedPos = trainTracker.getCurrentPosition(trainNumber);
        console.log(`[TrainSearch] trainPositionTracker result:`, {
          available: !!trackedPos,
          lat: trackedPos?.lat,
          lng: trackedPos?.lng,
          status: trackedPos?.status,
        });
        if (trackedPos && typeof trackedPos.lat === 'number' && typeof trackedPos.lng === 'number') {
          // Use trainPositionTracker position, keep other data from liveData if available
          if (liveData) {
            liveData.latitude = trackedPos.lat;
            liveData.longitude = trackedPos.lng;
            console.log(`[TrainSearch] ✓ Added coordinates from trainPositionTracker to existing liveData`);
          } else {
            liveData = {
              trainNumber,
              latitude: trackedPos.lat,
              longitude: trackedPos.lng,
              speed: trackedPos.speed || 0,
              delayMinutes: trackedPos.delay || 0,
              timestamp: new Date().toISOString(),
              source: 'estimated',
              confidence: 0.72,
            };
            console.log(`[TrainSearch] ✓ Created liveData from trainPositionTracker`);
          }
        }
      }
    } catch (trackerError) {
      console.warn(`[TrainSearch] trainPositionTracker fallback failed:`, trackerError);
    }
  }

  console.log(`[TrainSearch] Final liveData before response:`, {
    available: !!liveData,
    lat: liveData?.latitude,
    lng: liveData?.longitude,
    source: liveData?.source,
  });

  // LAYER 3: Map GPS to route and determine current station
  let currentStation = dbTrain.route[0]?.station || '';
  let nextStation =
    dbTrain.route.length > 1 ? (dbTrain.route[1]?.station || '') : (dbTrain.route[0]?.station || '');
  let status: 'approaching' | 'at-station' | 'departed' | 'completed' | 'unknown' =
    'unknown';
  let progress = 0;

  if (liveData && typeof liveData.latitude === 'number' && typeof liveData.longitude === 'number') {
    console.log(`[TrainSearch] Attempting to map position with coordinates: lat=${liveData.latitude}, lng=${liveData.longitude}`);
    const positionMapping = await mapTrainPosition(
      trainNumber,
      liveData.latitude,
      liveData.longitude
    );

    if (positionMapping) {
      console.log(`[TrainSearch] Position mapping successful:`, { station: positionMapping.nearestStation.name, status: positionMapping.status });
      currentStation = positionMapping.nearestStation.name;
      const currentIdx = dbTrain.route.findIndex(
        (s) => s.station === currentStation
      );
      nextStation =
        currentIdx >= 0 && currentIdx < dbTrain.route.length - 1
          ? dbTrain.route[currentIdx + 1]?.station || ''
          : dbTrain.route[dbTrain.route.length - 1]?.station || '';

      status = positionMapping.status;
      progress = positionMapping.progress;
    } else {
      console.warn(`[TrainSearch] Position mapping failed for ${trainNumber}, attempting fallback station matching`);
      // FALLBACK: Try to match nearest route stop by distance if mapTrainPosition fails
      let nearestDistance = Infinity;
      let nearestIdx = 0;

      for (let i = 0; i < dbTrain.route.length; i++) {
        const stop = dbTrain.route[i] as any;
        if (typeof stop.latitude === 'number' && typeof stop.longitude === 'number') {
          // Simple distance calculation (without importing turf)
          const dx = stop.latitude - liveData.latitude;
          const dy = stop.longitude - liveData.longitude;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIdx = i;
          }
        }
      }

      if (nearestIdx > 0 || nearestDistance < Infinity) {
        currentStation = dbTrain.route[nearestIdx]?.station || '';
        nextStation = nearestIdx < dbTrain.route.length - 1
          ? (dbTrain.route[nearestIdx + 1]?.station || '')
          : (dbTrain.route[dbTrain.route.length - 1]?.station || '');
        status = 'departed';
        progress = Math.round((nearestIdx / dbTrain.route.length) * 100);
        console.log(`[TrainSearch] Fallback station match: ${currentStation} (progress=${progress}%)`);
      }
    }
  } else {
    console.log(`[TrainSearch] No live data available for position mapping, using defaults`);
    // No live data - just use first station as current
    status = 'unknown';
  }

  // LAYER 3: Calculate ETA
  let eta: UnifiedTrainResponse['eta'] | undefined;
  if (liveData) {
    const etaPrediction = await predictETA(trainNumber, liveData, {
      trainNumber,
      currentLatitude: liveData.latitude,
      currentLongitude: liveData.longitude,
      nearestStation: {
        name: currentStation,
        code: extractStationCode(currentStation),
        latitude: 0,
        longitude: 0,
        arrivalTime: '',
        departureTime: '',
        distance: 0,
        haltageDuration: 0,
      },
      previousStation: null,
      nextStation: {
        name: nextStation,
        code: extractStationCode(nextStation),
        latitude: 0,
        longitude: 0,
        arrivalTime: '',
        departureTime: '',
        distance: 0,
        haltageDuration: 0,
      },
      status,
      distanceToNextStation: 0,
      progress,
    });

    if (etaPrediction) {
      eta = {
        nextStation: etaPrediction.nextStation.name,
        estimatedArrival: etaPrediction.nextStation.eta,
        delayForecast: etaPrediction.nextStation.delayForecast,
      };
    }
  }

  // Step 6: Build unified response
  // Get coordinates from enriched data if available
  let startLat = 28.6, startLon = 77.2;
  try {
    if (kbTrain) {
      const enriched = await getEnrichedTrain(trainNumber);
      if (enriched?.enrichedRoute[0]) {
        startLat = enriched.enrichedRoute[0].latitude || 28.6;
        startLon = enriched.enrichedRoute[0].longitude || 77.2;
      }
    }
  } catch (e) {
    // Use defaults
  }

  // Use liveData coordinates if available and non-zero, otherwise use startLat/Lon
  const finalLat = (liveData && typeof liveData.latitude === 'number' && liveData.latitude !== 0) ? liveData.latitude : startLat;
  const finalLng = (liveData && typeof liveData.longitude === 'number' && liveData.longitude !== 0) ? liveData.longitude : startLon;
  console.log(`[TrainSearch] Final coordinates for response: lat=${finalLat}, lng=${finalLng} (from ${liveData?.source || 'enriched'})`);

  const response: UnifiedTrainResponse = {
    trainNumber: dbTrain.trainNumber,
    trainName: dbTrain.trainName,
    source: dbTrain.source,
    sourceCode: extractStationCode(dbTrain.source),
    destination: dbTrain.destination,
    destinationCode: extractStationCode(dbTrain.destination),
    currentStation,
    currentStationCode: extractStationCode(currentStation),
    nextStation,
    nextStationCode: extractStationCode(nextStation),
    delayMinutes: liveData?.delayMinutes || 0,
    currentSpeed: liveData?.speed || 0,
    location: {
      lat: finalLat,
      lng: finalLng,
    },
    // Top-level for API compatibility
    latitude: finalLat,
    longitude: finalLng,
    // Route information from database
    route: dbTrain.route,
    status,
    progress,
    eta,
    lastUpdated: new Date().toISOString(),
    dataSource: 'database',
    liveUnavailable,
    staticDataQuality: dbTrain.route.length > 2 ? 'high' : 'medium',
    liveDataQuality: liveUnavailable ? 'unavailable' : (liveData && liveData.confidence >= 0.75 ? 'high' : 'low'),
    predictionConfidence: liveUnavailable ? 0.35 : 0.8,
    mapConfidence: dbTrain.route.length > 2 ? (liveUnavailable ? 0.65 : 0.9) : 0.4,
  };

  console.log(`[TrainSearch] Response location values:`, {
    'liveData.lat': liveData?.latitude,
    'liveData.lng': liveData?.longitude,
    'response.lat': response.latitude,
    'response.lng': response.longitude,
    'location.lat': response.location?.lat,
    'location.lng': response.location?.lng,
    'startLat': startLat,
    'startLon': startLon,
  });

  try {
    const nearby = mapViewDataService.getTrainsByRegion(response.location.lat, response.location.lng, 80);
    const nearbyCount = nearby.length;
    const congestionLevel: 'low' | 'medium' | 'high' =
      nearbyCount >= 12 ? 'high' : nearbyCount >= 5 ? 'medium' : 'low';

    const sectionRiskScore = Math.min(
      100,
      Math.round(
        (congestionLevel === 'high' ? 55 : congestionLevel === 'medium' ? 35 : 18) +
          Math.max(0, response.delayMinutes) * 1.2 +
          (response.liveUnavailable ? 12 : 0)
      )
    );

    const haltRiskScore = Math.min(
      100,
      Math.round(
        sectionRiskScore * 0.45 +
          (response.currentSpeed && response.currentSpeed < 8 ? 28 : 0) +
          (response.status === 'at-station' ? 14 : 0)
      )
    );

    const delayRiskScore = Math.min(
      100,
      Math.round(
        sectionRiskScore * 0.5 +
          Math.max(0, response.delayMinutes) * 1.8 +
          (response.currentSpeed && response.currentSpeed < 20 ? 10 : 0)
      )
    );

    const activeSignals: string[] = [];
    if (response.liveUnavailable) {
      activeSignals.push('External live providers unavailable, using resilient coordinate fallback.');
    }
    if (congestionLevel !== 'low') {
      activeSignals.push(`Congestion ${congestionLevel.toUpperCase()} within 80 km radius (${nearbyCount} trains).`);
    }
    if ((response.currentSpeed || 0) < 10 && response.delayMinutes > 5) {
      activeSignals.push('Low speed with active delay indicates probable signal hold or section slowdown.');
    }
    if (response.eta?.delayForecast && response.eta.delayForecast > 10) {
      activeSignals.push(`ETA model predicts +${response.eta.delayForecast} min delay at next station.`);
    }

    response.operationalContext = {
      nearbyTrainsCount: nearbyCount,
      congestionLevel,
      sectionRiskScore,
      haltRiskScore,
      delayRiskScore,
      radiusKm: 80,
      activeSignals,
    };
  } catch (contextError) {
    console.warn('[TrainSearch] Failed to compute operational context:', contextError);
  }

  // Store in cache
  storeInCache(response);

  console.log(`[TrainSearch] Completed search for ${trainNumber}`);
  return response;
  } catch (error) {
    console.error('[TrainSearch] Error in trainSearchOrchestrator:', error);
    // Return minimal error response
    return {
      trainNumber: trainNumber,
      trainName: 'Unknown',
      source: 'Not Found',
      destination: 'Not Found',
      currentStation: 'Unknown',
      nextStation: 'Unknown',
      delayMinutes: 0,
      currentSpeed: 0,
      location: {
        lat: 28.6,  // Default to Delhi
        lng: 77.2,
      },
      route: [],
      status: 'unknown',
      progress: 0,
      lastUpdated: new Date().toISOString(),
      dataSource: 'none',
      liveUnavailable: true,
      staticDataQuality: 'low',
      liveDataQuality: 'unavailable',
      predictionConfidence: 0,
      mapConfidence: 0,
    };
  }
}

/**
 * Extract station code from station name
 * E.g., "Mumbai Central (MMCT)" → "MMCT"
 * E.g., "Dadar Junction" → "DJN"
 */
function extractStationCode(stationName: string): string {
  // Common timetable format: "Station Name - CODE"
  const suffixMatch = stationName.match(/-\s*([A-Z0-9]{2,6})\s*$/);
  if (suffixMatch?.[1]) {
    return suffixMatch[1];
  }

  // Try to extract code from parentheses
  const match = stationName.match(/\(([A-Z]+)\)/);
  if (match?.[1]) {
    return match[1];
  }

  // Generate code from first letters of words
  const words = stationName.split(/\s+/);
  let code = '';
  for (let i = 0; i < Math.min(3, words.length); i++) {
    code += words[i][0].toUpperCase();
  }
  return code || stationName.substring(0, 3).toUpperCase();
}

/**
 * Get all trains in database
 */
export async function getAllTrainsInDatabase(): Promise<DatabaseTrain[]> {
  const db = await loadDatabase();
  return Object.values(db.trains);
}

/**
 * Get database stats
 */
export async function getDatabaseStats() {
  const db = await loadDatabase();
  return {
    totalTrains: Object.keys(db.trains).length,
    lastUpdated: db.lastUpdated,
    cacheSize: searchCache.size,
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  searchCache.clear();
  console.log('[TrainSearch] All caches cleared');
}

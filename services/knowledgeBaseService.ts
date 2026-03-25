/**
 * Railway Knowledge Base Service
 *
 * Implements the "Core Railway Knowledge Base" layer
 * - Loads from pre-built railway_knowledge_base.json
 * - Provides fast in-memory queries for any train
 * - Cache-efficient and doesn't require live API calls
 *
 * This is the source of truth for:
 * - Train static data (number, name, route, stops)
 * - Station coordinates and names
 * - Complete route timetables
 */

import { readFile } from 'fs/promises';
import path from 'path';

export interface KnowledgeBaseTrain {
  trainNumber: string;
  trainName: string;
  category: string;
  source: string;
  destination: string;
  stops: TrainStop[];
  runningDays?: string | Record<string, boolean>;
  dataSource: string;
}

export interface TrainStop {
  sno: string;
  stationName: string;
  arrives: string;
  departs: string;
  distance: string;
  day: string;
}

export interface KnowledgeBaseStation {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

interface KnowledgeBaseData {
  trains: Record<string, KnowledgeBaseTrain>;
  stations: Record<string, KnowledgeBaseStation>;
  train_stops: Record<string, TrainStop[]>;
  metadata: {
    sources_loaded: string[];
  };
}

const KNOWLEDGE_BASE_FILE = path.join(process.cwd(), 'data', 'railway_knowledge_base.json');
let cachedKB: KnowledgeBaseData | null = null;
let cachedTrainAliasIndex: Map<string, string> | null = null;

function normalizeTrainNumberToken(value: string): string | null {
  const digitsOnly = String(value || '').trim().replace(/\D/g, '');
  if (!digitsOnly) {
    return null;
  }

  const numeric = parseInt(digitsOnly, 10);
  if (Number.isNaN(numeric)) {
    return null;
  }

  return String(numeric).padStart(5, '0');
}

function extractTrainAliases(value: string): string[] {
  const raw = String(value || '').trim();
  if (!raw) {
    return [];
  }

  const aliases = new Set<string>();
  aliases.add(raw);

  const normalizedRaw = normalizeTrainNumberToken(raw);
  if (normalizedRaw) {
    aliases.add(normalizedRaw);
  }

  const numericTokens = raw.match(/\d{3,6}/g) || [];
  for (const token of numericTokens) {
    aliases.add(token);
    const normalizedToken = normalizeTrainNumberToken(token);
    if (normalizedToken) {
      aliases.add(normalizedToken);
    }
  }

  return Array.from(aliases);
}

function buildTrainAliasIndex(kb: KnowledgeBaseData): Map<string, string> {
  const aliasIndex = new Map<string, string>();

  for (const [key, train] of Object.entries(kb.trains)) {
    const candidates = new Set<string>();
    candidates.add(key);

    if (train?.trainNumber) {
      candidates.add(train.trainNumber);
    }

    for (const candidate of candidates) {
      for (const alias of extractTrainAliases(candidate)) {
        if (!aliasIndex.has(alias)) {
          aliasIndex.set(alias, key);
        }
      }
    }
  }

  return aliasIndex;
}

function resolveTrainKey(kb: KnowledgeBaseData, trainNumber: string): string | null {
  const requested = String(trainNumber || '').trim();
  if (!requested) {
    return null;
  }

  if (requested in kb.trains) {
    return requested;
  }

  const normalized = normalizeTrainNumberToken(requested);
  if (normalized && normalized in kb.trains) {
    return normalized;
  }

  if (!cachedTrainAliasIndex) {
    cachedTrainAliasIndex = buildTrainAliasIndex(kb);
  }

  for (const alias of extractTrainAliases(requested)) {
    const resolvedKey = cachedTrainAliasIndex.get(alias);
    if (resolvedKey && resolvedKey in kb.trains) {
      return resolvedKey;
    }
  }

  return null;
}

/**
 * Load the knowledge base into memory (happens once per server startup)
 */
async function loadKnowledgeBase(): Promise<KnowledgeBaseData> {
  if (cachedKB) {
    return cachedKB;
  }

  try {
    const fileContent = await readFile(KNOWLEDGE_BASE_FILE, 'utf-8');
    const parsed = JSON.parse(fileContent) as KnowledgeBaseData;
    cachedKB = parsed;
    cachedTrainAliasIndex = null;
    console.log(`[KB] Knowledge base loaded: ${Object.keys(parsed.trains).length} trains, ${Object.keys(parsed.stations).length} stations`);
    return parsed;
  } catch (error: any) {
    console.error('[KB] Failed to load knowledge base:', error.message);
    throw new Error(`Knowledge base not available: ${error.message}`);
  }
}

/**
 * Search for a train by number in the knowledge base
 */
export async function searchTrainByNumber(trainNumber: string): Promise<KnowledgeBaseTrain | null> {
  const kb = await loadKnowledgeBase();
  const resolvedKey = resolveTrainKey(kb, trainNumber);
  return resolvedKey ? kb.trains[resolvedKey] : null;
}

/**
 * Get all available trains (useful for autocomplete, listings)
 */
export async function getAllTrains(): Promise<Record<string, KnowledgeBaseTrain>> {
  const kb = await loadKnowledgeBase();
  return kb.trains;
}

/**
 * Get station coordinates and details
 */
export async function getStationInfo(stationCode: string): Promise<KnowledgeBaseStation | null> {
  const kb = await loadKnowledgeBase();

  if (stationCode in kb.stations) {
    return kb.stations[stationCode];
  }

  return null;
}

/**
 * Search stations by partial name match
 */
export async function searchStationsByName(query: string): Promise<KnowledgeBaseStation[]> {
  const kb = await loadKnowledgeBase();
  const lowerQuery = query.toLowerCase();

  return Object.values(kb.stations)
    .filter(station => station.name.toLowerCase().includes(lowerQuery))
    .slice(0, 20); // Limit results
}

/**
 * Get train stops by train number
 */
export async function getTrainStops(trainNumber: string): Promise<TrainStop[] | null> {
  const kb = await loadKnowledgeBase();

  const resolvedKey = resolveTrainKey(kb, trainNumber);
  if (resolvedKey && resolvedKey in kb.train_stops) {
    return kb.train_stops[resolvedKey];
  }

  // Try from train object
  const train = await searchTrainByNumber(trainNumber);
  if (train && train.stops) {
    return train.stops;
  }

  return null;
}

/**
 * Enriched train response with station coordinates
 */
export interface EnrichedTrainRoute {
  sno: string;
  stationName: string;
  stationCode: string;
  arrives: string;
  departs: string;
  distance: string;
  day: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Get train with enriched route data (includes coordinates)
 */
export async function getEnrichedTrain(trainNumber: string): Promise<{
  train: KnowledgeBaseTrain;
  enrichedRoute: EnrichedTrainRoute[];
} | null> {
  const train = await searchTrainByNumber(trainNumber);
  if (!train) {
    return null;
  }

  const kb = await loadKnowledgeBase();

  const enrichedRoute = await Promise.all(
    train.stops.map(async (stop) => {
      // Extract station code from station name (e.g., "BADNERA JN - BD" -> "BD")
      const codeMatch = stop.stationName.match(/- ([A-Z]+)$/) || stop.stationName.match(/\(([A-Z]+)\)$/);
      const stationCode = codeMatch ? codeMatch[1] : '';

      // Look up station coordinates
      let stationInfo = null;
      if (stationCode) {
        stationInfo = kb.stations[stationCode];
      }

      return {
        ...stop,
        stationCode: stationCode || '',
        latitude: stationInfo?.lat,
        longitude: stationInfo?.lng,
      };
    })
  );

  return {
    train,
    enrichedRoute,
  };
}

/**
 * Get knowledge base statistics
 */
export async function getKnowledgeBaseStats() {
  const kb = await loadKnowledgeBase();

  return {
    totalTrains: Object.keys(kb.trains).length,
    totalStations: Object.keys(kb.stations).length,
    totalStops: Object.keys(kb.train_stops).length,
    sourceDescription: 'Indian Railways official data + curated datasets',
    sourcesLoaded: kb.metadata.sources_loaded,
  };
}

/**
 * Static Railway Database Service
 * Manages the static timetable data from Indian Railways
 * This is the source of truth for train routes and station information
 */

import { getTimetableDataset, TimetableTrain, TimetableDataset } from '@/services/timetableScraper';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

export interface StaticTrain {
  trainNumber: string;
  trainName: string;
  source: string;
  sourceCode: string;
  destination: string;
  destinationCode: string;
  type: string;
  class: string;
  frequency: string;
  route: StaticStation[];
}

export interface StaticStation {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  arrivalTime: string;
  departureTime: string;
  distance: number;
  haltageDuration: number;
}

export interface StationInfo {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  zone: string;
}

const DATABASE_FILE = path.join(process.cwd(), 'data', 'railwayData.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cachedDatabase: {
  trains: Record<string, StaticTrain>;
  stations: Record<string, StationInfo>;
  fetchedAt: string;
} | null = null;

/**
 * Load the static railway database
 * Fetches from scraper and caches locally
 */
export async function loadStaticRailwayDatabase() {
  try {
    // Try to load from cache first
    if (cachedDatabase) {
      const age = Date.now() - new Date(cachedDatabase.fetchedAt).getTime();
      if (age < CACHE_TTL_MS) {
        return cachedDatabase;
      }
    }

    // Fetch fresh data from scraper
    const dataset = await getTimetableDataset();

    // Transform to static database format
    const trainMap: Record<string, StaticTrain> = {};
    const stationMap: Record<string, StationInfo> = {};

    for (const [trainNumber, train] of Object.entries(dataset.trains)) {
      const route: StaticStation[] = train.route.map((stop, idx) => {
        const codeMatch = stop.station.match(/\(([A-Z]+)\)/);
        const code = codeMatch ? codeMatch[1] : stop.station.substring(0, 3).toUpperCase();

        return {
          name: stop.station,
          code,
          latitude: getStationLatitude(stop.station),
          longitude: getStationLongitude(stop.station),
          arrivalTime: stop.arrival,
          departureTime: stop.departure,
          distance: idx === 0 ? 0 : calculateDistance(train.route[0].station, stop.station),
          haltageDuration: calculateHaltage(stop.arrival, stop.departure),
        };
      });

      trainMap[trainNumber] = {
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        source: train.source,
        sourceCode: train.source.match(/\(([A-Z]+)\)/)![1] || train.source,
        destination: train.destination,
        destinationCode: train.destination.match(/\(([A-Z]+)\)/)![1] || train.destination,
        type: 'Express',
        class: 'All Classes',
        frequency: 'Daily',
        route,
      };

      // Add stations to map
      for (const stop of route) {
        if (!stationMap[stop.code]) {
          stationMap[stop.code] = {
            name: stop.name,
            code: stop.code,
            latitude: stop.latitude,
            longitude: stop.longitude,
            zone: 'India', // Would be determined from actual data
          };
        }
      }
    }

    cachedDatabase = {
      trains: trainMap,
      stations: stationMap,
      fetchedAt: new Date().toISOString(),
    };

    // Persist to disk
    await persistDatabase(cachedDatabase);

    return cachedDatabase;
  } catch (error) {
    console.error('Error loading static railway database:', error);
    throw error;
  }
}

/**
 * Get a specific train's static information
 */
export async function getStaticTrain(trainNumber: string): Promise<StaticTrain | null> {
  const db = await loadStaticRailwayDatabase();
  return db.trains[trainNumber] || null;
}

/**
 * Get all trains from the static database
 */
export async function getAllStaticTrains(): Promise<StaticTrain[]> {
  const db = await loadStaticRailwayDatabase();
  return Object.values(db.trains);
}

/**
 * Get station information
 */
export async function getStation(stationCode: string): Promise<StationInfo | null> {
  const db = await loadStaticRailwayDatabase();
  return db.stations[stationCode] || null;
}

/**
 * Get all stations
 */
export async function getAllStations(): Promise<StationInfo[]> {
  const db = await loadStaticRailwayDatabase();
  return Object.values(db.stations);
}

/**
 * Find nearest station to coordinates
 */
export async function findNearestStation(
  latitude: number,
  longitude: number
): Promise<StationInfo & { distance: number } | null> {
  const stations = await getAllStations();

  let nearest: (StationInfo & { distance: number }) | null = null;
  let minDistance = Infinity;

  for (const station of stations) {
    const distance = calculateGreatCircleDistance(
      latitude,
      longitude,
      station.latitude,
      station.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...station, distance };
    }
  }

  return nearest;
}

/**
 * Get train route with coordinates
 */
export async function getTrainRoute(trainNumber: string) {
  const train = await getStaticTrain(trainNumber);
  if (!train) return null;

  return {
    trainNumber: train.trainNumber,
    trainName: train.trainName,
    source: train.source,
    destination: train.destination,
    route: train.route.map((stop) => ({
      station: stop.name,
      code: stop.code,
      latitude: stop.latitude,
      longitude: stop.longitude,
      arrivalTime: stop.arrivalTime,
      departureTime: stop.departureTime,
      distance: stop.distance,
      haltageDuration: stop.haltageDuration,
    })),
  };
}

/**
 * Helper: Persist database to disk
 */
async function persistDatabase(db: any) {
  try {
    await mkdir(path.dirname(DATABASE_FILE), { recursive: true });
    await writeFile(DATABASE_FILE, JSON.stringify(db, null, 2));
    console.log('✓ Static railway database saved to', DATABASE_FILE);
  } catch (error) {
    console.error('Error persisting database:', error);
  }
}

/**
 * Helper: Get station latitude (hardcoded mapping for known stations)
 */
function getStationLatitude(stationName: string): number {
  const stations: Record<string, number> = {
    'Mumbai Central (MMCT)': 18.9676,
    'Nagpur Junction (NG)': 21.1458,
    'New Delhi (NDLS)': 28.6431,
    'Bangalore City Junction (SBC)': 12.9716,
    'Howrah Junction (HWH)': 22.5958,
    'Chennai Central (MAS)': 13.0827,
    'Secunderabad Junction (SC)': 17.3700,
    'Dadar Junction': 19.0176,
    'Thane Junction': 19.2183,
    'Nashik Road': 19.9108,
    'Aurangabad': 19.8762,
    'Akola Junction': 20.7257,
    'Gwalior Junction': 26.2077,
    'Bhopal Junction': 23.1815,
    'Jaipur Junction (JP)': 26.9124,
    'Agra Cantt': 27.1594,
    'Visakhapatnam Junction (VSKP)': 17.6869,
    'Guwahati Junction (GHY)': 26.1445,
  };
  return stations[stationName] || 23.0; // Default fallback
}

/**
 * Helper: Get station longitude
 */
function getStationLongitude(stationName: string): number {
  const stations: Record<string, number> = {
    'Mumbai Central (MMCT)': 72.8194,
    'Nagpur Junction (NG)': 79.0882,
    'New Delhi (NDLS)': 77.2197,
    'Bangalore City Junction (SBC)': 77.5946,
    'Howrah Junction (HWH)': 88.2636,
    'Chennai Central (MAS)': 80.2707,
    'Secunderabad Junction (SC)': 78.5007,
    'Dadar Junction': 72.8275,
    'Thane Junction': 72.9781,
    'Nashik Road': 73.7306,
    'Aurangabad': 75.3433,
    'Akola Junction': 77.0198,
    'Gwalior Junction': 78.1773,
    'Bhopal Junction': 77.4104,
    'Jaipur Junction (JP)': 75.7873,
    'Agra Cantt': 78.0068,
    'Visakhapatnam Junction (VSKP)': 83.2167,
    'Guwahati Junction (GHY)': 91.7362,
  };
  return stations[stationName] || 82.0; // Default fallback
}

/**
 * Helper: Calculate distance between stations (rough estimate)
 */
function calculateDistance(from: string, to: string): number {
  const lat1 = getStationLatitude(from);
  const lon1 = getStationLongitude(from);
  const lat2 = getStationLatitude(to);
  const lon2 = getStationLongitude(to);

  return calculateGreatCircleDistance(lat1, lon1, lat2, lon2);
}

/**
 * Helper: Calculate great circle distance between two points
 */
export function calculateGreatCircleDistance(
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
 * Helper: Calculate haltage duration from arrival/departure
 */
function calculateHaltage(arrival: string, departure: string): number {
  if (arrival === '--' || departure === '--') return 0;

  const [arrH, arrM] = arrival.split(':').map(Number);
  const [depH, depM] = departure.split(':').map(Number);

  let duration = depH * 60 + depM - (arrH * 60 + arrM);
  if (duration < 0) duration += 24 * 60; // Handle day boundary

  return Math.max(0, duration);
}

export default {
  loadStaticRailwayDatabase,
  getStaticTrain,
  getAllStaticTrains,
  getStation,
  getAllStations,
  findNearestStation,
  getTrainRoute,
};

/**
 * Real Trains Database - TypeScript Version (PRIMARY)
 * This is the SINGLE SOURCE OF TRUTH for all train metadata
 * Data is dynamically loaded from Indian Railways timetable scraper
 * Source: https://indianrailways.gov.in/railwayboard/view_section.jsp
 */

import { getTimetableDataset } from '@/services/timetableScraper';

// Built-in fallback data - ensures the catalog always has data
const FALLBACK_CATALOG = {
  '12955': {
    trainNumber: '12955',
    trainName: 'Somnath Express',
    source: 'Mumbai Central (MMCT)',
    sourceCode: 'MMCT',
    destination: 'Nagpur Junction (NG)',
    destinationCode: 'NG',
    distance: 0,
    maxSpeed: 110,
    avgSpeed: 70,
    duration: 0,
    frequency: 'Daily',
    runDays: [1, 2, 3, 4, 5, 6, 7],
    departureTime: '18:40',
    arrivalTime: '--+1',
    type: 'Express',
    class: 'All Classes',
    status: 'Active',
    stations: []
  },
  '13345': {
    trainNumber: '13345',
    trainName: 'Dakshin Express',
    source: 'New Delhi (NDLS)',
    sourceCode: 'NDLS',
    destination: 'Bangalore City Junction (SBC)',
    destinationCode: 'SBC',
    distance: 0,
    maxSpeed: 120,
    avgSpeed: 63,
    duration: 0,
    frequency: 'Daily',
    runDays: [1, 2, 3, 4, 5, 6, 7],
    departureTime: '09:00',
    arrivalTime: '--+2',
    type: 'Express',
    class: 'All Classes',
    status: 'Active',
    stations: []
  }
};

// Store for dynamically loaded catalog
let REAL_TRAINS_CATALOG: Record<string, any> = {
  ...FALLBACK_CATALOG
}; // Will be populated dynamically from scraper

/**
 * Initialize the catalog with real data from timetable scraper
 * This function syncs the catalog with live railway data
 */
export async function initializeRealTrainsCatalog() {
  try {
    const dataset = await getTimetableDataset();
    REAL_TRAINS_CATALOG = {};

    // Convert timetable format to catalog format
    for (const [trainNumber, train] of Object.entries(dataset.trains)) {
      REAL_TRAINS_CATALOG[trainNumber] = {
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        source: train.source,
        sourceCode: train.source.split('(')[1]?.replace(')', '') || '',
        destination: train.destination,
        destinationCode: train.destination.split('(')[1]?.replace(')', '') || '',
        distance: 0, // Will be calculated from route
        maxSpeed: 110,
        avgSpeed: 70,
        duration: 0,
        frequency: "Daily",
        runDays: [1, 2, 3, 4, 5, 6, 7],
        departureTime: train.route[0]?.departure || '--',
        arrivalTime: train.route[train.route.length - 1]?.arrival || '--+1',
        type: "Express",
        class: "All Classes",
        status: "Active",
        stations: train.route.map((stop, idx) => ({
          name: stop.station,
          code: stop.station.split('(')[1]?.replace(')', '') || '',
          lat: 0, // Would need geocoding
          lng: 0, // Would need geocoding
          km: idx === 0 ? 0 : (idx * 100) // Placeholder
        }))
      };
    }

    console.log(`✓ Initialized catalog with ${Object.keys(REAL_TRAINS_CATALOG).length} real trains`);
    return true;
  } catch (error) {
    console.error('Error initializing catalog:', error);
    return false;
  }
}

/**
 * Get a specific train by train number
 */
export function getTrainByNumber(trainNumber: string) {
  return REAL_TRAINS_CATALOG[trainNumber];
}

/**
 * Get all trains from the catalog
 */
export async function getAllTrainsAsync() {
  // First, try to get real scraped data
  try {
    const dataset = await getTimetableDataset();
    if (Object.keys(dataset.trains).length > 0) {
      // Convert timetable format to catalog format
      const trainMap: Record<string, any> = {};
      for (const [trainNumber, train] of Object.entries(dataset.trains)) {
        trainMap[trainNumber] = {
          trainNumber: train.trainNumber,
          trainName: train.trainName,
          source: train.source,
          sourceCode: train.source.split('(')[1]?.replace(')', '') || '',
          destination: train.destination,
          destinationCode: train.destination.split('(')[1]?.replace(')', '') || '',
          distance: 0,
          maxSpeed: 110,
          avgSpeed: 70,
          duration: 0,
          frequency: "Daily",
          runDays: [1, 2, 3, 4, 5, 6, 7],
          departureTime: train.route[0]?.departure || '--',
          arrivalTime: train.route[train.route.length - 1]?.arrival || '--+1',
          type: "Express",
          class: "All Classes",
          status: "Active",
          stations: train.route.map((stop, idx) => ({
            name: stop.station,
            code: stop.station.split('(')[1]?.replace(')', '') || '',
            lat: 0,
            lng: 0,
            km: idx === 0 ? 0 : (idx * 100)
          }))
        };
      }
      REAL_TRAINS_CATALOG = trainMap;
      return Object.values(trainMap);
    }
  } catch (error) {
    console.error('Error loading from scraper, using fallback:', error);
  }

  // Fallback to current catalog
  return Object.values(REAL_TRAINS_CATALOG);
}

/**
 * Get all trains from the catalog (synchronous version - returns fallback if not initialized)
 */
export function getAllTrains() {
  // If we have more than just the fallback, return those
  if (Object.keys(REAL_TRAINS_CATALOG).length > 2) {
    return Object.values(REAL_TRAINS_CATALOG);
  }

  // Otherwise return fallback and try to load async
  getAllTrainsAsync().catch(err => console.error('Async catalog load failed:', err));
  return Object.values(REAL_TRAINS_CATALOG);
}

/**
 * Search trains by query (number, name, source, or destination)
 */
export function searchTrains(query: string) {
  const upperQuery = query.toUpperCase();
  return Object.values(REAL_TRAINS_CATALOG).filter(
    (train) =>
      train.trainNumber.includes(upperQuery) ||
      train.trainName.toUpperCase().includes(upperQuery) ||
      train.source.toUpperCase().includes(upperQuery) ||
      train.destination.toUpperCase().includes(upperQuery)
  );
}

/**
 * Search trains by zone
 */
export function getTrainsByZone(zone: string) {
  return Object.values(REAL_TRAINS_CATALOG).filter((train) =>
    train.zone?.toUpperCase().includes(zone.toUpperCase())
  );
}

/**
 * Get catalog initialization status
 */
export function getCatalogSize(): number {
  return Object.keys(REAL_TRAINS_CATALOG).length;
}

export default REAL_TRAINS_CATALOG;

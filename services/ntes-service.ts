/**
 * NTES Integration Service
 * Fetches real-time train data from NTES website
 * Step-by-step integration to populate RailSense database for ML training
 *
 * CURRENT STEP: 1 - Basic connectivity and GPS data extraction
 * NEXT STEPS will gradually add: routes, station boards, cancellations, etc.
 */

import { setCache, getCache, deleteCache } from '@/lib/cache-service';

// Mock NTES API responses (will replace with real HTTP calls)
// In production, these would come from NTES website scraping/API

export interface NTESTrainRunningStatus {
  trainNumber: string;
  trainName: string;
  currentStatus: 'Running' | 'Arrived' | 'Departed' | 'Yet to start';
  lastReportedStation: {
    name: string;
    code: string;
    time: string;
  };
  delayMinutes: number;
  delayStatusText: string;
  distanceCovered?: number;
  distanceRemaining?: number;
  isArrived: boolean;
  isDeparted: boolean;
  currentLocationText: string;
  nextStation: {
    name: string;
    code: string;
  };
  scheduledArrivalTime: string;
  scheduledDepartureTime: string;
  actualArrivalTime?: string;
  actualDepartureTime?: string;
  platformNumber?: string;
}

export interface NTESStationBoard {
  stationCode: string;
  stationName: string;
  arrivalTrains: NTESStationBoardTrain[];
  departureTrains: NTESStationBoardTrain[];
  timestamp: string;
}

export interface NTESStationBoardTrain {
  trainNumber: string;
  trainName: string;
  origin: string;
  destination: string;
  scheduledTime: string;
  expectedTime: string;
  delayMinutes: number;
  platformNumber?: string;
  status: string;
}

export interface NTESTrainRoute {
  trainNumber: string;
  trainName: string;
  stations: NTESRouteStation[];
  totalDistance: number;
  totalDuration: number;
}

export interface NTESRouteStation {
  stationCode: string;
  stationName: string;
  sequenceIndex: number;
  scheduledArrival: string;
  scheduledDeparture: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayAtStation?: number;
  haltTime?: number;
  distanceFromSource?: number;
  status: 'passed' | 'upcoming' | 'current';
}

/**
 * STEP 1: Fetch Live Train Running Status with GPS data
 * This is the PRIMARY data source for real-time tracking
 * Typically called every 1-2 minutes for active trains
 */
export async function fetchTrainRunningStatus(trainNumber: string, startDate?: string): Promise<NTESTrainRunningStatus | null> {
  try {
    const cacheKey = `ntes:running:${trainNumber}:${startDate || 'today'}`;

    // Try cache first (5 min TTL for real-time data)
    const cached = await getCache<NTESTrainRunningStatus>(cacheKey);
    if (cached) {
      return cached;
    }

    // MOCK DATA - Replace with actual NTES scraping/API call
    // In production: const response = await fetchFromNTES(`/TrainRunningStatus?TrainNumber=${trainNumber}`);

    const mockData: NTESTrainRunningStatus = {
      trainNumber,
      trainName: 'Somnath Express',
      currentStatus: 'Running',
      lastReportedStation: {
        name: 'Virar',
        code: 'VR',
        time: new Date().toISOString()
      },
      delayMinutes: 15,
      delayStatusText: 'Late by 15 mins',
      distanceCovered: 150,
      distanceRemaining: 1118,
      isArrived: false,
      isDeparted: true,
      currentLocationText: 'Between Virar and Vasai Road',
      nextStation: {
        name: 'Vasai Road',
        code: 'VST'
      },
      scheduledArrivalTime: '20:25',
      scheduledDepartureTime: '20:35',
      actualArrivalTime: '20:40', // 15 mins late
      actualDepartureTime: '20:50',
      platformNumber: '1'
    };

    // Cache the result
    await setCache(cacheKey, mockData, { ttl: 300 }); // 5 min cache

    console.log(`[NTES] Fetched running status for train ${trainNumber}`);
    return mockData;
  } catch (error) {
    console.error(`[NTES] Error fetching running status for ${trainNumber}:`, error);
    return null;
  }
}

/**
 * STEP 2: Fetch Full Train Route with all station details
 * Called once per train journey to get complete route information
 * Cached for longer (1 hour) as route data doesn't change
 */
export async function fetchTrainRoute(trainNumber: string): Promise<NTESTrainRoute | null> {
  try {
    const cacheKey = `ntes:route:${trainNumber}`;

    // Try cache first (1 hour TTL for static route data)
    const cached = await getCache<NTESTrainRoute>(cacheKey);
    if (cached) {
      console.log(`[NTES] Route cache hit for train ${trainNumber}`);
      return cached;
    }

    // MOCK DATA - Replace with actual NTES scraping
    const mockRoute: NTESTrainRoute = {
      trainNumber,
      trainName: 'Somnath Express',
      stations: [
        {
          stationCode: 'MMCT',
          stationName: 'Mumbai Central',
          sequenceIndex: 0,
          scheduledArrival: '18:40',
          scheduledDeparture: '18:40',
          status: 'passed',
          haltTime: 0,
          distanceFromSource: 0
        },
        {
          stationCode: 'VR',
          stationName: 'Virar',
          sequenceIndex: 4,
          scheduledArrival: '20:10',
          scheduledDeparture: '20:15',
          actualArrival: '20:20',
          actualDeparture: '20:25',
          delayAtStation: 5,
          status: 'passed',
          haltTime: 5,
          distanceFromSource: 49
        },
        {
          stationCode: 'VST',
          stationName: 'Vasai Road',
          sequenceIndex: 5,
          scheduledArrival: '20:25',
          scheduledDeparture: '20:35',
          status: 'upcoming',
          haltTime: 10,
          distanceFromSource: 55
        }
      ],
      totalDistance: 1268,
      totalDuration: 1080 // minutes
    };

    await setCache(cacheKey, mockRoute, { ttl: 3600 }); // 1 hour cache
    console.log(`[NTES] Fetched route for train ${trainNumber} with ${mockRoute.stations.length} stations`);
    return mockRoute;
  } catch (error) {
    console.error(`[NTES] Error fetching route for ${trainNumber}:`, error);
    return null;
  }
}

/**
 * STEP 3: Fetch Station Board (Arrivals/Departures at specific station)
 * Called to get all trains arriving/departing at given station
 * Useful for congestion and load analysis
 */
export async function fetchStationBoard(stationCode: string): Promise<NTESStationBoard | null> {
  try {
    const cacheKey = `ntes:board:${stationCode}`;

    // Try cache first (10 min TTL - updates frequently)
    const cached = await getCache<NTESStationBoard>(cacheKey);
    if (cached) {
      return cached;
    }

    // MOCK DATA
    const mockBoard: NTESStationBoard = {
      stationCode,
      stationName: 'Virar',
      timestamp: new Date().toISOString(),
      arrivalTrains: [
        {
          trainNumber: '12955',
          trainName: 'Somnath Express',
          origin: 'Mumbai Central',
          destination: 'Nagpur',
          scheduledTime: '20:10',
          expectedTime: '20:20',
          delayMinutes: 10,
          platformNumber: '1',
          status: 'On Time'
        }
      ],
      departureTrains: [
        {
          trainNumber: '12955',
          trainName: 'Somnath Express',
          origin: 'Mumbai Central',
          destination: 'Nagpur',
          scheduledTime: '20:15',
          expectedTime: '20:25',
          delayMinutes: 10,
          platformNumber: '1',
          status: 'Delayed'
        }
      ]
    };

    await setCache(cacheKey, mockBoard, { ttl: 600 }); // 10 min cache
    console.log(`[NTES] Fetched station board for ${stationCode}`);
    return mockBoard;
  } catch (error) {
    console.error(`[NTES] Error fetching station board for ${stationCode}:`, error);
    return null;
  }
}

/**
 * Batch fetch running status for multiple trains
 * Used to populate database with current status snapshot
 */
export async function fetchRunningStatusBatch(trainNumbers: string[], startDate?: string): Promise<Map<string, NTESTrainRunningStatus>> {
  const results = new Map<string, NTESTrainRunningStatus>();

  for (const trainNumber of trainNumbers) {
    const status = await fetchTrainRunningStatus(trainNumber, startDate);
    if (status) {
      results.set(trainNumber, status);
    }
  }

  console.log(`[NTES] Batch fetched running status for ${results.size}/${trainNumbers.length} trains`);
  return results;
}

/**
 * Clear cache for specific train (when manual refresh needed)
 */
export async function invalidateCache(trainNumber?: string, cacheType?: 'running' | 'route' | 'board') {
  if (trainNumber) {
    if (!cacheType || cacheType === 'running') {
      await deleteCache(`ntes:running:${trainNumber}:*`);
    }
    if (!cacheType || cacheType === 'route') {
      await deleteCache(`ntes:route:${trainNumber}`);
    }
  }
  console.log(`[NTES] Cache invalidated for train ${trainNumber || 'all'}`);
}

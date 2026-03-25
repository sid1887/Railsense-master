/**
 * Halt Detection Engine
 * Detects unexpected train halts and analyzes halt characteristics
 * Core logic for determining if a train has stopped unexpectedly
 */

import { TrainData, Station, HaltDetection } from '@/types/train';
import { calculateDistance } from '@/lib/utils';
import {
  detectHaltFromHistory,
  updateLocationHistory,
} from './railYatriService';

/**
 * Threshold constants for halt detection
 * These can be tuned based on real-world requirements
 */
const HALT_THRESHOLDS = {
  SPEED_THRESHOLD: 1, // km/h - below this is considered halted
  MIN_HALT_DURATION: 2, // minutes - minimum duration to be considered significant
  STATION_RADIUS: 0.5, // km - radius around scheduled stations
};

/**
 * Check if a train is at or near a scheduled station
 */
function isAtScheduledStation(
  trainLocation: { latitude: number; longitude: number },
  stations: Station[],
  stationIndex: number
): boolean {
  if (stationIndex < 0 || stationIndex >= stations.length) {
    return false;
  }

  const station = stations[stationIndex];
  const distance = calculateDistance(
    trainLocation.latitude,
    trainLocation.longitude,
    station.latitude,
    station.longitude
  );

  return distance <= HALT_THRESHOLDS.STATION_RADIUS;
}

/**
 * Check if a train is at or near any upcoming scheduled station
 * Accounts for trains approaching next station
 */
function isNearUpcomingStation(
  trainLocation: { latitude: number; longitude: number },
  stations: Station[],
  currentIndex: number
): boolean {
  // Check current and next 2 stations
  for (let i = currentIndex; i <= Math.min(currentIndex + 2, stations.length - 1); i++) {
    const station = stations[i];
    const distance = calculateDistance(
      trainLocation.latitude,
      trainLocation.longitude,
      station.latitude,
      station.longitude
    );

    if (distance <= HALT_THRESHOLDS.STATION_RADIUS * 2) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate halt duration in minutes
 */
function calculateHaltDuration(haltStartTime: number): number {
  return (Date.now() - haltStartTime) / (1000 * 60);
}

/**
 * Determine likely reason for halt based on context
 */
function determineHaltReason(
  train: TrainData,
  haltDuration: number,
  isNearStation: boolean
): string {
  // If near a scheduled station
  if (isNearStation) {
    const currentStation = train.scheduledStations[train.currentStationIndex];
    if (currentStation) {
      return `Halt at ${currentStation.name} (Scheduled stop)`;
    }
  }

  // If significant delay, likely traffic/regulation
  if (train.delay > 20) {
    return 'Traffic regulation or line congestion detected';
  }

  // If moderate duration, could be signal
  if (haltDuration > 5 && haltDuration < 15) {
    return 'Signal delay or maintenance work detected';
  }

  // Long halt, unusual circumstances
  if (haltDuration >= 15) {
    return 'Extended delay - possible track issue or accident';
  }

  return 'Speed regulation or minor delay';
}

/**
 * Main halt detection function
 * Returns detailed halt information if halt is detected
 *
 * Algorithm (Real Data):
 * 1. Track location history as train moves
 * 2. Detect halt = speed 0 AND same coordinates for 5+ minutes
 * 3. Verify not at scheduled station
 * 4. Return halt details if all conditions met
 */
export function detectUnexpectedHalt(trainData: TrainData): HaltDetection {
  const { currentLocation, speed, trainNumber, scheduledStations, currentStationIndex } = trainData;

  // Update location history for real halt detection
  updateLocationHistory(
    trainNumber,
    currentLocation.latitude,
    currentLocation.longitude,
    currentLocation.timestamp
  );

  // Use real halt detection based on location history
  const { isHalted, duration } = detectHaltFromHistory(trainNumber, speed);

  if (!isHalted) {
    return {
      halted: false,
    };
  }

  // Check if this is a scheduled station stop (expected halt)
  const atCurrentStation = isAtScheduledStation(
    currentLocation,
    scheduledStations,
    currentStationIndex
  );

  const nearUpcomingStation = isNearUpcomingStation(
    currentLocation,
    scheduledStations,
    currentStationIndex
  );

  // If at or near a scheduled station, it's expected
  if (atCurrentStation || nearUpcomingStation) {
    return {
      halted: false,
    };
  }

  // UNEXPECTED HALT DETECTED (not at scheduled station)
  const reason = determineHaltReason(trainData, duration, false);

  return {
    halted: true,
    haltDuration: duration,
    haltStartTime: currentLocation.timestamp - duration * 60 * 1000,
    detectedAt: currentLocation,
    reason: reason,
  };
}

/**
 * Get detailed halt analysis
 * Includes context about the halt section
 */
export function analyzeHalt(trainData: TrainData): HaltDetection & { context?: string } {
  const haltDetection = detectUnexpectedHalt(trainData);

  if (!haltDetection.halted) {
    return haltDetection;
  }

  // Find which section the train is halted in
  const { currentStationIndex, scheduledStations } = trainData;
  let context = '';

  if (currentStationIndex > 0 && currentStationIndex < scheduledStations.length) {
    const prevStation = scheduledStations[currentStationIndex - 1];
    const nextStation = scheduledStations[currentStationIndex];

    context = `Halted between ${prevStation.name} and ${nextStation.name}`;
  }

  return {
    ...haltDetection,
    context,
  };
}

/**
 * Check if halt is critical
 * Critical halts are extended unexpected stops
 */
export function isCriticalHalt(haltDetection: HaltDetection): boolean {
  if (!haltDetection.halted || !haltDetection.haltDuration) {
    return false;
  }

  // Halt is critical if duration exceeds 20 minutes
  return haltDetection.haltDuration > 20;
}

/**
 * Get halt severity level
 * LOW: < 5 minutes, MEDIUM: 5-15 minutes, HIGH: > 15 minutes
 */
export function getHaltSeverity(haltDetection: HaltDetection): 'LOW' | 'MEDIUM' | 'HIGH' | null {
  if (!haltDetection.halted || !haltDetection.haltDuration) {
    return null;
  }

  if (haltDetection.haltDuration < 5) return 'LOW';
  if (haltDetection.haltDuration < 15) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Analyze halt from database snapshots
 * Provides more accurate halt detection by analyzing historical movement patterns
 * Returns null if no database available or no halt detected
 */
export async function analyzeHaltFromDB(
  trainNumber: string,
  lookbackMinutes: number = 30
): Promise<HaltDetection | null> {
  try {
    // Only run on server side
    if (typeof window !== 'undefined') {
      return null;
    }

    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    const path = require('path');

    const dbPath = path.join(process.cwd(), 'data', 'history.db');

    // Try to open DB; if not exists, return null
    let db: any;
    try {
      db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
    } catch (e) {
      return null; // DB doesn't exist yet
    }

    const startTime = Date.now() - lookbackMinutes * 60 * 1000;

    // Get recent snapshots for this train
    const snapshots = await db.all(`
      SELECT lat, lng, speed, delay, timestamp
      FROM train_snapshots
      WHERE train_number = ? AND timestamp > ?
      ORDER BY timestamp DESC
      LIMIT 20
    `, [trainNumber, startTime]);

    await db.close();

    if (!snapshots || snapshots.length < 3) {
      return null; // Not enough data
    }

    // Analyze movement pattern
    let staticCount = 0;
    let minSpeed = Infinity;
    let maxLat = -Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let minLng = Infinity;

    for (const snap of snapshots) {
      if (snap.speed < HALT_THRESHOLDS.SPEED_THRESHOLD) {
        staticCount++;
      }
      minSpeed = Math.min(minSpeed, snap.speed || 0);
      maxLat = Math.max(maxLat, snap.lat || 0);
      maxLng = Math.max(maxLng, snap.lng || 0);
      minLat = Math.min(minLat, snap.lat || 0);
      minLng = Math.min(minLng, snap.lng || 0);
    }

    // If majority of snapshots show near-zero speed AND location variance < 0.01 degrees
    const locationVariance = Math.max(maxLat - minLat, maxLng - minLng);
    const isStationary = staticCount >= snapshots.length * 0.7 && locationVariance < 0.01;

    if (!isStationary) {
      return null;
    }

    // Calculate halt duration from timestamps
    const oldestSnapshot = snapshots[snapshots.length - 1];
    const newestSnapshot = snapshots[0];
    const durationMs = newestSnapshot.timestamp - oldestSnapshot.timestamp;
    const durationMinutes = durationMs / (1000 * 60);

    if (durationMinutes < HALT_THRESHOLDS.MIN_HALT_DURATION) {
      return null; // Too short to be significant
    }

    // Halt detected from DB analysis
    const avgLat = snapshots.reduce((sum: number, s: any) => sum + (s.lat || 0), 0) / snapshots.length;
    const avgLng = snapshots.reduce((sum: number, s: any) => sum + (s.lng || 0), 0) / snapshots.length;
    const avgDelay = snapshots.reduce((sum: number, s: any) => sum + (s.delay || 0), 0) / snapshots.length;

    return {
      halted: true,
      haltDuration: durationMinutes,
      haltStartTime: oldestSnapshot.timestamp,
      detectedAt: {
        latitude: avgLat,
        longitude: avgLng,
        timestamp: newestSnapshot.timestamp,
      },
      reason: `Stationary for ${durationMinutes.toFixed(1)}min (${snapshots.length} observations, avg delay: ${avgDelay.toFixed(1)}min)`
    };
  } catch (err) {
    console.warn('[analyzeHaltFromDB] Error:', err);
    return null;
  }
}

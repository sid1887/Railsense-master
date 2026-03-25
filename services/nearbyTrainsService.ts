/**
 * Nearby Trains Service
 * Query database for trains in same section or nearby area
 * Essential for understanding congestion and halt causes
 */

import { haversineMeters } from './utils';

export interface NearbyTrain {
  trainNumber: string;
  trainName: string;
  lat: number;
  lng: number;
  speed: number;
  distance_m: number;
  direction: string; // same, opposite
  age_sec: number; // how old is this sample
}

export interface NearbyTrainsContext {
  count: number;
  trains: NearbyTrain[];
  congestion_level: 'LOW' | 'MEDIUM' | 'HIGH';
  same_section_count: number;
}

/**
 * Query nearby trains from database
 * @param db - SQLite database connection
 * @param trainNumber - focus train
 * @param lat/lng - current position
 * @param radiusKm - search radius (default 2 km)
 * @param maxAgeMin - max age of snapshot (default 10 min)
 */
export async function queryNearbyTrains(
  db: any,
  trainNumber: string,
  lat: number,
  lng: number,
  radiusKm: number = 2,
  maxAgeMin: number = 10
): Promise<NearbyTrainsContext> {
  return new Promise((resolve, reject) => {
    const sinceMs = Date.now() - maxAgeMin * 60 * 1000;

    // Get last sample for each OTHER train in timeframe
    db.all(
      `SELECT DISTINCT
        ts.train_number,
        ts.lat,
        ts.lng,
        ts.speed,
        ts.timestamp
       FROM train_snapshots ts
       WHERE ts.train_number != ?
         AND ts.timestamp >= ?
         AND ts.lat IS NOT NULL
         AND ts.lng IS NOT NULL
       ORDER BY ts.train_number, ts.timestamp DESC`,
      [trainNumber, sinceMs],
      (err: any, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        if (!rows || rows.length === 0) {
          resolve({
            count: 0,
            trains: [],
            congestion_level: 'LOW',
            same_section_count: 0,
          });
          return;
        }

        // Deduplicate (group by train, take latest)
        const latestByTrain = new Map<string, any>();
        for (const row of rows) {
          if (!latestByTrain.has(row.train_number)) {
            latestByTrain.set(row.train_number, row);
          }
        }

        // Filter by distance
        const nearbyList: NearbyTrain[] = [];
        const now = Date.now();

        for (const row of latestByTrain.values()) {
          const distM = haversineMeters(lat, lng, row.lat, row.lng);
          if (distM <= radiusKm * 1000) {
            const ageSec = Math.floor((now - row.timestamp) / 1000);
            nearbyList.push({
              trainNumber: row.train_number,
              trainName: `Train ${row.train_number}`, // would lookup from schedule
              lat: row.lat,
              lng: row.lng,
              speed: row.speed || 0,
              distance_m: Math.round(distM),
              direction: 'same', // would determine from bearing
              age_sec: ageSec,
            });
          }
        }

        // Sort by distance
        nearbyList.sort((a, b) => a.distance_m - b.distance_m);

        // Determine congestion level
        let congestion: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (nearbyList.length >= 5) congestion = 'HIGH';
        else if (nearbyList.length >= 2) congestion = 'MEDIUM';

        resolve({
          count: nearbyList.length,
          trains: nearbyList.slice(0, 10), // top 10
          congestion_level: congestion,
          same_section_count: 0, // would be populated if we had section_id matching
        });
      }
    );
  });
}

/**
 * Query trains in same section
 * More sophisticated: uses section_id instead of distance
 */
export async function queryTrainsInSection(
  db: any,
  sectionId: string,
  maxAgeMin: number = 10
): Promise<NearbyTrain[]> {
  return new Promise((resolve, reject) => {
    const sinceMs = Date.now() - maxAgeMin * 60 * 1000;

    db.all(
      `SELECT DISTINCT
        ts.train_number,
        ts.lat,
        ts.lng,
        ts.speed,
        ts.timestamp
       FROM train_snapshots ts
       WHERE ts.section_id = ?
         AND ts.timestamp >= ?
       ORDER BY ts.timestamp DESC`,
      [sectionId, sinceMs],
      (err: any, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const trains: NearbyTrain[] =
          rows?.map(row => ({
            trainNumber: row.train_number,
            trainName: `Train ${row.train_number}`,
            lat: row.lat,
            lng: row.lng,
            speed: row.speed || 0,
            distance_m: 0, // same section
            direction: 'same',
            age_sec: Math.floor((Date.now() - row.timestamp) / 1000),
          })) || [];

        resolve(trains);
      }
    );
  });
}

/**
 * Get congestion level for a section
 * (number of trains present in section right now)
 */
export async function getSectionCongestion(db: any, sectionId: string): Promise<'LOW' | 'MEDIUM' | 'HIGH'> {
  const trains = await queryTrainsInSection(db, sectionId, 5);
  if (trains.length >= 4) return 'HIGH';
  if (trains.length >= 2) return 'MEDIUM';
  return 'LOW';
}

/**
 * Analyze if halt is likely due to traffic regulation
 * Returns confidence score (0-1)
 */
export function analyzeTrafficAsHaltCause(nearbyContext: NearbyTrainsContext, trainSpeed: number): number {
  // High confidence if:
  // - multiple trains nearby
  // - our train is stopped but others moving
  // - congestion level is HIGH

  if (nearbyContext.count === 0) return 0; // no traffic
  if (nearbyContext.congestion_level !== 'HIGH') return 0.2; // low confidence unless many trains

  // If our train stopped but others moving: likely traffic regulation
  const othersMoving = nearbyContext.trains.filter(t => t.speed > 5).length;
  if (trainSpeed < 1 && othersMoving > 0) return 0.8;

  return 0.5; // default medium confidence
}

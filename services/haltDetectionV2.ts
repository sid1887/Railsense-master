/**
 * Halt Detection Service
 * Sliding-window algorithm for detecting unexpected train halts
 * Analyzes historical snapshots, not single samples
 */

import { haversine } from './utils';

export interface HaltDetectionResult {
  halted: boolean;
  is_scheduled_stop: boolean;
  halt_duration_sec: number;
  confidence: number;
  reason_candidates: Array<{
    id: string;
    label: string;
    score: number;
  }>;
  stationary_count: number;
  distance_span_m: number;
  data_points: number;
}

/**
 * Haversine distance (kilometers)
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a location is within threshold of any scheduled station
 */
function isNearScheduledStation(lat: number, lng: number, scheduledStations: any[], thresholdKm: number = 0.2): boolean {
  if (!scheduledStations || scheduledStations.length === 0) return false;

  for (const station of scheduledStations) {
    const distance = haversineDistance(lat, lng, station.latitude || station.lat, station.longitude || station.lng);
    if (distance <= thresholdKm) {
      return true;
    }
  }
  return false;
}

/**
 * Robust halt detection using sliding window on recent snapshots
 *
 * @param history - array of recent snapshots (sorted by timestamp, oldest first)
 * @param scheduledStations - array of next/prev scheduled stops
 * @param minSampleWindow - minimum samples needed to make decision
 * @returns HaltDetectionResult with confidence scores
 */
export function detectHaltFromHistory(
  history: any[],
  scheduledStations: any[] = [],
  minSampleWindow: number = 3
): HaltDetectionResult {
  const result: HaltDetectionResult = {
    halted: false,
    is_scheduled_stop: false,
    halt_duration_sec: 0,
    confidence: 0,
    reason_candidates: [],
    stationary_count: 0,
    distance_span_m: 0,
    data_points: history.length,
  };

  // Early exit: insufficient data
  if (!history || history.length < minSampleWindow) {
    result.confidence = 0;
    return result;
  }

  const N = history.length;
  const first = history[0];
  const last = history[N - 1];

  // Count stationary samples: speed <= 1 km/h OR position hasn't moved >30m
  let stationaryCount = 0;
  for (let i = 0; i < N; i++) {
    const sample = history[i];
    const speed = sample.speed !== null && sample.speed !== undefined ? sample.speed : 0;
    let isStationary = speed <= 1;

    // Also check position delta
    if (!isStationary && i > 0) {
      const prevSample = history[i - 1];
      if (prevSample.lat !== null && prevSample.lng !== null && sample.lat !== null && sample.lng !== null) {
        const deltaKm = haversineDistance(prevSample.lat, prevSample.lng, sample.lat, sample.lng);
        isStationary = deltaKm < 0.03; // < 30 meters
      }
    }

    if (isStationary) stationaryCount++;
  }

  // Distance span: how far did train move during this window?
  let distanceSpanM = 0;
  if (first.lat !== null && first.lng !== null && last.lat !== null && last.lng !== null) {
    distanceSpanM = haversineDistance(first.lat, first.lng, last.lat, last.lng) * 1000; // to meters
  }

  // Is train at a scheduled stop?
  let isAtStation = false;
  if (last.lat !== null && last.lng !== null) {
    isAtStation = isNearScheduledStation(last.lat, last.lng, scheduledStations);
  }

  // Primary halt detection: stationary + not moving significantly
  const stationaryRatio = stationaryCount / N;
  const isStationary = stationaryRatio >= 0.65 && distanceSpanM < 50;
  result.halted = isStationary && !isAtStation; // if at station, it's scheduled
  result.is_scheduled_stop = isAtStation && isStationary;
  result.stationary_count = stationaryCount;
  result.distance_span_m = distanceSpanM;

  // Calculate halt duration
  if (result.halted || result.is_scheduled_stop) {
    const firstLowIdx = history.findIndex(h => {
      const speed = h.speed !== null && h.speed !== undefined ? h.speed : 0;
      return speed <= 1;
    });
    const startTs = firstLowIdx >= 0 ? history[firstLowIdx].timestamp : history[0].timestamp;
    result.halt_duration_sec = Math.floor((last.timestamp - startTs) / 1000);
  }

  // Confidence scoring
  let confidence = 0.5;

  if (stationaryRatio >= 0.8) confidence += 0.2;
  else if (stationaryRatio >= 0.65) confidence += 0.1;

  if (result.is_scheduled_stop) {
    confidence -= 0.2; // lower confidence for scheduled stops
  } else if (result.halted) {
    confidence += 0.15; // boost for unexpected halt
  }

  // Position variance: if all samples are very close together, more confident
  let maxDelta = 0;
  for (let i = 1; i < N; i++) {
    const curr = history[i];
    const prev = history[i - 1];
    if (curr.lat !== null && curr.lng !== null && prev.lat !== null && prev.lng !== null) {
      const delta = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng) * 1000;
      maxDelta = Math.max(maxDelta, delta);
    }
  }

  if (maxDelta < 20) confidence += 0.1; // very tight grouping
  else if (maxDelta > 100) confidence -= 0.1; // high variance suggests noise

  confidence = Math.max(0, Math.min(1, confidence));
  result.confidence = Number(confidence.toFixed(2));

  // Reason candidates (for why the train is halted)
  const reasons: Array<{ id: string; label: string; score: number }> = [];

  if (result.halted) {
    // Heuristic reason scoring
    // (In production, integrate with nearby_trains, signal metadata, weather, etc.)

    // traffic_regulation: presence of other trains in same section (would need nearby_trains data)
    reasons.push({
      id: 'traffic_regulation',
      label: 'Traffic Regulation / Precedence',
      score: 0.4, // placeholder - increase if nearby_trains > 2
    });

    // platform_unavailable: if at station and halt is long
    if (result.is_scheduled_stop && result.halt_duration_sec > 300) {
      reasons.push({
        id: 'platform_unavailable',
        label: 'Platform Unavailable / Extended Dwell',
        score: 0.35,
      });
    }

    // signal_hold: common generic reason
    reasons.push({
      id: 'signal_hold',
      label: 'Signal Hold / Line Maintenance',
      score: 0.3,
    });

    // technical_issue: if abrupt speed drop
    if (history.length >= 3) {
      const speeds = history.map(h => (h.speed !== null ? h.speed : 0));
      const speedDrop = speeds[Math.max(0, speeds.length - 3)] - speeds[speeds.length - 1];
      if (speedDrop > 20) {
        reasons.push({
          id: 'technical_issue',
          label: 'Technical / Engine Issue',
          score: 0.25,
        });
      }
    }

    // Sort by score descending
    reasons.sort((a, b) => b.score - a.score);
  }

  result.reason_candidates = reasons;

  return result;
}

/**
 * Get last N snapshots for a train from database (requires DB connection)
 * This would be called before detecting halt
 */
export async function getLastSnapshotsFromDB(
  db: any,
  trainNumber: string,
  secondsWindow: number = 300,
  maxSamples: number = 20
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const since = Date.now() - secondsWindow * 1000;
    db.all(
      `SELECT * FROM train_snapshots
       WHERE train_number = ? AND timestamp >= ?
       ORDER BY timestamp ASC
       LIMIT ?`,
      [trainNumber, since, maxSamples],
      (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Async wrapper: fetch snapshots and run detection
 */
export async function detectHaltWithDB(
  db: any,
  trainNumber: string,
  scheduledStations: any[] = [],
  secondsWindow: number = 300
): Promise<HaltDetectionResult> {
  const history = await getLastSnapshotsFromDB(db, trainNumber, secondsWindow);
  const result = detectHaltFromHistory(history, scheduledStations);

  // Record significant halts to database
  if ((result.halted || result.is_scheduled_stop) && result.confidence >= 0.6 && result.halt_duration_sec >= 600) {
    try {
      const snapshotDb = require('./snapshotDatabase').default;
      if (snapshotDb && snapshotDb.recordHaltEvent) {
        const station = scheduledStations && scheduledStations.length > 0 ? scheduledStations[0] : undefined;

        await snapshotDb.recordHaltEvent({
          trainNumber,
          sectionCode: station?.code || 'UNKNOWN',
          sectionName: station?.name || 'Unknown Section',
          haltStartTime: new Date(Date.now() - result.halt_duration_sec * 1000).toISOString(),
          haltEndTime: null,
          haltDurationSeconds: result.halt_duration_sec,
          haltReason: result.reason_candidates[0]?.label || 'Operational halt',
          estimatedCause: result.reason_candidates[0]?.id || 'unknown',
          haltConfidence: result.confidence,
          isScheduledStop: result.is_scheduled_stop,
        });

        console.log(
          `[HaltDetectionV2] Recorded halt for ${trainNumber}: ${result.halt_duration_sec}s at ${result.confidence * 100}% confidence`
        );
      }
    } catch (e) {
      console.warn(`[HaltDetectionV2] Failed to record halt to database:`, e);
    }
  }

  return result;
}

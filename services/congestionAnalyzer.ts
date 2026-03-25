/**
 * Congestion Analyzer - Background Job Service
 * Aggregates train snapshots into congestion metrics
 * Runs periodically (every 15 minutes) to update congestion_metrics table
 */

import snapshotDatabase from './snapshotDatabase';
import { getNearbyTrainsData } from './trainDataService';

interface TrainSnapshot {
  trainNumber: string;
  latitude: number;
  longitude: number;
  speed: number;
  delay: number;
  station: string;
  stationCode: string;
  timestamp: number;
}

interface SectionMetrics {
  sectionCode: string;
  sectionName: string;
  trainsInSection: number;
  nearbyTrainsPerTrain: number[];
  avgDelay: number;
  densityPerKm: number;
}

class CongestionAnalyzer {
  private db: any = null;
  private isRunning = false;
  private updateIntervalMinutes = 15;

  constructor() {
    if (typeof window === 'undefined') {
      try {
        this.db = require('./snapshotDatabase').default;
      } catch (e) {
        console.error('[CongestionAnalyzer] Failed to load database:', e);
      }
    }
  }

  /**
   * Start background job to periodically update congestion metrics
   */
  startBackgroundJob() {
    if (this.isRunning) {
      console.warn('[CongestionAnalyzer] Job already running');
      return;
    }

    this.isRunning = true;
    console.log('[CongestionAnalyzer] Background job started');

    // Run immediately on startup
    this.aggregateMetrics().catch(e => {
      console.error('[CongestionAnalyzer] Initial aggregation failed:', e);
    });

    // Then run periodically
    setInterval(() => {
      this.aggregateMetrics().catch(e => {
        console.error('[CongestionAnalyzer] Periodic aggregation failed:', e);
      });
    }, this.updateIntervalMinutes * 60 * 1000);
  }

  /**
   * Stop background job
   */
  stopBackgroundJob() {
    this.isRunning = false;
    console.log('[CongestionAnalyzer] Background job stopped');
  }

  /**
   * Aggregate recent snapshots into congestion metrics
   */
  private async aggregateMetrics(): Promise<void> {
    try {
      if (!this.db) {
        console.warn('[CongestionAnalyzer] Database not initialized');
        return;
      }

      const now = new Date();
      const hour = now.getHours();
      const date = now.toISOString().split('T')[0];

      console.log(`[CongestionAnalyzer] Aggregating metrics for ${date} hour ${hour}...`);

      // Get all trains from last 30 minutes of snapshots
      const recentSnapshots = await this._getRecentSnapshots(30 * 60 * 1000);

      // Group snapshots by section
      const sectionMetrics = await this._analyzeSections(recentSnapshots);

      // Write metrics to database
      for (const section of sectionMetrics) {
        await this._recordSectionMetric(section, hour, date);
      }

      console.log(`[CongestionAnalyzer] Aggregation complete: ${sectionMetrics.length} sections analyzed`);
    } catch (error) {
      console.error('[CongestionAnalyzer] Error in aggregateMetrics:', error);
    }
  }

  /**
   * Get recent snapshots from the database
   */
  private async _getRecentSnapshots(timeWindowMs: number): Promise<TrainSnapshot[]> {
    return new Promise((resolve) => {
      const cutoffTime = Date.now() - timeWindowMs;
      const snapshots: TrainSnapshot[] = [];

      const query = `
        SELECT
          trainNumber,
          latitude,
          longitude,
          speed,
          delay,
          currentStation,
          stationCode,
          timestamp
        FROM train_snapshots
        WHERE timestamp > ?
        ORDER BY trainNumber, timestamp DESC
      `;

      this.db.all(query, [cutoffTime], (err: any, rows: any[]) => {
        if (err) {
          console.error('[CongestionAnalyzer] Error fetching snapshots:', err);
          resolve([]);
          return;
        }

        if (rows) {
          snapshots.push(
            ...rows.map((row: any) => ({
              trainNumber: row.trainNumber,
              latitude: row.latitude,
              longitude: row.longitude,
              speed: row.speed || 0,
              delay: row.delay || 0,
              station: row.currentStation,
              stationCode: row.stationCode,
              timestamp: row.timestamp,
            }))
          );
        }

        resolve(snapshots);
      });
    });
  }

  /**
   * Analyze sections to find train density and delays
   */
  private async _analyzeSections(snapshots: TrainSnapshot[]): Promise<SectionMetrics[]> {
    const sectionMap = new Map<string, TrainSnapshot[]>();

    // Group snapshots by station code (section)
    snapshots.forEach(snapshot => {
      if (!snapshot.stationCode) return;

      if (!sectionMap.has(snapshot.stationCode)) {
        sectionMap.set(snapshot.stationCode, []);
      }
      sectionMap.get(snapshot.stationCode)!.push(snapshot);
    });

    // Analyze each section
    const metrics: SectionMetrics[] = [];

    for (const [sectionCode, trains] of sectionMap) {
      if (trains.length === 0) continue;

      // Get unique trains in this section
      const uniqueTrains = [...new Set(trains.map(t => t.trainNumber))];
      const avgDelay = trains.reduce((sum, t) => sum + t.delay, 0) / trains.length;

      // Calculate nearby trains for each train (trains within 100km)
      const nearbyTrainsPerTrain: number[] = [];
      for (const train of uniqueTrains) {
        const trainSnapshots = trains.filter(t => t.trainNumber === train);
        if (trainSnapshots.length === 0) continue;

        // Get latest snapshot for this train
        const latestSnapshot = trainSnapshots[0];

        // Count trains within 100km radius
        const nearbyCount = uniqueTrains.filter(otherTrain => {
          if (otherTrain === train) return false;

          const otherSnapshots = trains.filter(t => t.trainNumber === otherTrain);
          if (otherSnapshots.length === 0) return false;

          const otherLatest = otherSnapshots[0];
          const distance = this._haversineDistance(
            latestSnapshot.latitude,
            latestSnapshot.longitude,
            otherLatest.latitude,
            otherLatest.longitude
          );

          return distance <= 100;
        }).length;

        nearbyTrainsPerTrain.push(nearbyCount);
      }

      const avgNearby = nearbyTrainsPerTrain.length > 0
        ? nearbyTrainsPerTrain.reduce((a, b) => a + b, 0) / nearbyTrainsPerTrain.length
        : 0;

      // Estimate section length (20-50km for typical Indian Railway sections)
      const estimatedSectionLengthKm = 35;
      const densityPerKm = uniqueTrains.length / estimatedSectionLengthKm;

      // Classify congestion level
      const congestionLevel = this._classifyCongestion(avgNearby, avgDelay);

      const stationName = trains[0]?.station || `Section ${sectionCode}`;

      metrics.push({
        sectionCode,
        sectionName: stationName,
        trainsInSection: uniqueTrains.length,
        nearbyTrainsPerTrain: nearbyTrainsPerTrain,
        avgDelay,
        densityPerKm,
      });
    }

    return metrics;
  }

  /**
   * Record section metrics to database
   */
  private async _recordSectionMetric(
    metric: SectionMetrics,
    hour: number,
    date: string
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve();
        return;
      }

      const trafficDensity = Math.min(1, metric.densityPerKm / 0.5); // 0.5 trains/km = density 1
      const avgNearby = metric.nearbyTrainsPerTrain.reduce((a, b) => a + b, 0) / Math.max(1, metric.nearbyTrainsPerTrain.length);

      const query = `
        INSERT INTO congestion_metrics
        (sectionCode, sectionName, recordedAt, hour, date, nearbyTrainsCount, avgNearbyTrainsPerTrain, trafficDensity, congestionLevel, avgDelayInSection)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        metric.sectionCode,
        metric.sectionName,
        Date.now(),
        hour,
        date,
        metric.trainsInSection,
        avgNearby.toFixed(2),
        trafficDensity.toFixed(3),
        this._classifyCongestion(avgNearby, metric.avgDelay),
        metric.avgDelay,
      ];

      this.db.run(query, values, (err: any) => {
        if (err) {
          console.warn('[CongestionAnalyzer] Error recording metric:', err);
        }
        resolve();
      });
    });
  }

  /**
   * Calculate distance between two lat/lng points (Haversine formula)
   */
  private _haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Classify congestion level based on nearby trains and delays
   */
  private _classifyCongestion(
    avgNearby: number,
    avgDelay: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Factor in both train density and delays
    const densityScore = avgNearby / 5; // 0 = low, 1 = high
    const delayScore = Math.min(1, avgDelay / 120); // 120+ minutes = score 1

    const combinedScore = (densityScore + delayScore) / 2;

    if (combinedScore < 0.25) return 'low';
    if (combinedScore < 0.5) return 'medium';
    if (combinedScore < 0.75) return 'high';
    return 'critical';
  }
}

// Singleton instance
const congestionAnalyzer = new CongestionAnalyzer();

export default congestionAnalyzer;

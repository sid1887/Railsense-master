/**
 * Train Snapshot & Historical Database Layer
 * Captures and stores periodic snapshots of train position/state
 * Enables delay trend analysis, movement pattern detection, etc.
 *
 * Schema: train_snapshots
 * - id, trainNumber, stationCode, timestamp, delay, speed, status, etc.
 */

import sqlite3 from 'sqlite3';
import path from 'path';

export interface TrainSnapshot {
  id?: number;
  trainNumber: string;
  stationCode: string;
  stationName: string;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  delay: number; // minutes
  status: 'running' | 'halted' | 'stopped';
  timestamp: string; // ISO timestamp
  createdAt?: string;
}

class SnapshotDatabase {
  private db: sqlite3.Database | null = null;
  private initialized = false;

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const dbPath = path.join(process.cwd(), 'railsense.db');

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('[SnapshotDB] Connection error:', err);
          reject(err);
          return;
        }

        console.log('[SnapshotDB] Connected to SQLite database');

        // Create tables if not exist
        this.createTables()
          .then(() => {
            this.initialized = true;
            resolve();
          })
          .catch(reject);
      });
    });
  }

  /**
   * Create necessary database schema
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const schemaSql = `
        CREATE TABLE IF NOT EXISTS train_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trainNumber TEXT NOT NULL,
          stationCode TEXT,
          stationName TEXT,
          latitude REAL,
          longitude REAL,
          speed REAL DEFAULT 0,
          delay REAL DEFAULT 0,
          status TEXT DEFAULT 'running',
          timestamp TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS delay_statistics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          stationCode TEXT NOT NULL,
          hour INTEGER,
          avgDelay REAL,
          maxDelay REAL,
          minDelay REAL,
          trainCount INTEGER,
          date TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS data_quality_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          trainNumber TEXT,
          provider TEXT NOT NULL,
          isSuccessful BOOLEAN DEFAULT 1,
          dataQualityScore INTEGER DEFAULT 50,
          isSynthetic BOOLEAN DEFAULT 0,
          responseTime INTEGER,
          errorMessage TEXT,
          cacheHit BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS halt_statistics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trainNumber TEXT NOT NULL,
          sectionCode TEXT,
          sectionName TEXT,
          haltStartTime DATETIME,
          haltEndTime DATETIME,
          haltDurationSeconds INTEGER,
          haltReason TEXT,
          estimatedCause TEXT,
          haltConfidence REAL DEFAULT 0.5,
          isScheduledStop BOOLEAN DEFAULT 0,
          recordedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS congestion_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sectionCode TEXT NOT NULL,
          sectionName TEXT,
          recordedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          hour INTEGER,
          date TEXT NOT NULL,
          nearbyTrainsCount INTEGER DEFAULT 0,
          avgNearbyTrainsPerTrain REAL DEFAULT 0,
          trafficDensity REAL DEFAULT 0,
          congestionLevel TEXT DEFAULT 'low',
          avgDelayInSection REAL,
          throughput INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_snapshots_train_ts ON train_snapshots(trainNumber, timestamp);
        CREATE INDEX IF NOT EXISTS idx_snapshots_station ON train_snapshots(stationCode);
        CREATE INDEX IF NOT EXISTS idx_snapshots_created ON train_snapshots(createdAt);

        CREATE INDEX IF NOT EXISTS idx_delay_station_date_hour ON delay_statistics(stationCode, date, hour);

        CREATE INDEX IF NOT EXISTS idx_quality_ts_provider ON data_quality_log(timestamp, provider);
        CREATE INDEX IF NOT EXISTS idx_quality_train_ts ON data_quality_log(trainNumber, timestamp);

        CREATE INDEX IF NOT EXISTS idx_halt_train_recorded ON halt_statistics(trainNumber, recordedAt);
        CREATE INDEX IF NOT EXISTS idx_halt_section_recorded ON halt_statistics(sectionCode, recordedAt);

        CREATE INDEX IF NOT EXISTS idx_congestion_section_date_hour ON congestion_metrics(sectionCode, date, hour);
      `;

      this.db!.exec(schemaSql, (err) => {
        if (err) {
          reject(err);
          return;
        }

        console.log('[SnapshotDB] All tables created/verified');
        resolve();
      });
    });
  }

  /**
   * Insert or update train snapshot
   */
  async saveSnapshot(snapshot: TrainSnapshot): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run(
        `
        INSERT INTO train_snapshots
        (trainNumber, stationCode, stationName, latitude, longitude, speed, delay, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          snapshot.trainNumber,
          snapshot.stationCode,
          snapshot.stationName,
          snapshot.latitude,
          snapshot.longitude,
          snapshot.speed,
          snapshot.delay,
          snapshot.status,
          snapshot.timestamp,
        ],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Get snapshots for a train over time range
   */
  async getTrainHistory(
    trainNumber: string,
    hours: number = 24
  ): Promise<TrainSnapshot[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      this.db!.all(
        `
        SELECT * FROM train_snapshots
        WHERE trainNumber = ? AND timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT 1000
      `,
        [trainNumber, cutoffTime],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve((rows as any[]) || []);
        }
      );
    });
  }

  /**
   * Get delay statistics for a station
   */
  async getStationDelayStats(
    stationCode: string,
    days: number = 7
  ): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.all(
        `
        SELECT
          hour,
          ROUND(AVG(avgDelay), 2) as avgDelay,
          MAX(maxDelay) as maxDelay,
          SUM(trainCount) as trainCount
        FROM delay_statistics
        WHERE stationCode = ? AND date >= date('now', '-${days} days')
        GROUP BY hour
        ORDER BY hour
      `,
        [stationCode],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve((rows as any[]) || []);
        }
      );
    });
  }

  /**
   * Calculate aggregated delay statistics
   */
  async calculateHourlyStats(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];

      // Aggregate snapshots into hourly statistics
      this.db!.run(
        `
        INSERT OR REPLACE INTO delay_statistics
        (stationCode, hour, avgDelay, maxDelay, minDelay, trainCount, date)
        SELECT
          stationCode,
          CAST(strftime('%H', timestamp) AS INTEGER) as hour,
          ROUND(AVG(delay), 2),
          MAX(delay),
          MIN(delay),
          COUNT(DISTINCT trainNumber),
          ?
        FROM train_snapshots
        WHERE DATE(timestamp) = ?
        GROUP BY stationCode, hour
      `,
        [today, today],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  /**
   * Get network-wide delay heatmap
   */
  async getNetworkHeatmap(hours: number = 1): Promise<Record<string, number>> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      this.db!.all(
        `
        SELECT stationCode, ROUND(AVG(delay), 1) as avgDelay
        FROM train_snapshots
        WHERE timestamp >= ?
        GROUP BY stationCode
      `,
        [cutoffTime],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          const heatmap: Record<string, number> = {};
          (rows || []).forEach(row => {
            heatmap[row.stationCode] = row.avgDelay || 0;
          });

          resolve(heatmap);
        }
      );
    });
  }

  /**
   * Cleanup old snapshots (retention policy: 30 days)
   */
  async cleanupOldSnapshots(retentionDays: number = 30): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

      this.db!.run(
        `
        DELETE FROM train_snapshots
        WHERE timestamp < ?
      `,
        [cutoffDate],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes);
        }
      );
    });
  }

  /**
   * Log data quality event for provider monitoring
   */
  async logDataQuality(log: {
    trainNumber?: string;
    provider: string;
    isSuccessful: boolean;
    dataQualityScore: number;
    isSynthetic: boolean;
    responseTime?: number;
    errorMessage?: string;
    cacheHit?: boolean;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run(
        `
        INSERT INTO data_quality_log
        (trainNumber, provider, isSuccessful, dataQualityScore, isSynthetic, responseTime, errorMessage, cacheHit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          log.trainNumber || null,
          log.provider,
          log.isSuccessful ? 1 : 0,
          log.dataQualityScore,
          log.isSynthetic ? 1 : 0,
          log.responseTime || null,
          log.errorMessage || null,
          log.cacheHit ? 1 : 0,
        ],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  /**
   * Record a halt event
   */
  async recordHaltEvent(event: {
    trainNumber: string;
    sectionCode: string;
    sectionName: string;
    haltStartTime: Date;
    haltEndTime?: Date;
    haltDurationSeconds?: number;
    haltReason?: string;
    estimatedCause?: string;
    haltConfidence: number;
    isScheduledStop: boolean;
  }): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run(
        `
        INSERT INTO halt_statistics
        (trainNumber, sectionCode, sectionName, haltStartTime, haltEndTime, haltDurationSeconds, haltReason, estimatedCause, haltConfidence, isScheduledStop)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          event.trainNumber,
          event.sectionCode,
          event.sectionName,
          event.haltStartTime.toISOString(),
          event.haltEndTime?.toISOString() || null,
          event.haltDurationSeconds || null,
          event.haltReason || null,
          event.estimatedCause || null,
          event.haltConfidence,
          event.isScheduledStop ? 1 : 0,
        ],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Record congestion metric for a section
   */
  async recordCongestionMetric(metric: {
    sectionCode: string;
    sectionName: string;
    hour: number;
    date: string;
    nearbyTrainsCount: number;
    avgNearbyTrainsPerTrain: number;
    trafficDensity: number;
    congestionLevel: 'low' | 'medium' | 'high' | 'critical';
    avgDelayInSection?: number;
    throughput?: number;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.run(
        `
        INSERT OR REPLACE INTO congestion_metrics
        (sectionCode, sectionName, hour, date, nearbyTrainsCount, avgNearbyTrainsPerTrain, trafficDensity, congestionLevel, avgDelayInSection, throughput)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          metric.sectionCode,
          metric.sectionName,
          metric.hour,
          metric.date,
          metric.nearbyTrainsCount,
          metric.avgNearbyTrainsPerTrain,
          metric.trafficDensity,
          metric.congestionLevel,
          metric.avgDelayInSection || null,
          metric.throughput || null,
        ],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  /**
   * Get provider health statistics
   */
  async getProviderStats(hours: number = 24): Promise<Record<string, any>> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      this.db!.all(
        `
        SELECT
          provider,
          COUNT(*) as totalCalls,
          SUM(CASE WHEN isSuccessful = 1 THEN 1 ELSE 0 END) as successCount,
          ROUND(100.0 * SUM(CASE WHEN isSuccessful = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) as successRate,
          ROUND(AVG(dataQualityScore), 1) as avgQuality,
          ROUND(AVG(responseTime), 0) as avgResponseTime,
          SUM(CASE WHEN isSynthetic = 1 THEN 1 ELSE 0 END) as syntheticCount,
          SUM(CASE WHEN cacheHit = 1 THEN 1 ELSE 0 END) as cacheHits
        FROM data_quality_log
        WHERE timestamp >= ?
        GROUP BY provider
      `,
        [cutoffTime],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          const stats: Record<string, any> = {};
          (rows || []).forEach(row => {
            stats[row.provider] = {
              totalCalls: row.totalCalls,
              successCount: row.successCount,
              successRate: row.successRate,
              avgQuality: row.avgQuality,
              avgResponseTime: row.avgResponseTime,
              syntheticCount: row.syntheticCount,
              cacheHits: row.cacheHits,
            };
          });

          resolve(stats);
        }
      );
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('[SnapshotDB] Connection closed');
        resolve();
      });
    });
  }
}

const snapshotDatabase = new SnapshotDatabase();
export default snapshotDatabase;

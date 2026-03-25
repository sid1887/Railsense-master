/**
 * Analytics Aggregation Service
 * Processes raw snapshots into analytical metrics
 * - Halt statistics: Daily/hourly patterns
 * - Congestion metrics: Section-based traffic analysis
 */

import snapshotDatabase from './snapshotDatabase';

interface HaltPattern {
  sectionCode: string;
  sectionName: string;
  hour: number;
  date: string;
  haltCount: number;
  avgDurationSeconds: number;
  avgConfidence: number;
  topReasons: Array<{ reason: string; count: number }>;
}

interface CongestionPattern {
  sectionCode: string;
  sectionName: string;
  date: string;
  hour: number;
  trainsInSection: number;
  avgTrainsNearby: number;
  trafficDensity: number; // 0-1 scale
  congestionLevel: 'low' | 'medium' | 'high' | 'critical';
  avgDelayMinutes: number;
}

class AnalyticsAggregation {
  private db: any = null;

  constructor() {
    if (typeof window === 'undefined') {
      try {
        this.db = require('./snapshotDatabase').default;
      } catch (e) {
        console.error('[Analytics] Failed to load database:', e);
      }
    }
  }

  /**
   * Aggregate halt statistics for the last N hours
   * Groups by section and time to identify halt patterns
   */
  async aggregateHaltPatterns(hoursBack: number = 24): Promise<HaltPattern[]> {
    try {
      const cutoffTime = Date.now() - hoursBack * 3600 * 1000;
      const patterns: HaltPattern[] = [];

      // Group halt_statistics by sectionCode + hour
      return new Promise((resolve) => {
        const query = `
          SELECT
            sectionCode,
            sectionName,
            strftime('%Y-%m-%d', datetime(recordedAt / 1000, 'unixepoch')) as date,
            strftime('%H', datetime(recordedAt / 1000, 'unixepoch')) as hour,
            COUNT(*) as haltCount,
            AVG(haltDurationSeconds) as avgDurationSeconds,
            AVG(haltConfidence) as avgConfidence,
            GROUP_CONCAT(haltReason, ',') as reasons
          FROM halt_statistics
          WHERE recordedAt > ?
          GROUP BY sectionCode, date, hour
          ORDER BY recordedAt DESC
        `;

        if (!this.db) {
          console.warn('[Analytics] Database not initialized');
          resolve([]);
          return;
        }

        this.db.all(query, [cutoffTime], (err: any, rows: any[]) => {
          if (err) {
            console.error('[Analytics] Error aggregating halts:', err);
            resolve([]);
            return;
          }

          patterns.push(
            ...rows.map((row: any) => ({
              sectionCode: row.sectionCode,
              sectionName: row.sectionName,
              hour: parseInt(row.hour),
              date: row.date,
              haltCount: row.haltCount,
              avgDurationSeconds: Math.round(row.avgDurationSeconds),
              avgConfidence: parseFloat(row.avgConfidence) || 0.5,
              topReasons: this._parseReasons(row.reasons),
            }))
          );

          resolve(patterns);
        });
      });
    } catch (error) {
      console.error('[Analytics] Error in aggregateHaltPatterns:', error);
      return [];
    }
  }

  /**
   * Aggregate congestion metrics for the last N hours
   * Analyzes train density per section to identify bottlenecks
   */
  async aggregateCongestionPatterns(hoursBack: number = 24): Promise<CongestionPattern[]> {
    try {
      const cutoffTime = Date.now() - hoursBack * 3600 * 1000;
      const patterns: CongestionPattern[] = [];

      return new Promise((resolve) => {
        const query = `
          SELECT
            sectionCode,
            sectionName,
            date,
            hour,
            COUNT(*) as recordCount,
            AVG(nearbyTrainsCount) as avgNearbyTrains,
            AVG(trafficDensity) as avgTrafficDensity,
            MAX(congestionLevel) as maxCongestionLevel,
            AVG(avgDelayInSection) as avgDelayMinutes
          FROM congestion_metrics
          WHERE recordedAt > ?
          GROUP BY sectionCode, date, hour
          ORDER BY recordedAt DESC
        `;

        if (!this.db) {
          console.warn('[Analytics] Database not initialized');
          resolve([]);
          return;
        }

        this.db.all(query, [cutoffTime], (err: any, rows: any[]) => {
          if (err) {
            console.error('[Analytics] Error aggregating congestion:', err);
            resolve([]);
            return;
          }

          patterns.push(
            ...rows.map((row: any) => ({
              sectionCode: row.sectionCode,
              sectionName: row.sectionName,
              date: row.date,
              hour: parseInt(row.hour),
              trainsInSection: row.recordCount,
              avgTrainsNearby: parseFloat(row.avgNearbyTrains || 0),
              trafficDensity: parseFloat(row.avgTrafficDensity || 0),
              congestionLevel:
                row.maxCongestionLevel || this._classifyCongestion(parseFloat(row.avgNearbyTrains || 0)),
              avgDelayMinutes: Math.round(row.avgDelayMinutes || 0),
            }))
          );

          resolve(patterns);
        });
      });
    } catch (error) {
      console.error('[Analytics] Error in aggregateCongestionPatterns:', error);
      return [];
    }
  }

  /**
   * Get provider performance dashboard
   * Shows success rates, quality scores, response times per provider
   */
  async getProviderHealthDashboard(hoursBack: number = 24): Promise<any> {
    try {
      const cutoffTime = Date.now() - hoursBack * 3600 * 1000;

      return new Promise((resolve) => {
        const query = `
          SELECT
            provider,
            COUNT(*) as totalCalls,
            SUM(CASE WHEN isSuccessful = 1 THEN 1 ELSE 0 END) as successCalls,
            SUM(CASE WHEN cacheHit = 1 THEN 1 ELSE 0 END) as cacheCalls,
            AVG(dataQualityScore) as avgQuality,
            AVG(responseTime) as avgResponseTime,
            MAX(responseTime) as maxResponseTime,
            COUNT(DISTINCT trainNumber) as uniqueTrains
          FROM data_quality_log
          WHERE timestamp > ?
          GROUP BY provider
          ORDER BY provider
        `;

        if (!this.db) {
          console.warn('[Analytics] Database not initialized');
          resolve({});
          return;
        }

        this.db.all(query, [cutoffTime], (err: any, rows: any[]) => {
          if (err) {
            console.error('[Analytics] Error getting provider dashboard:', err);
            resolve({});
            return;
          }

          const dashboard: any = {};
          rows.forEach((row: any) => {
            const successRate = row.totalCalls > 0 ? ((row.successCalls / row.totalCalls) * 100).toFixed(1) : 0;
            const cacheHitRate = row.totalCalls > 0 ? ((row.cacheCalls / row.totalCalls) * 100).toFixed(1) : 0;

            dashboard[row.provider] = {
              totalCalls: row.totalCalls,
              successRate: `${successRate}%`,
              cacheHitRate: `${cacheHitRate}%`,
              avgQualityScore: parseFloat(row.avgQuality || 0).toFixed(1),
              avgResponseTime: `${Math.round(row.avgResponseTime || 0)}ms`,
              maxResponseTime: `${Math.round(row.maxResponseTime || 0)}ms`,
              uniqueTrains: row.uniqueTrains,
            };
          });

          resolve(dashboard);
        });
      });
    } catch (error) {
      console.error('[Analytics] Error getting provider dashboard:', error);
      return {};
    }
  }

  /**
   * Get top problematic sections (most halts, most congestion)
   */
  async getProblematicSections(hoursBack: number = 24): Promise<any> {
    try {
      const cutoffTime = Date.now() - hoursBack * 3600 * 1000;

      return new Promise((resolve) => {
        const haltQuery = `
          SELECT
            sectionCode,
            sectionName,
            COUNT(*) as haltCount,
            AVG(haltDurationSeconds) as avgDuration
          FROM halt_statistics
          WHERE recordedAt > ?
          GROUP BY sectionCode
          ORDER BY haltCount DESC
          LIMIT 10
        `;

        const congestionQuery = `
          SELECT
            sectionCode,
            sectionName,
            AVG(trafficDensity) as avgDensity,
            AVG(avgDelayInSection) as avgDelay
          FROM congestion_metrics
          WHERE recordedAt > ?
          GROUP BY sectionCode
          ORDER BY avgDensity DESC, avgDelay DESC
          LIMIT 10
        `;

        if (!this.db) {
          console.warn('[Analytics] Database not initialized');
          resolve({ problematicHaults: [], problematicCongestion: [] });
          return;
        }

        const result: any = { problematicHalts: [], problematicCongestion: [] };

        // Get halt problems
        this.db.all(haltQuery, [cutoffTime], (err1: any, haltRows: any[]) => {
          if (!err1) {
            result.problematicHalts = haltRows || [];
          }

          // Get congestion problems
          this.db.all(congestionQuery, [cutoffTime], (err2: any, congestionRows: any[]) => {
            if (!err2) {
              result.problematicCongestion = congestionRows || [];
            }

            resolve(result);
          });
        });
      });
    } catch (error) {
      console.error('[Analytics] Error getting problematic sections:', error);
      return { problematicHalts: [], problematicCongestion: [] };
    }
  }

  /**
   * Get real-time train density for a section
   */
  async getSectionDensity(sectionCode: string): Promise<any> {
    try {
      return new Promise((resolve) => {
        const query = `
          SELECT
            sectionCode,
            sectionName,
            nearbyTrainsCount,
            trafficDensity,
            congestionLevel,
            avgDelayInSection,
            recordedAt
          FROM congestion_metrics
          WHERE sectionCode = ?
          ORDER BY recordedAt DESC
          LIMIT 1
        `;

        if (!this.db) {
          console.warn('[Analytics] Database not initialized');
          resolve(null);
          return;
        }

        this.db.get(query, [sectionCode], (err: any, row: any) => {
          if (err || !row) {
            resolve(null);
            return;
          }

          resolve({
            sectionCode: row.sectionCode,
            sectionName: row.sectionName,
            trainsCount: row.nearbyTrainsCount,
            trafficDensity: parseFloat(row.trafficDensity || 0).toFixed(3),
            congestionLevel: row.congestionLevel,
            avgDelayMinutes: Math.round(row.avgDelayInSection || 0),
            lastUpdate: new Date(row.recordedAt).toISOString(),
          });
        });
      });
    } catch (error) {
      console.error('[Analytics] Error getting section density:', error);
      return null;
    }
  }

  /**
   * Helper: Parse comma-separated reasons into top reasons
   */
  private _parseReasons(reasonsStr: string): Array<{ reason: string; count: number }> {
    if (!reasonsStr) return [];
    const reasons = reasonsStr.split(',').filter(r => r.trim());
    const counts: any = {};
    reasons.forEach(r => {
      counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Helper: Classify congestion level based on train density
   */
  private _classifyCongestion(
    trainsNearby: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (trainsNearby < 2) return 'low';
    if (trainsNearby < 4) return 'medium';
    if (trainsNearby < 7) return 'high';
    return 'critical';
  }
}

export default new AnalyticsAggregation();

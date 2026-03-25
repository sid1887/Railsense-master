/**
 * Database Persistence Layer
 * Stores network state, historical patterns, and analytics data
 */

export interface NetworkSnapshot {
  id: string;
  timestamp: number;
  totalTrains: number;
  averageDensity: number;
  congestionScore: number;
  flowEfficiency: number;
  metadata: Record<string, unknown>;
}

export interface HistoricalPattern {
  id: string;
  sectionId: string;
  pattern_type: 'delay' | 'congestion' | 'anomaly';
  value: number;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface TrainSnapshot {
  id: string;
  trainNumber: string;
  location: string;
  delay: number;
  status: 'on_time' | 'delayed' | 'halted';
  timestamp: number;
}

export interface AnalyticsRecord {
  id: string;
  metric_type: string;
  section_id: string;
  value: number;
  timestamp: number;
}

/**
 * Database Persistence Service
 */
class DatabasePersistenceService {
  private static readonly DB_NAME = 'railsense_data';
  private db: IDBDatabase | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize IndexedDB database
   */
  private async initialize() {
    try {
      // This targets browser-based IndexedDB
      // For Node.js/server-side, would use SQLite
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  /**
   * Store network snapshot
   */
  async storeNetworkSnapshot(snapshot: NetworkSnapshot): Promise<void> {
    try {
      const snapshots = JSON.parse(localStorage.getItem('network_snapshots') || '[]');
      snapshots.push(snapshot);
      // Keep only last 1000 snapshots
      if (snapshots.length > 1000) {
        snapshots.shift();
      }
      localStorage.setItem('network_snapshots', JSON.stringify(snapshots));
    } catch (error) {
      console.error('Failed to store network snapshot:', error);
    }
  }

  /**
   * Get network snapshots for time range
   */
  async getNetworkSnapshots(
    startTime: number,
    endTime: number
  ): Promise<NetworkSnapshot[]> {
    try {
      const snapshots = JSON.parse(localStorage.getItem('network_snapshots') || '[]');
      return snapshots.filter((s: NetworkSnapshot) => s.timestamp >= startTime && s.timestamp <= endTime);
    } catch {
      return [];
    }
  }

  /**
   * Store historical pattern
   */
  async storeHistoricalPattern(pattern: HistoricalPattern): Promise<void> {
    try {
      const patterns = JSON.parse(localStorage.getItem('historical_patterns') || '[]');
      patterns.push(pattern);
      if (patterns.length > 5000) {
        patterns.shift();
      }
      localStorage.setItem('historical_patterns', JSON.stringify(patterns));
    } catch (error) {
      console.error('Failed to store historical pattern:', error);
    }
  }

  /**
   * Get historical patterns for section
   */
  async getHistoricalPatterns(
    sectionId: string,
    patternType?: 'delay' | 'congestion' | 'anomaly'
  ): Promise<HistoricalPattern[]> {
    try {
      const patterns = JSON.parse(localStorage.getItem('historical_patterns') || '[]');
      return patterns.filter(
        (p: HistoricalPattern) =>
          p.sectionId === sectionId && (!patternType || p.pattern_type === patternType)
      );
    } catch {
      return [];
    }
  }

  /**
   * Store train snapshot
   */
  async storeTrainSnapshot(snapshot: TrainSnapshot): Promise<void> {
    try {
      const snapshots = JSON.parse(localStorage.getItem('train_snapshots') || '[]');
      snapshots.push(snapshot);
      if (snapshots.length > 2000) {
        snapshots.shift();
      }
      localStorage.setItem('train_snapshots', JSON.stringify(snapshots));
    } catch (error) {
      console.error('Failed to store train snapshot:', error);
    }
  }

  /**
   * Get train history
   */
  async getTrainHistory(trainNumber: string, hours: number = 24): Promise<TrainSnapshot[]> {
    try {
      const snapshots = JSON.parse(localStorage.getItem('train_snapshots') || '[]');
      const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
      return snapshots.filter(
        (s: TrainSnapshot) => s.trainNumber === trainNumber && s.timestamp >= cutoffTime
      );
    } catch {
      return [];
    }
  }

  /**
   * Store analytics record
   */
  async storeAnalyticsRecord(record: AnalyticsRecord): Promise<void> {
    try {
      const records = JSON.parse(localStorage.getItem('analytics_records') || '[]');
      records.push(record);
      if (records.length > 3000) {
        records.shift();
      }
      localStorage.setItem('analytics_records', JSON.stringify(records));
    } catch (error) {
      console.error('Failed to store analytics record:', error);
    }
  }

  /**
   * Get analytics for section
   */
  async getAnalyticsForSection(sectionId: string, metricType?: string): Promise<AnalyticsRecord[]> {
    try {
      const records = JSON.parse(localStorage.getItem('analytics_records') || '[]');
      return records.filter(
        (r: AnalyticsRecord) =>
          r.section_id === sectionId && (!metricType || r.metric_type === metricType)
      );
    } catch {
      return [];
    }
  }

  /**
   * Calculate historical averages for section
   */
  async calculateSectionAverages(sectionId: string): Promise<{
    avgDelay: number;
    avgCongestion: number;
    anomalyRate: number;
  }> {
    try {
      const patterns = await this.getHistoricalPatterns(sectionId);

      const delayPatterns = patterns.filter((p) => p.pattern_type === 'delay');
      const congestionPatterns = patterns.filter((p) => p.pattern_type === 'congestion');
      const anomalyPatterns = patterns.filter((p) => p.pattern_type === 'anomaly');

      const avgDelay =
        delayPatterns.length > 0
          ? delayPatterns.reduce((sum, p) => sum + p.value, 0) / delayPatterns.length
          : 0;

      const avgCongestion =
        congestionPatterns.length > 0
          ? congestionPatterns.reduce((sum, p) => sum + p.value, 0) / congestionPatterns.length
          : 0;

      const anomalyRate = anomalyPatterns.length / (patterns.length || 1);

      return {
        avgDelay: Math.round(avgDelay * 10) / 10,
        avgCongestion: Math.round(avgCongestion * 10) / 10,
        anomalyRate: Math.round(anomalyRate * 1000) / 1000,
      };
    } catch {
      return { avgDelay: 0, avgCongestion: 0, anomalyRate: 0 };
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics(): Promise<{
    totalSnapshots: number;
    totalPatterns: number;
    totalTrainSnapshots: number;
    dataStorageSize: string;
  }> {
    try {
      const snapshots = JSON.parse(localStorage.getItem('network_snapshots') || '[]');
      const patterns = JSON.parse(localStorage.getItem('historical_patterns') || '[]');
      const trainSnapshots = JSON.parse(localStorage.getItem('train_snapshots') || '[]');

      // Estimate storage size
      const totalSize =
        (snapshots.length + patterns.length + trainSnapshots.length) * 500; // ~500 bytes per record
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

      return {
        totalSnapshots: snapshots.length,
        totalPatterns: patterns.length,
        totalTrainSnapshots: trainSnapshots.length,
        dataStorageSize: `${sizeInMB} MB`,
      };
    } catch {
      return {
        totalSnapshots: 0,
        totalPatterns: 0,
        totalTrainSnapshots: 0,
        dataStorageSize: '0 MB',
      };
    }
  }

  /**
   * Clear old data (retention policy)
   */
  async cleanupOldData(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      // Clean snapshots
      let snapshots = JSON.parse(localStorage.getItem('network_snapshots') || '[]');
      const initialSnapshotCount = snapshots.length;
      snapshots = snapshots.filter((s: NetworkSnapshot) => s.timestamp >= cutoffTime);
      deletedCount += initialSnapshotCount - snapshots.length;
      localStorage.setItem('network_snapshots', JSON.stringify(snapshots));

      // Clean patterns
      let patterns = JSON.parse(localStorage.getItem('historical_patterns') || '[]');
      const initialPatternCount = patterns.length;
      patterns = patterns.filter((p: HistoricalPattern) => p.timestamp >= cutoffTime);
      deletedCount += initialPatternCount - patterns.length;
      localStorage.setItem('historical_patterns', JSON.stringify(patterns));

      // Clean train snapshots
      let trainSnapshots = JSON.parse(localStorage.getItem('train_snapshots') || '[]');
      const initialTrainCount = trainSnapshots.length;
      trainSnapshots = trainSnapshots.filter((t: TrainSnapshot) => t.timestamp >= cutoffTime);
      deletedCount += initialTrainCount - trainSnapshots.length;
      localStorage.setItem('train_snapshots', JSON.stringify(trainSnapshots));

      return deletedCount;
    } catch {
      return 0;
    }
  }

  /**
   * Export data for analytics
   */
  async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const snapshots = JSON.parse(localStorage.getItem('network_snapshots') || '[]');
      const patterns = JSON.parse(localStorage.getItem('historical_patterns') || '[]');
      const trainSnapshots = JSON.parse(localStorage.getItem('train_snapshots') || '[]');

      if (format === 'json') {
        return JSON.stringify({
          exportDate: new Date().toISOString(),
          networkSnapshots: snapshots,
          historicalPatterns: patterns,
          trainSnapshots,
        });
      }

      // CSV format - simplified
      let csv = 'Type,Section,Metric,Value,Timestamp\n';

      patterns.forEach((p: HistoricalPattern) => {
        csv += `Pattern,${p.sectionId},${p.pattern_type},${p.value},${new Date(p.timestamp).toISOString()}\n`;
      });

      return csv;
    } catch {
      return '';
    }
  }

  /**
   * Get database initialization status
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const databaseService = new DatabasePersistenceService();

/**
 * Database Service
 * PHASE 10: Persistence layer for train data, analytics, user preferences
 *
 * Currently uses in-memory storage with file-based backup.
 * In production: Replace with PostgreSQL, MongoDB, or similar.
 *
 * Schema:
 * - trains: All tracked trains with metadata
 * - analytics: Historical analytics per train
 * - incidents: Recorded incidents/delays
 * - user_preferences: User notification preferences
 * - cache: Temporary cached data
 */

import * as fs from 'fs';
import * as path from 'path';

interface TrainRecord {
  trainNumber: string;
  trainName: string;
  lastPosition: { lat: number; lng: number };
  lastUpdated: number;
  metadata: Record<string, any>;
}

interface AnalyticsRecord {
  trainNumber: string;
  timestamp: number;
  delay: number;
  confidence: number;
  haltDuration?: number;
  source: string;
}

interface IncidentRecord {
  id: string;
  trainNumber: string;
  type: 'delay' | 'halt' | 'accident' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: number;
  resolved: boolean;
}

class DatabaseService {
  private dataDir = path.join(process.cwd(), '.data');
  private trains = new Map<string, TrainRecord>();
  private analytics = new Map<string, AnalyticsRecord[]>();
  private incidents = new Map<string, IncidentRecord[]>();
  private userPreferences = new Map<string, Record<string, any>>();

  constructor() {
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Load persisted data on startup
    this._loadFromDisk();
  }

  /**
   * Train Records
   */

  async saveTrain(train: TrainRecord): Promise<void> {
    this.trains.set(train.trainNumber, train);
    this._persistToDisk();
  }

  async getTrain(trainNumber: string): Promise<TrainRecord | null> {
    return this.trains.get(trainNumber) || null;
  }

  async getAllTrains(): Promise<TrainRecord[]> {
    return Array.from(this.trains.values());
  }

  async deleteTrain(trainNumber: string): Promise<void> {
    this.trains.delete(trainNumber);
    this._persistToDisk();
  }

  /**
   * Analytics Records
   */

  async saveAnalytics(record: AnalyticsRecord): Promise<void> {
    const key = record.trainNumber;
    if (!this.analytics.has(key)) {
      this.analytics.set(key, []);
    }
    const records = this.analytics.get(key)!;
    records.push(record);

    // Keep only last 1000 records per train
    if (records.length > 1000) {
      records.shift();
    }

    this._persistToDisk();
  }

  async getAnalytics(trainNumber: string, limit: number = 100): Promise<AnalyticsRecord[]> {
    const records = this.analytics.get(trainNumber) || [];
    return records.slice(-limit);
  }

  async getAnalyticsByDateRange(
    trainNumber: string,
    startTime: number,
    endTime: number
  ): Promise<AnalyticsRecord[]> {
    const records = this.analytics.get(trainNumber) || [];
    return records.filter((r) => r.timestamp >= startTime && r.timestamp <= endTime);
  }

  /**
   * Incident Records
   */

  async recordIncident(incident: IncidentRecord): Promise<void> {
    const key = incident.trainNumber;
    if (!this.incidents.has(key)) {
      this.incidents.set(key, []);
    }
    this.incidents.get(key)!.push(incident);
    this._persistToDisk();
  }

  async getIncidents(trainNumber: string, unresolved: boolean = false): Promise<IncidentRecord[]> {
    const records = this.incidents.get(trainNumber) || [];
    if (unresolved) {
      return records.filter((i) => !i.resolved);
    }
    return records;
  }

  async resolveIncident(incidentId: string): Promise<boolean> {
    for (const records of this.incidents.values()) {
      const incident = records.find((i) => i.id === incidentId);
      if (incident) {
        incident.resolved = true;
        this._persistToDisk();
        return true;
      }
    }
    return false;
  }

  async getUnresolvedIncidents(): Promise<IncidentRecord[]> {
    const all: IncidentRecord[] = [];
    for (const records of this.incidents.values()) {
      all.push(...records.filter((i) => !i.resolved));
    }
    return all;
  }

  /**
   * User Preferences
   */

  async saveUserPreferences(userId: string, preferences: Record<string, any>): Promise<void> {
    this.userPreferences.set(userId, preferences);
    this._persistToDisk();
  }

  async getUserPreferences(userId: string): Promise<Record<string, any> | null> {
    return this.userPreferences.get(userId) || null;
  }

  /**
   * Persistence to Disk
   */

  private _persistToDisk(): void {
    try {
      const data = {
        trains: Array.from(this.trains.entries()),
        analytics: Array.from(this.analytics.entries()),
        incidents: Array.from(this.incidents.entries()),
        userPreferences: Array.from(this.userPreferences.entries()),
      };

      const filePath = path.join(this.dataDir, 'database.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[Database] Error persisting to disk:', error);
    }
  }

  private _loadFromDisk(): void {
    try {
      const filePath = path.join(this.dataDir, 'database.json');

      if (!fs.existsSync(filePath)) {
        console.log('[Database] No persisted data found, starting fresh');
        return;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      this.trains = new Map(data.trains || []);
      this.analytics = new Map(
        (data.analytics || []).map(([key, value]: any) => [key, value])
      );
      this.incidents = new Map(
        (data.incidents || []).map(([key, value]: any) => [key, value])
      );
      this.userPreferences = new Map(data.userPreferences || []);

      console.log(
        `[Database] Loaded: ${this.trains.size} trains, ${this.analytics.size} analytics groups, ${this.incidents.size} incident groups`
      );
    } catch (error) {
      console.error('[Database] Error loading from disk:', error);
    }
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.trains.clear();
    this.analytics.clear();
    this.incidents.clear();
    this.userPreferences.clear();
    this._persistToDisk();
    console.log('[Database] All data cleared');
  }

  /**
   * Get database statistics
   */
  getStats(): Record<string, number> {
    return {
      totalTrains: this.trains.size,
      totalAnalyticsGroups: this.analytics.size,
      totalAnalyticsRecords: Array.from(this.analytics.values()).reduce(
        (sum, records) => sum + records.length,
        0
      ),
      totalIncidents: Array.from(this.incidents.values()).reduce(
        (sum, records) => sum + records.length,
        0
      ),
      unresolvedIncidents: Array.from(this.incidents.values())
        .flat()
        .filter((i) => !i.resolved).length,
      userPreferencesCount: this.userPreferences.size,
    };
  }
}

export const databaseService = new DatabaseService();

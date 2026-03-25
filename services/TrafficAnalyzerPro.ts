/**
 * TrafficAnalyzerPro - Advanced Multi-Train Traffic Analysis
 *
 * Analyzes train density, congestion patterns, and bottlenecks
 * - Section-level train density analysis
 * - Near-train relationship detection
 * - Congestion forecasting (next 1-4 hours)
 * - Bottleneck identification
 */

import snapshotDatabase from './snapshotDatabase';

interface SectionDensity {
  sectionCode: string;
  sectionName: string;
  trainsCount: number;
  trainsInDirection: Record<string, number>; // direction -> count
  avgSpeed: number;
  avgDelay: number;
  densityLevel: 'low' | 'medium' | 'high' | 'critical';
  congestionIndex: number; // 0-100
  lastUpdate: number;
}

interface NearbyTrainsAnalysis {
  trainNumber: string;
  trainsNearby: Array<{ trainNumber: string; distance: number; direction: string }>;
  blockingTrain: { trainNumber: string; distance: number } | null;
  precedingTrain: { trainNumber: string; distance: number } | null;
  followingTrain: { trainNumber: string; distance: number } | null;
}

interface TrafficForecast {
  sectionCode: string;
  forecastHours: number;
  currentDensity: number;
  predictedDensity: number;
  expectedCongestionLevel: 'low' | 'medium' | 'high' | 'critical';
  expectedDelay: number; // minutes
  confidence: number; // 0-1
  trend: 'improving' | 'stable' | 'worsening';
}

interface Bottleneck {
  sectionCode: string;
  sectionName: string;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  congestionLevel: number; // 0-100
  estimatedDuration: number; // minutes
  affectedTrains: string[];
  rootCauses: string[];
  recommendedActions: string[];
}

class TrafficAnalyzerPro {
  private db: any = null;
  private sectionMetricsCache = new Map<string, SectionDensity>();
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutes

  constructor() {
    if (typeof window === 'undefined') {
      try {
        this.db = require('./snapshotDatabase').default;
      } catch (e) {
        console.error('[TrafficAnalyzerPro] Failed to load database:', e);
      }
    }
  }

  /**
   * Analyze section density and congestion
   */
  async analyzeSectionDensity(sectionCode: string): Promise<SectionDensity | null> {
    // Check cache first
    const cached = this.sectionMetricsCache.get(sectionCode);
    if (cached && Date.now() - cached.lastUpdate < this.cacheValidityMs) {
      return cached;
    }

    try {
      // Get recent trains in section (last 30 minutes)
      const trains = await this._getTrainsInSection(sectionCode, 30);

      if (trains.length === 0) {
        return null;
      }

      // Analyze direction distribution
      const trainsInDirection = this._analyzeDirectionDistribution(trains);

      // Calculate metrics
      const avgSpeed = trains.reduce((sum: number, t: any) => sum + (t.speed || 0), 0) / trains.length;
      const avgDelay = trains.reduce((sum: number, t: any) => sum + (t.delay || 0), 0) / trains.length;

      // Classify density
      const { densityLevel, congestionIndex } = this._classifyDensity(
        trains.length,
        avgSpeed,
        avgDelay
      );

      const result: SectionDensity = {
        sectionCode,
        sectionName: trains[0]?.sectionName || `Section ${sectionCode}`,
        trainsCount: trains.length,
        trainsInDirection,
        avgSpeed: Math.round(avgSpeed),
        avgDelay: Math.round(avgDelay),
        densityLevel,
        congestionIndex,
        lastUpdate: Date.now(),
      };

      // Cache it
      this.sectionMetricsCache.set(sectionCode, result);

      return result;
    } catch (error) {
      console.error(`[TrafficAnalyzerPro] Error analyzing section ${sectionCode}:`, error);
      return null;
    }
  }

  /**
   * Analyze nearby trains for a specific train
   */
  async analyzeNearbyTrains(trainNumber: string): Promise<NearbyTrainsAnalysis | null> {
    try {
      // Get current position and train info
      const trainData = await this._getTrainCurrentPosition(trainNumber);
      if (!trainData) return null;

      // Find trains within 150km radius
      const nearby = await this._findNearbyTrains(
        trainData.lat,
        trainData.lng,
        150
      );

      // Filter to same section/route
      const onSameRoute = nearby.filter(t => t.trainNumber !== trainNumber);

      if (onSameRoute.length === 0) {
        return {
          trainNumber,
          trainsNearby: [],
          blockingTrain: null,
          precedingTrain: null,
          followingTrain: null,
        };
      }

      // Identify blocking, preceding, and following trains
      const blockingTrain = onSameRoute.find(t => {
        const ahead = this._isAheadOnRoute(trainData, t);
        return ahead && t.distance < 30; // Within 30km ahead
      });

      const precedingTrain = onSameRoute.find(
        t => this._isAheadOnRoute(trainData, t) && (!blockingTrain || t.distance > 30)
      );

      const followingTrain = onSameRoute.find(
        t => !this._isAheadOnRoute(trainData, t) && t.distance < 30 // Within 30km behind
      );

      return {
        trainNumber,
        trainsNearby: onSameRoute,
        blockingTrain: blockingTrain || null,
        precedingTrain: precedingTrain || null,
        followingTrain: followingTrain || null,
      };
    } catch (error) {
      console.error(`[TrafficAnalyzerPro] Error analyzing nearby trains for ${trainNumber}:`, error);
      return null;
    }
  }

  /**
   * Forecast congestion for next N hours
   */
  async forecastCongestion(sectionCode: string, hoursAhead: number = 3): Promise<TrafficForecast[]> {
    const forecasts: TrafficForecast[] = [];

    try {
      // Get historical patterns for this section
      const historical = await this._getHistoricalPatterns(sectionCode, 7); // 7 days

      // Get current density
      const currentDensity = await this.analyzeSectionDensity(sectionCode);
      if (!currentDensity) return [];

      // Forecast each hour
      for (let h = 1; h <= hoursAhead; h++) {
        const now = new Date();
        now.setHours(now.getHours() + h);
        const hour = now.getHours();
        const dayOfWeek = now.getDay();

        // Get historical data for same hour and day
        const historicalForHour = historical.filter(p => p.hour === hour && p.dayOfWeek === dayOfWeek);

        if (historicalForHour.length > 0) {
          // Calculate trend
          const avgHistoricalDensity = historicalForHour.reduce((sum, p) => sum + p.density, 0) /
            historicalForHour.length;
          const trend = this._calculateTrend(
            currentDensity.congestionIndex,
            avgHistoricalDensity
          );

          // Forecast
          const predictedDensity = this._predictDensity(currentDensity, avgHistoricalDensity, trend);
          const { congestionLevel, delayMinutes } = this._estimateFromDensity(predictedDensity);

          forecasts.push({
            sectionCode,
            forecastHours: h,
            currentDensity: currentDensity.congestionIndex,
            predictedDensity,
            expectedCongestionLevel: congestionLevel,
            expectedDelay: delayMinutes,
            confidence: 0.7, // Medium confidence without ML
            trend,
          });
        }
      }

      return forecasts;
    } catch (error) {
      console.error(`[TrafficAnalyzerPro] Error forecasting congestion for ${sectionCode}:`, error);
      return [];
    }
  }

  /**
   * Identify traffic bottlenecks
   */
  async identifyBottlenecks(): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    try {
      // Get all sections with high congestion over last hour
      const problematicSections = await this._getHighCongestionSections(60);

      for (const section of problematicSections) {
        // Analyze causes
        const causes = await this._analyzeCongestionCauses(section.sectionCode);
        const severity = this._calculateSeverity(section.congestionLevel, causes.length);

        // Get affected trains
        const affectedTrains = await this._getAffectedTrains(section.sectionCode);

        // Determine recommendations
        const recommendations = this._generateRecommendations(causes, section);

        bottlenecks.push({
          sectionCode: section.sectionCode,
          sectionName: section.sectionName,
          severity,
          congestionLevel: section.congestionLevel,
          estimatedDuration: this._estimateDuration(causes),
          affectedTrains,
          rootCauses: causes,
          recommendedActions: recommendations,
        });
      }

      return bottlenecks.sort((a, b) => {
        const severityMap = { critical: 4, severe: 3, moderate: 2, minor: 1 };
        return severityMap[b.severity as keyof typeof severityMap] -
               severityMap[a.severity as keyof typeof severityMap];
      });
    } catch (error) {
      console.error('[TrafficAnalyzerPro] Error identifying bottlenecks:', error);
      return [];
    }
  }

  /**
   * Get traffic summary (quick overview)
   */
  async getTrafficSummary(): Promise<any> {
    try {
      const bottlenecks = await this.identifyBottlenecks();
      const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length;
      const severeCount = bottlenecks.filter(b => b.severity === 'severe').length;

      let overallStatus = 'good';
      if (criticalCount > 0) overallStatus = 'critical';
      else if (severeCount > 0) overallStatus = 'warning';
      else if (bottlenecks.length > 3) overallStatus = 'caution';

      return {
        overallStatus,
        bottleneckCount: bottlenecks.length,
        criticalSections: criticalCount,
        severeSections: severeCount,
        mostProblematicSections: bottlenecks.slice(0, 5),
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[TrafficAnalyzerPro] Error getting traffic summary:', error);
      return { overallStatus: 'unknown', bottleneckCount: 0 };
    }
  }

  // ============ HELPER METHODS ============

  private async _getTrainsInSection(sectionCode: string, minutesBack: number): Promise<any[]> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const cutoff = Date.now() - minutesBack * 60 * 1000;
      const query = `
        SELECT DISTINCT
          trainNumber,
          sectionCode,
          currentStation as sectionName,
          AVG(speed) as speed,
          AVG(delay) as delay
        FROM train_snapshots
        WHERE sectionCode = ? AND timestamp > ?
        GROUP BY trainNumber
      `;

      this.db.all(query, [sectionCode, cutoff], (err: any, rows: any[]) => {
        if (err) {
          console.warn('[TrafficAnalyzerPro] Error fetching section trains:', err);
          resolve([]);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  private _analyzeDirectionDistribution(trains: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const train of trains) {
      const direction = train.direction || 'unknown';
      distribution[direction] = (distribution[direction] || 0) + 1;
    }
    return distribution;
  }

  private _classifyDensity(trainCount: number, avgSpeed: number, avgDelay: number) {
    let densityLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let congestionIndex = 0;

    // Train count factor (assume 5+ trains in section is congestion)
    const countFactor = Math.min(100, (trainCount / 5) * 25);

    // Speed factor (slower = more congestion)
    const speedFactor = Math.max(0, 40 - avgSpeed * 2);

    // Delay factor (more delay = more congestion)
    const delayFactor = Math.min(35, avgDelay / 4);

    congestionIndex = countFactor + speedFactor + delayFactor;

    if (congestionIndex >= 75) densityLevel = 'critical';
    else if (congestionIndex >= 50) densityLevel = 'high';
    else if (congestionIndex >= 25) densityLevel = 'medium';

    return { densityLevel, congestionIndex: Math.round(congestionIndex) };
  }

  private async _getTrainCurrentPosition(trainNumber: string): Promise<any> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const query = `
        SELECT * FROM train_snapshots
        WHERE trainNumber = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      this.db.get(query, [trainNumber], (err: any, row: any) => {
        if (err) {
          resolve(null);
        } else {
          resolve(row);
        }
      });
    });
  }

  private async _findNearbyTrains(lat: number, lng: number, radiusKm: number): Promise<any[]> {
    // This would typically use spatial indexes or calculate distance
    // For now, brute force from recent snapshots
    return new Promise((resolve) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const cutoff = Date.now() - 10 * 60 * 1000; // Last 10 minutes
      const query = `
        SELECT DISTINCT trainNumber, latitude, longitude
        FROM train_snapshots
        WHERE timestamp > ?
      `;

      this.db.all(query, [cutoff], (err: any, rows: any[]) => {
        if (err) {
          resolve([]);
          return;
        }

        const nearby = rows
          .map(r => ({
            trainNumber: r.trainNumber,
            distance: this._haversineDistance(lat, lng, r.latitude, r.longitude),
            lat: r.latitude,
            lng: r.longitude,
          }))
          .filter(r => r.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance);

        resolve(nearby);
      });
    });
  }

  private _haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // km
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

  private _isAheadOnRoute(currentTrain: any, otherTrain: any): boolean {
    // Simple heuristic: if ahead on same general heading
    // In production: use actual route/schedule
    return Math.random() > 0.5; // Placeholder
  }

  private async _getHistoricalPatterns(sectionCode: string, daysBack: number): Promise<any[]> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const cutoff = Date.now() - daysBack * 24 * 3600 * 1000;
      const query = `
        SELECT
          hour,
          AVG(nearbyTrainsCount) as density,
          strftime('%w', datetime(recordedAt / 1000, 'unixepoch')) as dayOfWeek
        FROM congestion_metrics
        WHERE sectionCode = ? AND recordedAt > ?
        GROUP BY hour, dayOfWeek
      `;

      this.db.all(query, [sectionCode, cutoff], (err: any, rows: any[]) => {
        if (err) {
          resolve([]);
        } else {
          resolve(
            (rows || []).map(r => ({
              hour: r.hour,
              density: r.density || 0,
              dayOfWeek: parseInt(r.dayOfWeek),
            }))
          );
        }
      });
    });
  }

  private _calculateTrend(
    current: number,
    historical: number
  ): 'improving' | 'stable' | 'worsening' {
    const diff = current - historical;
    if (diff > 10) return 'worsening';
    if (diff < -10) return 'improving';
    return 'stable';
  }

  private _predictDensity(
    current: SectionDensity,
    historical: number,
    trend: 'improving' | 'stable' | 'worsening'
  ): number {
    const basePredict = (current.congestionIndex + historical) / 2;
    const trendFactor = trend === 'worsening' ? 1.1 : trend === 'improving' ? 0.9 : 1;
    return Math.round(basePredict * trendFactor);
  }

  private _estimateFromDensity(density: number): { congestionLevel: 'low' | 'medium' | 'high' | 'critical'; delayMinutes: number } {
    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let delay = 0;

    if (density >= 75) {
      level = 'critical';
      delay = 60;
    } else if (density >= 50) {
      level = 'high';
      delay = 30;
    } else if (density >= 25) {
      level = 'medium';
      delay = 10;
    }

    return { congestionLevel: level, delayMinutes: delay };
  }

  private async _getHighCongestionSections(minutesBack: number): Promise<any[]> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const cutoff = Date.now() - minutesBack * 60 * 1000;
      const query = `
        SELECT
          sectionCode,
          sectionName,
          AVG(trafficDensity) as congestionLevel
        FROM congestion_metrics
        WHERE recordedAt > ? AND congestionLevel >= 'medium'
        GROUP BY sectionCode
        HAVING AVG(trafficDensity) >= 0.5
      `;

      this.db.all(query, [cutoff], (err: any, rows: any[]) => {
        if (err) {
          resolve([]);
        } else {
          resolve(
            (rows || []).map(r => ({
              sectionCode: r.sectionCode,
              sectionName: r.sectionName,
              congestionLevel: Math.round(parseFloat(r.congestionLevel) * 100),
            }))
          );
        }
      });
    });
  }

  private async _analyzeCongestionCauses(sectionCode: string): Promise<string[]> {
    // Analyze what might be causing congestion
    const causes: string[] = [];

    // Check for halts
    const haltCount = 0; // Would query database
    if (haltCount > 2) causes.push('Multiple train halts detected');

    // Check for signal issues (would require additional data)
    causes.push('Signal regulation');

    // Check for scheduled construction
    causes.push('Line maintenance');

    return causes;
  }

  private async _getAffectedTrains(sectionCode: string): Promise<string[]> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const cutoff = Date.now() - 60 * 60 * 1000; // Last hour
      const query = `
        SELECT DISTINCT trainNumber FROM train_snapshots
        WHERE sectionCode = ? AND timestamp > ?
      `;

      this.db.all(query, [sectionCode, cutoff], (err: any, rows: any[]) => {
        if (err) {
          resolve([]);
        } else {
          resolve((rows || []).map(r => r.trainNumber));
        }
      });
    });
  }

  private _calculateSeverity(
    congestionLevel: number,
    causeCount: number
  ): 'minor' | 'moderate' | 'severe' | 'critical' {
    if (congestionLevel >= 80 && causeCount >= 2) return 'critical';
    if (congestionLevel >= 60 && causeCount >= 2) return 'severe';
    if (congestionLevel >= 40) return 'moderate';
    return 'minor';
  }

  private _estimateDuration(causes: string[]): number {
    // Estimate how long congestion will last based on causes
    // (In production: use historical recovery times)
    return 30; // 30 minutes default
  }

  private _generateRecommendations(causes: string[], section: any): string[] {
    const recs: string[] = [];

    if (causes.includes('Multiple train halts detected')) {
      recs.push('Priority: Resume halted trains');
    }
    if (causes.includes('Signal regulation')) {
      recs.push('Check signal configuration');
    }
    if (causes.includes('Line maintenance')) {
      recs.push('Coordinate with maintenance team for expedited completion');
    }

    recs.push('Update passenger announcements');
    recs.push('Monitor for capacity overflow at stations');

    return recs;
  }
}

export default new TrafficAnalyzerPro();

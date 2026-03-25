/**
 * Centralized Train Position Service
 * Single source of truth for all train coordinates
 * PHASE 6B: Consolidates position data from NTES, RailYatri, and schedule sources
 *
 * Architecture:
 * - NTES: Official delay/status (no coordinates)
 * - RailYatri: Live GPS coordinates
 * - Schedule: Estimated coordinates when live data unavailable
 * - Result: Single unified position with source quality score
 */

import { ntesProvider } from './providers/ntesProvider';
import { railyatriProvider } from './providers/railyatriProvider';
import { ProviderResult } from './providerAdapter';

export interface UnifiedTrainPosition {
  trainNumber: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  source: 'railyatri' | 'schedule' | 'estimated';
  sourceQuality: number; // 0-100
  speed?: number; // km/h
  delay?: number; // minutes from NTES
  status?: string; // 'ON_TIME' | 'DELAYED' | 'HALTED' from NTES
  confidence: number; // overall confidence (0-100)
}

class CentralizedTrainPositionService {
  private positionCache = new Map<
    string,
    { position: UnifiedTrainPosition; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 15000; // 15 seconds for live positions

  /**
   * Get unified train position from best available source
   * Priority: RailYatri GPS > Schedule estimate
   * Always includes NTES status if available
   */
  async getTrainPosition(trainNumber: string): Promise<UnifiedTrainPosition | null> {
    // Check cache first
    const cached = this.positionCache.get(trainNumber);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.position;
    }

    try {
      // Fetch position from providers in parallel
      const [railyatriResult, ntesResult] = await Promise.all([
        railyatriProvider.getStatus(trainNumber),
        ntesProvider.getStatus(trainNumber),
      ]);

      let position: UnifiedTrainPosition | null = null;

      // Priority 1: RailYatri GPS data (most accurate for coordinates)
      if (railyatriResult && railyatriResult.lat && railyatriResult.lng) {
        position = {
          trainNumber,
          timestamp: Date.now(),
          latitude: railyatriResult.lat,
          longitude: railyatriResult.lng,
          accuracy: railyatriResult.accuracy || 100,
          source: 'railyatri',
          sourceQuality: 92, // GPS is very accurate
          speed: railyatriResult.speed,
          delay: ntesResult?.delay,
          status: ntesResult?.status,
          confidence: 88,
        };
      } else {
        // Priority 2: Schedule-based estimation
        console.log(
          `[CentralizedPositionService] RailYatri GPS unavailable for ${trainNumber}, using schedule estimate`
        );
        // TODO: Implement schedule-based position interpolation
        // This would:
        // 1. Get train's scheduled stations
        // 2. Calculate elapsed time since last station
        // 3. Interpolate position on route between stations
        // position = await this._estimatePositionFromSchedule(trainNumber);
      }

      if (position) {
        // Always add NTES status if we got it
        if (ntesResult) {
          position.delay = ntesResult.delay;
          position.status = ntesResult.status;
        }

        // Cache the result
        this.positionCache.set(trainNumber, {
          position,
          timestamp: Date.now(),
        });

        console.log(
          `[CentralizedPositionService] Position for ${trainNumber}: (${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}) from ${position.source}`
        );

        return position;
      }

      return null;
    } catch (error) {
      console.error(`[CentralizedPositionService] Error getting position for ${trainNumber}:`, error);
      return null;
    }
  }

  /**
   * Get positions for multiple trains (batch operation)
   */
  async getMultipleTrainPositions(trainNumbers: string[]): Promise<UnifiedTrainPosition[]> {
    const positions = await Promise.all(
      trainNumbers.map((tn) => this.getTrainPosition(tn))
    );
    return positions.filter((p) => p !== null) as UnifiedTrainPosition[];
  }

  /**
   * Get all trains currently being tracked
   * Returns their unified positions
   */
  async getAllTrackedTrainsPositions(): Promise<UnifiedTrainPosition[]> {
    // TODO: Fetch list of trains to track from database or config
    const knownTrains = ['12955', '12728', '17015', '12702', '11039'];
    return this.getMultipleTrainPositions(knownTrains);
  }

  /**
   * Subscribe to position updates for a train (polling-based for now)
   * In production: use WebSocket for real-time updates
   */
  subscribeToPositionUpdates(
    trainNumber: string,
    callback: (position: UnifiedTrainPosition) => void,
    intervalMs: number = 10000
  ): () => void {
    // Update position immediately
    this.getTrainPosition(trainNumber).then((pos) => {
      if (pos) callback(pos);
    });

    // Then poll at regular intervals
    const intervalId = setInterval(async () => {
      const pos = await this.getTrainPosition(trainNumber);
      if (pos) callback(pos);
    }, intervalMs);

    // Return unsubscribe function
    return () => clearInterval(intervalId);
  }

  /**
   * Clear old cache entries
   */
  clearOldCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of this.positionCache) {
      if (now - timestamp > this.CACHE_TTL_MS) {
        this.positionCache.delete(key);
      }
    }
  }

  /**
   * Estimate train position from schedule (TODO: Implement)
   * This would interpolate position between stations based on:
   * - Current time
   * - Scheduled arrival/departure times
   * - Route polyline
   */
  private async _estimatePositionFromSchedule(
    trainNumber: string
  ): Promise<UnifiedTrainPosition | null> {
    // TODO: Implement using:
    // 1. Get train schedule from database
    // 2. Calculate time elapsed since last station
    // 3. Find position on route polyline based on elapsed time and expected speed
    // 4. Add small uncertainty radius since this is an estimate
    return null;
  }
}

// Export singleton instance
export const centralizedPositionService = new CentralizedTrainPositionService();

// Cleanup old cache entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    centralizedPositionService.clearOldCache();
  }, 60000);
}

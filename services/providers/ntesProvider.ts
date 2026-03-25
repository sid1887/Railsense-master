/**
 * NTES Provider
 * Pulls official train status from NTES (National Train Enquiry System)
 * Status-only (no coordinates), but authoritative
 *
 * This is the primary data source for official delays and cancellations
 */

import { ProviderResult, TrainProvider } from '../providerAdapter';

// Mock NTES response - in production would call ntesScraperWorker
export interface NTESStatus {
  trainNumber: string;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'HALTED';
  delay: number; // minutes
  lastStation: string;
  nextStation: string;
  actualArrival?: number; // unix timestamp
  expectedArrival?: number; // unix timestamp
  platform?: string;
}

class NTESProvider implements TrainProvider {
  name = 'NTES';
  enabled = true;
  rateLimit = 10; // requests per minute
  stats = {
    successCount: 0,
    failureCount: 0,
    avgLatencyMs: 0,
    lastError: null as string | null,
    lastSuccessTime: null as number | null,
  };

  private scrapedCache = new Map<string, { data: NTESStatus; timestamp: number }>();
  private CACHE_TTL_MS = 30000; // 30s cache for NTES data
  private ENABLE_MOCK_MODE = process.env.ENABLE_MOCK_LIVE_DATA === 'true';

  /**
   * Fetch status for a single train from NTES
   * Returns status-only data (no coordinates)
   */
  async getStatus(trainNumber: string): Promise<ProviderResult | null> {
    const start = Date.now();

    try {
      // Check cache first
      const cached = this.scrapedCache.get(trainNumber);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return {
          trainNumber,
          delay: cached.data.delay,
          status: cached.data.status,
          timestamp: cached.timestamp,
          source: 'ntes',
          raw: cached.data,
        };
      }

      // Production path: no fabricated status.
      // Keep mock behind explicit dev flag only.
      const nteData = this.ENABLE_MOCK_MODE
        ? await this._mockFetchFromNTES(trainNumber)
        : null;

      if (!nteData) {
        this.recordFailure('No NTES data found');
        return null;
      }

      const result: ProviderResult = {
        trainNumber,
        // NTES doesn't provide coordinates or speed
        delay: nteData.delay,
        status: nteData.status,
        timestamp: Date.now(),
        source: 'ntes',
        raw: nteData,
      };

      // Cache it
      this.scrapedCache.set(trainNumber, {
        data: nteData,
        timestamp: Date.now(),
      });

      this.recordSuccess(Date.now() - start);
      return result;
    } catch (error) {
      this.recordFailure(`${error}`);
      console.error(`[NTES] Error fetching ${trainNumber}:`, error);
      return null;
    }
  }

  /**
   * Mock NTES fetch - returns simulated official status
   * In production: implement real scraper calling ntesScraperWorker
   * PHASE 2 FIX: Removed Math.random() - using deterministic data only
   */
  private async _mockFetchFromNTES(trainNumber: string): Promise<NTESStatus | null> {
    // Deterministic status based on real train data (NO randomization in production)
    const knownTrains: Record<string, Partial<NTESStatus>> = {
      '12955': {
        trainNumber: '12955',
        lastStation: 'Mumbai Central',
        nextStation: 'Thane',
        status: 'ON_TIME' as const,
        delay: 0,
      },
      '12728': {
        trainNumber: '12728',
        lastStation: 'Virar',
        nextStation: 'Diva',
        status: 'ON_TIME' as const,
        delay: 0,
      },
      '12702': {
        trainNumber: '12702',
        lastStation: 'Kalyan',
        nextStation: 'Kasara',
        status: 'ON_TIME' as const,
        delay: 0,
      },
      '17015': {
        trainNumber: '17015',
        lastStation: 'Hyderabad',
        nextStation: 'Tandur',
        status: 'ON_TIME' as const,
        delay: 0,
      },
      '11039': {
        trainNumber: '11039',
        lastStation: 'Dhanbad',
        nextStation: 'Asansol',
        status: 'ON_TIME' as const,
        delay: 0,
      },
    };

    const trainData = knownTrains[trainNumber];
    if (!trainData) return null;

    return {
      trainNumber,
      status: trainData.status || 'ON_TIME',
      delay: trainData.delay || 0,
      lastStation: trainData.lastStation!,
      nextStation: trainData.nextStation!,
      actualArrival: Date.now(),
      expectedArrival: Date.now() + (trainData.delay || 0) * 60000,
    };
  }

  /**
   * Clear old cache entries (call periodically)
   */
  clearOldCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of this.scrapedCache) {
      if (now - timestamp > this.CACHE_TTL_MS) {
        this.scrapedCache.delete(key);
      }
    }
  }

  private recordSuccess(latencyMs: number) {
    this.stats.successCount++;
    this.stats.lastSuccessTime = Date.now();
    // Update average latency
    this.stats.avgLatencyMs =
      (this.stats.avgLatencyMs * (this.stats.successCount - 1) + latencyMs) / this.stats.successCount;
    this.stats.lastError = null;
  }

  private recordFailure(error: string) {
    this.stats.failureCount++;
    this.stats.lastError = error;
  }
}

export const ntesProvider = new NTESProvider();

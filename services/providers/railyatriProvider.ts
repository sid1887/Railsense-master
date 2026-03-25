/**
 * RailYatri Provider
 * Crowdsourced live train location data from RailYatri mobile app
 * GPS-only (high frequency position updates)
 *
 * Complements NTES: NTES has status, RailYatri has coordinates
 */

import { ProviderResult, TrainProvider } from '../providerAdapter';

export interface RailYatriData {
  trainNumber: string;
  lat: number;
  lng: number;
  speed: number; // km/h estimated from movement
  accuracy: number; // meters
  boardedPassengers: number;
  crowdLevel: 'EMPTY' | 'NORMAL' | 'CROWDED' | 'PACKED';
  lastReportAge: number; // seconds
}

class RailYatriProvider implements TrainProvider {
  name = 'RailYatri';
  enabled = true;
  rateLimit = 15; // requests per minute
  stats = {
    successCount: 0,
    failureCount: 0,
    avgLatencyMs: 0,
    lastError: null as string | null,
    lastSuccessTime: null as number | null,
  };

  private gpsCache = new Map<string, { data: RailYatriData; timestamp: number }>();
  private CACHE_TTL_MS = 20000; // 20s cache for GPS data (lower than NTES)
  private ENABLE_MOCK_MODE = process.env.ENABLE_MOCK_LIVE_DATA === 'true';

  /**
   * Fetch live position for a train from RailYatri
   * Attempts real API first, falls back to mock
   */
  async getStatus(trainNumber: string): Promise<ProviderResult | null> {
    const start = Date.now();

    try {
      // Check cache first (shorter TTL for fresher GPS)
      const cached = this.gpsCache.get(trainNumber);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return this._railyatriToProviderResult(cached.data, cached.timestamp);
      }

      let railyatriData: RailYatriData | null = null;

      // Try real RailYatri API first (with timeout)
      try {
        console.log(`[RailYatri] Attempting real API for train ${trainNumber}...`);
        railyatriData = await this._fetchFromRealAPI(trainNumber);
        if (railyatriData) {
          console.log(`[RailYatri] Got real data for train ${trainNumber}`);
        }
      } catch (apiError) {
        console.warn(`[RailYatri] Real API failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
      }

      // Fall back to mock only in explicit dev mode
      if (!railyatriData) {
        try {
          console.log(`[RailYatri] API endpoints unavailable, trying status-page scrape for ${trainNumber}`);
          railyatriData = await this._fetchFromStatusPages(trainNumber);
        } catch (scrapeError) {
          console.warn(`[RailYatri] Status-page scrape failed: ${scrapeError instanceof Error ? scrapeError.message : 'Unknown error'}`);
        }
      }

      // Fall back to null - no mock data generation
      if (!railyatriData) {
        if (this.ENABLE_MOCK_MODE) {
          console.log(`[RailYatri] Mock mode would be used, but mock data generation is disabled`);
        }
      }

      if (!railyatriData) {
        this.recordFailure('No RailYatri GPS data found');
        return null;
      }

      // Cache it
      this.gpsCache.set(trainNumber, {
        data: railyatriData,
        timestamp: Date.now(),
      });

      const result = this._railyatriToProviderResult(railyatriData, Date.now());
      this.recordSuccess(Date.now() - start);
      return result;
    } catch (error) {
      this.recordFailure(`${error}`);
      console.error(`[RailYatri] Error fetching ${trainNumber}:`, error);
      return null;
    }
  }

  /**
   * Attempt to fetch from real RailYatri API
   */
  private async _fetchFromRealAPI(trainNumber: string): Promise<RailYatriData | null> {
    const endpoints = [
      `https://www.railyatri.in/api/v1/live/train/${trainNumber}`,
      `https://railyatri.in/api/train/live/${trainNumber}`,
      `https://api.railyatri.in/v1/train/${trainNumber}/live`,
    ];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'RailSense/1.0 (+http://railsense.local)',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.railyatri.in/',
            'Cache-Control': 'no-cache',
          },
        });

        clearTimeout(timeout);

        if (!response.ok) {
          console.warn(`[RailYatri] Endpoint ${endpoint} returned ${response.status}`);
          continue;
        }

        const data = await response.json();

        // Try to parse response (RailYatri API format may vary)
        const trainData = this._parseRailYatriResponse(data, trainNumber);
        if (trainData) {
          return trainData;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`[RailYatri] Endpoint ${endpoint} timed out`);
        } else {
          console.warn(`[RailYatri] Endpoint ${endpoint} error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    return null;
  }

  /**
   * Hard fallback: scrape public live status pages and extract embedded coordinates.
   */
  private async _fetchFromStatusPages(trainNumber: string): Promise<RailYatriData | null> {
    const pages = [
      `https://www.railyatri.in/live-train-status/${trainNumber}`,
      `https://www.railyatri.in/trains/${trainNumber}/live-status`,
      `https://www.whereismytrain.in/train-status/${trainNumber}`,
    ];

    for (const pageUrl of pages) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(pageUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
        });

        clearTimeout(timeout);

        if (!response.ok) {
          continue;
        }

        const html = await response.text();
        const coords = this._extractCoordinatesFromHtml(html);
        if (!coords) {
          continue;
        }

        const speed = this._extractNumericValue(html, [/"speed"\s*:\s*([0-9.]+)/i, /speed[^0-9]*([0-9]{1,3})\s*km\/h/i]) || 0;
        const delay = this._extractNumericValue(html, [/"delay"\s*:\s*(-?[0-9.]+)/i, /delay[^0-9-]*(-?[0-9]{1,3})\s*min/i]) || 0;

        return {
          trainNumber,
          lat: coords.lat,
          lng: coords.lng,
          speed,
          accuracy: 250,
          boardedPassengers: 0,
          crowdLevel: 'NORMAL',
          lastReportAge: 120,
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`[RailYatri] Status-page scrape timeout for ${pageUrl}`);
        }
      }
    }

    return null;
  }

  private _extractCoordinatesFromHtml(html: string): { lat: number; lng: number } | null {
    const patterns: RegExp[] = [
      /"lat(?:itude)?"\s*:\s*([0-9]{1,2}\.[0-9]+)[^\n\r]{0,120}?"(?:lng|lon|longitude)"\s*:\s*([0-9]{1,3}\.[0-9]+)/i,
      /"(?:lng|lon|longitude)"\s*:\s*([0-9]{1,3}\.[0-9]+)[^\n\r]{0,120}?"lat(?:itude)?"\s*:\s*([0-9]{1,2}\.[0-9]+)/i,
      /latitude\s*[=:]\s*([0-9]{1,2}\.[0-9]+)[^\n\r]{0,80}longitude\s*[=:]\s*([0-9]{1,3}\.[0-9]+)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (!match) {
        continue;
      }

      const first = Number(match[1]);
      const second = Number(match[2]);

      let lat = first;
      let lng = second;

      if (lat > 90 || lng > 180) {
        lat = second;
        lng = first;
      }

      if (this._isValidIndianCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }

    return null;
  }

  private _extractNumericValue(html: string, patterns: RegExp[]): number | null {
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const value = Number(match[1]);
        if (Number.isFinite(value)) {
          return value;
        }
      }
    }
    return null;
  }

  private _isValidIndianCoordinate(lat: number, lng: number): boolean {
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 37 && lng >= 68 && lng <= 98;
  }

  /**
   * Parse RailYatri API response (handles multiple response formats)
   */
  private _parseRailYatriResponse(data: any, trainNumber: string): RailYatriData | null {
    try {
      // Try different response formats
      let trainData = data;

      // Sometimes response is wrapped in a "data" or "train" property
      if (data && typeof data === 'object') {
        if (data.train) trainData = data.train;
        else if (data.data) trainData = data.data;
        else if (data.result) trainData = data.result;
      }

      // Check for required fields
      if (!trainData || typeof trainData !== 'object') {
        return null;
      }

      const hasLatLng = (trainData.lat || trainData.latitude) && (trainData.lng || trainData.longitude);
      const hasTrainNumber = trainData.trainNo || trainData.trainNumber || trainData.train_number || trainData.number;

      if (!hasLatLng || !hasTrainNumber) {
        return null;
      }

      // Normalize response
      return {
        trainNumber: trainData.trainNo || trainData.trainNumber || trainData.train_number || trainNumber,
        lat: trainData.lat || trainData.latitude || 0,
        lng: trainData.lng || trainData.longitude || 0,
        speed: trainData.speed || trainData.currentSpeed || 0,
        accuracy: trainData.accuracy || trainData.gpsAccuracy || 50,
        boardedPassengers: trainData.passengers || trainData.boarded || 0,
        crowdLevel: trainData.crowdLevel || trainData.crowd || 'NORMAL',
        lastReportAge: trainData.time_ago || trainData.lastReportAge || 0,
      };
    } catch (error) {
      console.warn(`[RailYatri] Parse error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  /**
   * Convert RailYatri format to ProviderResult
   */
  private _railyatriToProviderResult(data: RailYatriData, timestamp: number): ProviderResult {
    return {
      trainNumber: data.trainNumber,
      lat: data.lat,
      lng: data.lng,
      speed: data.speed,
      accuracy: data.accuracy,
      // RailYatri doesn't provide delay or status info
      timestamp,
      source: 'railyatri',
      raw: data,
    };
  }

  /**
   * Mock RailYatri GPS fetch
  /**
   * Clear old cache entries
   */
  clearOldCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of this.gpsCache) {
      if (now - timestamp > this.CACHE_TTL_MS) {
        this.gpsCache.delete(key);
      }
    }
  }

  private recordSuccess(latencyMs: number) {
    this.stats.successCount++;
    this.stats.lastSuccessTime = Date.now();
    this.stats.avgLatencyMs =
      (this.stats.avgLatencyMs * (this.stats.successCount - 1) + latencyMs) / this.stats.successCount;
    this.stats.lastError = null;
  }

  private recordFailure(error: string) {
    this.stats.failureCount++;
    this.stats.lastError = error;
  }
}

export const railyatriProvider = new RailYatriProvider();

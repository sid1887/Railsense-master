/**
 * Search Analytics Tracker
 * 
 * Tracks user searches for train status as a proxy metric for crowd presence.
 * Hypothesis: Users searching for live train status 5-30 mins before arrival
 * are likely near/at the station platform, indicating crowd size.
 */

interface SearchRecord {
  trainNumber: string;
  timestamp: number;
  searchType: 'exact' | 'partial' | 'station_based'; // exact=exact match, partial=typo/nearby, station=searching by station
  userContext?: {
    approximateLocation?: string;
    searchIntent?: 'status_check' | 'arrival_time' | 'platform_info' | 'unknown';
  };
}

interface SearchAnalytics {
  trainNumber: string;
  totalSearches: number;
  searchesLast30Min: number;
  searchesLast5Min: number;
  searchTrendDirection: 'increasing' | 'stable' | 'decreasing';
  peakSearchTime?: number; // timestamp of peak search activity
  uniqueSearchPatterns: {
    exactMatches: number;
    partialMatches: number;
    stationBased: number;
  };
}

class SearchAnalyticsTracker {
  private searchHistory: SearchRecord[] = [];
  private searchBuffer: Map<string, SearchRecord[]> = new Map();
  private maxHistorySize = 10000;
  private cleanupInterval = 60000; // 1 minute

  constructor() {
    // Auto-cleanup old records every minute
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Record a search event for a train
   */
  recordSearch(
    trainNumber: string,
    searchType: 'exact' | 'partial' | 'station_based' = 'exact',
    userContext?: SearchRecord['userContext']
  ): void {
    const record: SearchRecord = {
      trainNumber: trainNumber.toUpperCase(),
      timestamp: Date.now(),
      searchType,
      userContext,
    };

    this.searchHistory.push(record);

    // Also maintain per-train buffer for faster queries
    if (!this.searchBuffer.has(trainNumber)) {
      this.searchBuffer.set(trainNumber, []);
    }
    this.searchBuffer.get(trainNumber)!.push(record);
  }

  /**
   * Get analytics for a specific train
   */
  getSearchAnalytics(trainNumber: string): SearchAnalytics {
    const normalized = trainNumber.toUpperCase();
    const records = this.searchBuffer.get(normalized) || [];
    const now = Date.now();

    const searches30min = records.filter((r) => now - r.timestamp <= 30 * 60 * 1000);
    const searches5min = records.filter((r) => now - r.timestamp <= 5 * 60 * 1000);

    const exactMatches = searches30min.filter((r) => r.searchType === 'exact').length;
    const partialMatches = searches30min.filter((r) => r.searchType === 'partial').length;
    const stationBased = searches30min.filter((r) => r.searchType === 'station_based').length;

    // Determine trend
    const searches10minAgo = searches30min.filter((r) => {
      const age = now - r.timestamp;
      return age > 10 * 60 * 1000 && age <= 20 * 60 * 1000;
    }).length;
    const trend =
      searches5min.length > searches10minAgo * 1.5
        ? 'increasing'
        : searches5min.length < searches10minAgo * 0.7
          ? 'decreasing'
          : 'stable';

    // Find peak search time
    let peakSearchTime = undefined;
    if (searches30min.length > 0) {
      // Group by minute and find busiest minute
      const byMinute: Record<number, number> = {};
      searches30min.forEach((r) => {
        const minute = Math.floor(r.timestamp / 60000);
        byMinute[minute] = (byMinute[minute] || 0) + 1;
      });
      const [peakMinute] = Object.entries(byMinute).sort((a, b) => b[1] - a[1])[0];
      peakSearchTime = parseInt(peakMinute) * 60000;
    }

    return {
      trainNumber: normalized,
      totalSearches: records.length,
      searchesLast30Min: searches30min.length,
      searchesLast5Min: searches5min.length,
      searchTrendDirection: trend,
      peakSearchTime,
      uniqueSearchPatterns: {
        exactMatches,
        partialMatches,
        stationBased,
      },
    };
  }

  /**
   * Get all trains with recent search activity
   */
  getActiveTrains(): Map<string, SearchAnalytics> {
    const now = Date.now();
    const active = new Map<string, SearchAnalytics>();

    this.searchBuffer.forEach((records, trainNumber) => {
      const recent = records.filter((r) => now - r.timestamp <= 30 * 60 * 1000);
      if (recent.length > 0) {
        active.set(trainNumber, this.getSearchAnalytics(trainNumber));
      }
    });

    return active;
  }

  /**
   * Clean up old records to prevent memory bloat
   */
  private cleanup(): void {
    const now = Date.now();
    const ageLimit = 60 * 60 * 1000; // Keep 1 hour of history

    // Trim old records from search history
    this.searchHistory = this.searchHistory.filter((r) => now - r.timestamp < ageLimit);

    // Trim old records from per-train buffers
    this.searchBuffer.forEach((records, trainNumber) => {
      const filtered = records.filter((r) => now - r.timestamp < ageLimit);
      if (filtered.length === 0) {
        this.searchBuffer.delete(trainNumber);
      } else {
        this.searchBuffer.set(trainNumber, filtered);
      }
    });

    // Ensure we don't exceed max history size
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get raw search records for a train (for debugging/advanced analysis)
   */
  getRawSearchRecords(trainNumber: string, minutesBack: number = 30): SearchRecord[] {
    const now = Date.now();
    const ageLimit = minutesBack * 60 * 1000;
    return this.searchBuffer.get(trainNumber.toUpperCase())?.filter((r) => now - r.timestamp <= ageLimit) || [];
  }
}

// Singleton instance
export const searchAnalyticsTracker = new SearchAnalyticsTracker();

export type { SearchRecord, SearchAnalytics };

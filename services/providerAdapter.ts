/**
 * Provider Adapter Layer
 * Unified interface for all data sources (NTES, RailYatri, aggregators)
 * Ensures consistent data structure, proper fallback ordering, and logging
 */

import { ntesProvider } from './providers/ntesProvider';
import { railyatriProvider } from './providers/railyatriProvider';
import { getTrainData } from './trainDataService';
import type { TrainDataSource } from '@/types/train';

export interface ProviderResult {
  trainNumber: string;
  lat?: number;
  lng?: number;
  speed?: number;
  delay?: number;
  status?: string;
  timestamp?: number;
  accuracy?: number; // meters (for GPS-based sources)
  source?: TrainDataSource;
  sources?: TrainDataSource[];
  raw?: any;
}

export interface TrainProvider {
  name: string;
  enabled: boolean;
  getStatus(trainNumber: string): Promise<ProviderResult | null>;
  rateLimit?: number; // calls per minute
  lastError?: string;
  lastSuccessTime?: number;
  failureCount?: number;
}

// In-memory stats for monitoring
const providerStats = new Map<string, {
  successCount: number;
  failureCount: number;
  totalLatency: number;
  lastError?: string;
  lastSuccessTime?: number;
}>();

/**
 * Generic wrapper to add instrumentation and error handling
 */
function wrapProvider(provider: TrainProvider): TrainProvider {
  return {
    ...provider,
    getStatus: async (trainNumber: string) => {
      const stats = providerStats.get(provider.name) || {
        successCount: 0,
        failureCount: 0,
        totalLatency: 0,
      };

      const startTime = Date.now();
      try {
        console.log(`[${provider.name}] Fetching train ${trainNumber}...`);
        const result = await provider.getStatus(trainNumber);
        const latency = Date.now() - startTime;

        if (result) {
          stats.successCount++;
          stats.lastSuccessTime = Date.now();
          console.log(
            `[${provider.name}] ✓ Success for ${trainNumber}: lat=${result.lat?.toFixed(3)}, lng=${result.lng?.toFixed(3)}, speed=${result.speed}, delay=${result.delay}, latency=${latency}ms`
          );
        } else {
          stats.failureCount++;
          console.log(`[${provider.name}] ✗ No data for ${trainNumber}`);
        }

        providerStats.set(provider.name, stats);
        return result;
      } catch (err: any) {
        stats.failureCount++;
        stats.lastError = err.message;
        providerStats.set(provider.name, stats);
        console.warn(`[${provider.name}] ✗ Error for ${trainNumber}: ${err.message}`);
        return null;
      }
    }
  };
}

/**
 * Main orchestrator function
 * Tries providers in priority order until one succeeds
 */
export async function getLiveTrainData(
  trainNumber: string,
  providers: TrainProvider[],
  cache?: { get: (key: string) => any, set: (key: string, value: any) => void },
  cacheTTL: number = 30000
): Promise<ProviderResult | null> {
  const cacheKey = `train:${trainNumber}`;
  const cached = cache?.get(cacheKey);
  if (cached && Date.now() - cached.time < cacheTTL) {
    console.log(`[Cache] Hit for ${trainNumber}`);
    return cached.data;
  }

  for (const provider of providers) {
    if (!provider.enabled) continue;

    const result = await provider.getStatus(trainNumber);
    if (result) {
      result.trainNumber = trainNumber;
      if (cache) {
        cache.set(cacheKey, { data: result, time: Date.now() });
      }
      return result;
    }
  }

  console.warn(`[Orchestrator] All providers failed for train ${trainNumber}`);
  return null;
}

/**
 * Merge multiple result (status-only from NTES + position-only from aggregator)
 */
export function mergeProviderResults(
  statusResult: ProviderResult | null,
  positionResult: ProviderResult | null
): ProviderResult | null {
  if (!statusResult && !positionResult) return null;

  const merged: ProviderResult = {
    trainNumber: statusResult?.trainNumber || positionResult?.trainNumber || "",
    lat: positionResult?.lat || statusResult?.lat,
    lng: positionResult?.lng || statusResult?.lng,
    speed: positionResult?.speed || statusResult?.speed,
    delay: statusResult?.delay || positionResult?.delay,
    status: statusResult?.status || positionResult?.status,
    timestamp: Math.max(
      statusResult?.timestamp || 0,
      positionResult?.timestamp || 0
    ),
  };

  return merged;
}

/**
 * Get provider health status (for /admin/providers/status)
 */
export function getProviderStats(providerName?: string) {
  if (providerName) {
    return providerStats.get(providerName);
  }
  const result: any = {};
  for (const [name, stats] of providerStats.entries()) {
    result[name] = {
      ...stats,
      successRate: stats.successCount / (stats.successCount + stats.failureCount) || 0,
      avgLatency: stats.totalLatency / Math.max(stats.successCount, 1),
    };
  }
  return result;
}

export { wrapProvider, providerStats };

/**
 * Get the default provider chain for all trains
 * Priority order: NTES (status) → RailYatri (GPS) → Custom Aggregator → Real Schedule → Simulated
 */
export function getDefaultProviderChain(): TrainProvider[] {
  return [
    wrapProvider(ntesProvider),
    wrapProvider(railyatriProvider),
    // Custom aggregator would go here
    // wrapProvider(customAggregatorProvider),
  ];
}

/**
 * Enhanced orchestrator that merges multiple provider results
 * Tries to get both status (NTES) and position (RailYatri) simultaneously
 */
export async function getLiveTrainDataMerged(
  trainNumber: string,
  cache?: { get: (key: string) => any; set: (key: string, value: any) => void }
): Promise<ProviderResult | null> {
  const cacheKey = `train:${trainNumber}:merged`;
  const cached = cache?.get(cacheKey);
  if (cached && Date.now() - cached.time < 30000) {
    return cached.data;
  }

  try {
    // Fetch from both NTES and RailYatri in parallel
    const [statusResult, positionResult] = await Promise.all([
      ntesProvider.getStatus(trainNumber),
      railyatriProvider.getStatus(trainNumber),
    ]);

    // Merge results - position takes precedence for coords, status for delay
    let merged = mergeProviderResults(statusResult, positionResult);

    const sources: TrainDataSource[] = [];
    if (statusResult) sources.push('ntes');
    if (positionResult) sources.push('railyatri');

    // If both providers failed, try fallback to realTrainDataProvider
    if (!merged) {
      console.log(`[Orchestrator] Both NTES and RailYatri failed, trying real schedule...`);
      const trainData = await getTrainData(trainNumber);
      if (trainData) {
        merged = {
          trainNumber: trainData.trainNumber,
          lat: trainData.currentLocation.latitude,
          lng: trainData.currentLocation.longitude,
          speed: trainData.speed,
          delay: trainData.delay,
          status: trainData.status,
          timestamp: trainData.lastUpdated,
          source: 'schedule',
          sources: ['schedule'],
        };
      }
    }

    if (merged) {
      if (sources.length > 1) {
        merged.source = 'merged';
        merged.sources = sources;
      } else if (sources.length === 1) {
        merged.source = sources[0];
        merged.sources = sources;
      }
    }

    if (merged && cache) {
      cache.set(cacheKey, { data: merged, time: Date.now() });
    }

    return merged;
  } catch (err) {
    console.error(`[Orchestrator] Error in getLiveTrainDataMerged:`, err);
    return null;
  }
}

/**
 * Get the source priority for display
 * Shows which providers contributed to the final result
 */
export function getSourcePriority(result: ProviderResult): string[] {
  const sources: string[] = [];
  if (result.raw?.provider) sources.push(result.raw.provider);
  if (!sources.includes('real-schedule')) sources.push('real-schedule');
  return sources;
}

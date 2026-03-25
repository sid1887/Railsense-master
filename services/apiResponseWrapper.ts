/**
 * API Response Wrapper
 * Standardizes response format across all endpoints
 * Phase 4: Adds source, quality score, and confidence metadata
 */

export interface DataSource {
  name: string; // 'ntes', 'railyatri', 'schedule', 'crowdsourced', 'estimated'
  qualityScore: number; // 0-100, higher = more trustworthy
  lastUpdated: number; // unix timestamp
  isCached: boolean;
  cacheTTLSeconds: number;
}

export interface ConfidenceMetadata {
  overall: number; // 0-100
  location: number; // confidence in coordinates
  delay: number; // confidence in delay prediction
  halt: number; // confidence train is actually halted
  crowdLevel: number; // confidence in crowd/passenger count
  sources: DataSource[];
}

export interface CanonicalApiResponse<T = any> {
  success: boolean;
  data: T;
  confidence: ConfidenceMetadata;
  timestamp: number;
  version: string; // API response format version
  error?: string;
  suggestion?: string;
}

/**
 * Build standardized response with confidence metadata
 */
export function buildApiResponse<T>(
  data: T,
  sourceInfo: Partial<ConfidenceMetadata>,
  success: boolean = true,
  error?: string
): CanonicalApiResponse<T> {
  const defaultConfidence: ConfidenceMetadata = {
    overall: 75,
    location: sourceInfo.location || 80,
    delay: sourceInfo.delay || 70,
    halt: sourceInfo.halt || 75,
    crowdLevel: sourceInfo.crowdLevel || 60,
    sources: sourceInfo.sources || [],
  };

  return {
    success,
    data,
    confidence: defaultConfidence,
    timestamp: Date.now(),
    version: '2.0',
    error,
  };
}

/**
 * Quality scores for different data sources
 */
export const SOURCE_QUALITY = {
  NTES: {
    name: 'ntes',
    qualityScore: 95, // Official railways source
    delay: 90,
    location: 50, // NTES doesn't provide coordinates
    halt: 88,
  },
  RAILYATRI: {
    name: 'railyatri',
    qualityScore: 75, // Crowdsourced, good for GPS
    delay: 40, // RailYatri doesn't provide official delay
    location: 92, // GPS is very accurate
    halt: 70,
  },
  SCHEDULE: {
    name: 'schedule',
    qualityScore: 60, // Schedule-based interpolation
    delay: 50,
    location: 65, // Estimated from route
    halt: 40, // Can't detect unexpect halts
  },
  ESTIMATED: {
    name: 'estimated',
    qualityScore: 45, // Best guess when real data unavailable
    delay: 35,
    location: 50,
    halt: 30,
  },
} as const;

/**
 * Combine confidence from multiple sources
 * Weighted average based on source quality
 */
export function combineConfidence(
  sources: Array<{
    source: typeof SOURCE_QUALITY[keyof typeof SOURCE_QUALITY];
    confidence: number;
  }>
): number {
  if (sources.length === 0) return 0;

  const weighted = sources.reduce((sum, { source, confidence }) => {
    return sum + (source.qualityScore * confidence) / 100;
  }, 0);

  return Math.round(weighted / sources.length);
}

/**
 * Convert legacy response to new canonical format
 */
export function migrateToCanonical<T>(
  data: T,
  sources: DataSource[],
  options: Partial<ConfidenceMetadata> = {}
): CanonicalApiResponse<T> {
  return buildApiResponse(data, {
    sources,
    ...options,
  });
}

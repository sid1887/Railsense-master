/**
 * Hook: useTrainInsight
 * Fetches and polls complete train insight data from the server
 * Auto-refreshes every 15-30 seconds (configurable)
 */

'use client';

import useSWR from 'swr';
import { TrainInsightData } from '@/types/train';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
  return response.json();
};

export interface UseTrainInsightOptions {
  refreshInterval?: number; // milliseconds, default 15000
  dedupingInterval?: number; // SWR deduping interval
  focusThrottleInterval?: number; // Throttle on window focus
  onError?: (error: Error) => void;
}

export function useTrainInsight(
  trainNumber: string | null,
  options: UseTrainInsightOptions = {}
) {
  const {
    refreshInterval = process.env.NODE_ENV === 'development' ? 0 : 60000, // Disabled in dev
    dedupingInterval = 10000, // Increase deduping to 10 seconds
    focusThrottleInterval = 10000,
    onError
  } = options;

  const url = trainNumber
    ? `/api/train-details?trainNumber=${trainNumber}`
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<TrainInsightData>(
    url,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      focusThrottleInterval,
      dedupingInterval,
      refreshInterval: url ? refreshInterval : 0,
      onError: (err) => {
        console.error(`[useTrainInsight] Error fetching ${trainNumber}:`, err);
        onError?.(err);
      },
      errorRetryCount: 3,
      errorRetryInterval: 3000,
      shouldRetryOnError: true,
      keepPreviousData: true
    }
  );

  return {
    data,
    loading: isLoading,
    validating: isValidating,
    error,
    refresh: () => mutate(), // Force refresh
    trainData: data?.trainData,
    haltDetection: data?.haltDetection,
    trafficAnalysis: data?.trafficAnalysis,
    prediction: data?.prediction,
    uncertainty: data?.uncertainty,
    insight: data?.insight
  };
}

/**
 * Hook: useTrainHeatmapData
 * Fetches aggregated heatmap data for visualization
 */
export function useTrainHeatmapData(
  trainNumber?: string,
  timeWindowMinutes = 60,
  refreshInterval = 30000 // 30 seconds
) {
  const params = new URLSearchParams();
  if (trainNumber) params.append('train', trainNumber);
  params.append('mins', timeWindowMinutes.toString());

  const url = `/api/heatmap?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(
    url,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      onError: (err) => {
        console.warn(`[useTrainHeatmapData] Error:`, err);
      }
    }
  );

  return {
    points: data?.points || [],
    loading: isLoading,
    error,
    timeWindow: data?.timeWindow,
    refresh: () => mutate()
  };
}

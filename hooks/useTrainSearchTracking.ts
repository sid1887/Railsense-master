/**
 * Hook to track train searches for crowd detection
 * 
 * Automatically records a search event when a train is viewed
 * This hook should be called in train detail pages
 */

import { useEffect } from 'react';

export function useTrainSearchTracking(trainNumber: string | undefined, searchType: 'exact' | 'partial' | 'station_based' = 'exact') {
  useEffect(() => {
    if (!trainNumber) return;

    // Record the search asynchronously
    const trackSearch = async () => {
      try {
        await fetch('/api/search-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trainNumber,
            searchType,
            userContext: {
              searchIntent: 'status_check',
            },
          }),
        });
      } catch (error) {
        console.error('[Search Tracking] Failed to record search:', error);
        // Silently fail - this is analytics, shouldn't impact user experience
      }
    };

    trackSearch();
  }, [trainNumber, searchType]);
}

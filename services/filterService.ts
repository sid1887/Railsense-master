/**
 * Filter & Sort Service
 * Provides advanced filtering and sorting for train data
 */

export type SortBy = 'delay' | 'speed' | 'distance' | 'name';
export type FilterType = 'region' | 'status' | 'haltDuration' | 'speed';

export interface TrainFilters {
  region?: string;
  status?: 'moving' | 'halted' | 'delayed';
  minSpeed?: number;
  maxSpeed?: number;
  minDelay?: number;
  maxDelay?: number;
  haltDuration?: 'short' | 'medium' | 'long'; // < 5min, 5-15min, > 15min
  searchText?: string;
}

export interface SortOptions {
  field: SortBy;
  direction: 'asc' | 'desc';
}

export interface FilteredTrain {
  trainNumber: string;
  trainName: string;
  speed: number;
  delay: number;
  status: 'moving' | 'halted' | 'delayed';
  region: string;
  distance?: number;
  matchScore?: number;
  dataQuality?: number; // 0-100 quality score
}

/**
 * Filter trains based on criteria
 */
export function filterTrains(trains: FilteredTrain[], filters: TrainFilters): FilteredTrain[] {
  return trains.filter((train) => {
    // Region filter
    if (filters.region && !train.region.toLowerCase().includes(filters.region.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filters.status && train.status !== filters.status) {
      return false;
    }

    // Speed filters
    if (filters.minSpeed !== undefined && train.speed < filters.minSpeed) {
      return false;
    }
    if (filters.maxSpeed !== undefined && train.speed > filters.maxSpeed) {
      return false;
    }

    // Delay filters
    if (filters.minDelay !== undefined && train.delay < filters.minDelay) {
      return false;
    }
    if (filters.maxDelay !== undefined && train.delay > filters.maxDelay) {
      return false;
    }

    // Halt duration filter (approximated from delay)
    if (filters.haltDuration) {
      if (
        filters.haltDuration === 'short' &&
        !(train.delay >= 0 && train.delay < 5)
      ) {
        return false;
      }
      if (
        filters.haltDuration === 'medium' &&
        !(train.delay >= 5 && train.delay < 15)
      ) {
        return false;
      }
      if (filters.haltDuration === 'long' && !(train.delay >= 15)) {
        return false;
      }
    }

    // Text search (name or number)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const nameMatch = train.trainName.toLowerCase().includes(searchLower);
      const numberMatch = train.trainNumber.toLowerCase().includes(searchLower);

      if (!nameMatch && !numberMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort trains based on criteria
 */
export function sortTrains(
  trains: FilteredTrain[],
  sortOptions: SortOptions
): FilteredTrain[] {
  const sorted = [...trains];

  sorted.sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortOptions.field) {
      case 'delay':
        aValue = a.delay;
        bValue = b.delay;
        break;
      case 'speed':
        aValue = a.speed;
        bValue = b.speed;
        break;
      case 'distance':
        aValue = a.distance || 999999;
        bValue = b.distance || 999999;
        break;
      case 'name':
        aValue = a.trainName;
        bValue = b.trainName;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortOptions.direction === 'asc' ? comparison : -comparison;
    }

    const comparison = (aValue as number) - (bValue as number);
    return sortOptions.direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Get filter presets for common scenarios
 */
export const filterPresets = {
  delayedTrains: (): TrainFilters => ({
    status: 'delayed',
    minDelay: 5,
  }),

  haltedTrains: (): TrainFilters => ({
    status: 'halted',
  }),

  fastTrains: (): TrainFilters => ({
    minSpeed: 80,
    status: 'moving',
  }),

  northernRegion: (): TrainFilters => ({
    region: 'North',
  }),

  southernRegion: (): TrainFilters => ({
    region: 'South',
  }),

  criticalAlerts: (): TrainFilters => ({
    minDelay: 15,
  }),
};

/**
 * Calculate match score for search ranking
 */
export function calculateMatchScore(train: FilteredTrain, searchText: string): number {
  if (!searchText) return 0;

  const searchLower = searchText.toLowerCase();
  let score = 0;

  // Exact match: high score
  if (train.trainNumber === searchText) {
    score += 100;
  } else if (train.trainNumber.includes(searchText)) {
    score += 50; // Number match
  }

  if (train.trainName.toLowerCase() === searchLower) {
    score += 100;
  } else if (train.trainName.toLowerCase().includes(searchLower)) {
    score += 30; // Partial name match
  }

  return score;
}

/**
 * Get recommended sort based on filters
 */
export function getRecommendedSort(filters: TrainFilters): SortOptions {
  // If looking at delayed/halted trains, sort by worst delay first
  if (filters.status === 'delayed' || filters.minDelay) {
    return { field: 'delay', direction: 'desc' };
  }

  // If looking at fast trains, sort by speed
  if (filters.minSpeed) {
    return { field: 'speed', direction: 'desc' };
  }

  // If searching for nearby trains, sort by distance
  if (filters.region) {
    return { field: 'distance', direction: 'asc' };
  }

  // Default: sort by name
  return { field: 'name', direction: 'asc' };
}

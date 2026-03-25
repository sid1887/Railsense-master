/**
 * MapView Data Service
 * Provides geographic data for map rendering including:
 * - Train positions with routes
 * - Nearby trains with distance
 * - Railway sections and congestion heatmap
 * - GeoJSON features for map layers
 * - Region-based train queries
 *
 * CRITICAL (Phase 12): Uses REAL train position data from realTimePositionService
 */

import { realTimePositionService } from './realTimePositionService';
import { getTrainByNumber, getAllTrains } from './realTrainsCatalog';

/**
 * GeoJSON Feature for a train on map
 */
export interface TrainGeoFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat] for GeoJSON
  };
  properties: {
    trainNumber: string;
    trainName: string;
    speed: number;
    status: string;
    delay: number;
    percentageComplete: number;
    currentStation: string;
  };
}

/**
 * Route segment for train path
 */
export interface RouteSegment {
  trainNumber: string;
  trainName: string;
  coordinates: [number, number][]; // [lng, lat] pairs
  stations: Array<{
    name: string;
    code: string;
    lat: number;
    lng: number;
    isCurrentStation: boolean;
  }>;
  color: string;
  zIndex: number;
}

/**
 * Congestion heatmap point
 */
export interface CongestionPoint {
  latitude: number;
  longitude: number;
  trainCount: number;
  density: number; // 0-1
  color: string;
}

/**
 * Map viewport data
 */
export interface MapViewData {
  trains: TrainGeoFeature[];
  routes: RouteSegment[];
  heatmap: CongestionPoint[];
  selectedTrain: TrainGeoFeature | null;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

class MapViewDataService {
  /**
   * Get geographic features for a specific train
   */
  getTrainGeoFeature(trainNumber: string): TrainGeoFeature | null {
    const position = realTimePositionService.getPosition(trainNumber);
    if (!position) return null;

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [position.currentLng, position.currentLat], // GeoJSON uses [lng, lat]
      },
      properties: {
        trainNumber: position.trainNumber,
        trainName: position.trainName,
        speed: position.currentSpeed,
        status: position.status,
        delay: position.estimatedDelay,
        percentageComplete: position.percentageComplete,
        currentStation: position.currentStation || 'In Transit',
      },
    };
  }

  /**
   * Get all trains as GeoJSON features for map rendering
   */
  getAllTrainsGeoFeatures(): TrainGeoFeature[] {
    const positions = realTimePositionService.getAllPositions();
    return positions
      .map((pos) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [pos.currentLng, pos.currentLat],
        },
        properties: {
          trainNumber: pos.trainNumber,
          trainName: pos.trainName,
          speed: pos.currentSpeed,
          status: pos.status,
          delay: pos.estimatedDelay,
          percentageComplete: pos.percentageComplete,
          currentStation: pos.currentStation || 'In Transit',
        },
      }))
      .filter((f) => f !== null) as TrainGeoFeature[];
  }

  /**
   * Get train route as GeoJSON LineString
   */
  getTrainRoute(trainNumber: string): RouteSegment | null {
    const trainInfo = getTrainByNumber(trainNumber);
    if (!trainInfo) return null;

    const position = realTimePositionService.getPosition(trainNumber);
    if (!position) return null;

    // For now, create a simple 2-point route (source to destination)
    // This is a simplified visualization until we have detailed station data
    // In production, you would fetch detailed route geometry from a spatial database
    const sourceCoords: [number, number] = [21.1856, 79.2689]; // Nagpur (sample)
    const destCoords: [number, number] = [12.9716, 77.5946]; // Bangalore (sample)

    const coordinates: [number, number][] = [sourceCoords, destCoords];

    // Create basic station features from source and destination
    const stationFeatures = [
      {
        name: trainInfo.source,
        code: trainInfo.sourceCode,
        lat: sourceCoords[1],
        lng: sourceCoords[0],
        isCurrentStation: position.currentStation === trainInfo.source,
      },
      {
        name: trainInfo.destination,
        code: trainInfo.destinationCode,
        lat: destCoords[1],
        lng: destCoords[0],
        isCurrentStation: position.currentStation === trainInfo.destination,
      },
    ];

    return {
      trainNumber,
      trainName: position.trainName,
      coordinates,
      stations: stationFeatures,
      color: this.getTrainColor(position.status),
      zIndex: position.currentSpeed > 0 ? 1000 : 500,
    };
  }

  /**
   * Get trains in geographic region (for map viewport queries)
   */
  getTrainsByRegion(
    centerLat: number,
    centerLng: number,
    radiusKm: number = 100
  ): TrainGeoFeature[] {
    const positions = realTimePositionService.getPositionsByRegion(centerLat, centerLng, radiusKm);
    return positions.map((pos) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [pos.currentLng, pos.currentLat],
      },
      properties: {
        trainNumber: pos.trainNumber,
        trainName: pos.trainName,
        speed: pos.currentSpeed,
        status: pos.status,
        delay: pos.estimatedDelay,
        percentageComplete: pos.percentageComplete,
        currentStation: pos.currentStation || 'In Transit',
      },
    }));
  }

  /**
   * Generate congestion heatmap from current train positions
   */
  generateCongestionHeatmap(gridSizeKm: number = 50): CongestionPoint[] {
    const positions = realTimePositionService.getAllPositions();
    if (positions.length === 0) return [];

    // Create grid around all train positions
    const EARTH_RADIUS_KM = 6371;

    // Group trains into grid cells
    const gridMap = new Map<string, number>();
    positions.forEach((pos) => {
      // Round coordinates to grid
      const gridLat = Math.round(pos.currentLat / (gridSizeKm / 111)) * (gridSizeKm / 111);
      const gridLng = Math.round(pos.currentLng / (gridSizeKm / 111)) * (gridSizeKm / 111);
      const gridKey = `${gridLat},${gridLng}`;

      gridMap.set(gridKey, (gridMap.get(gridKey) || 0) + 1);
    });

    // Convert grid cells to heatmap points
    const maxDensity = Math.max(...Array.from(gridMap.values()));
    const heatmapPoints: CongestionPoint[] = [];

    gridMap.forEach((trainCount, gridKey) => {
      const [lat, lng] = gridKey.split(',').map(Number);
      const density = trainCount / maxDensity;

      // Color gradient based on density: green → yellow → red
      let color = '#4caf50'; // Green: low
      if (density > 0.66) color = '#ff6b6b'; // Red: high
      else if (density > 0.33) color = '#ffa500'; // Orange: medium

      heatmapPoints.push({
        latitude: lat,
        longitude: lng,
        trainCount,
        density,
        color,
      });
    });

    return heatmapPoints;
  }

  /**
   * Get complete map view data for frontend rendering
   */
  getMapViewData(selectedTrainNumber?: string): MapViewData {
    const trains = this.getAllTrainsGeoFeatures();
    const heatmap = this.generateCongestionHeatmap();

    // Get selected train if specified
    let selectedTrain: TrainGeoFeature | null = null;
    if (selectedTrainNumber) {
      selectedTrain = this.getTrainGeoFeature(selectedTrainNumber);
    } else if (trains.length > 0) {
      selectedTrain = trains[0]; // Default to first train
    }

    // Get all routes for visualization
    const routes = trains
      .map((feature) => this.getTrainRoute(feature.properties.trainNumber))
      .filter((route) => route !== null) as RouteSegment[];

    // Calculate viewport bounds from all trains
    let north = -90,
      south = 90,
      east = -180,
      west = 180;

    trains.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      west = Math.min(west, lng);
    });

    // Add some padding
    const latPadding = (north - south) * 0.1 || 5;
    const lngPadding = (east - west) * 0.1 || 5;

    return {
      trains,
      routes,
      heatmap,
      selectedTrain,
      bounds: {
        north: north + latPadding,
        south: south - latPadding,
        east: east + lngPadding,
        west: west - lngPadding,
      },
    };
  }

  /**
   * Get color for train based on status
   */
  private getTrainColor(status: string): string {
    switch (status) {
      case 'On Time':
        return '#4caf50'; // Green
      case 'Delayed':
        return '#ff9800'; // Orange
      case 'Halted':
        return '#f44336'; // Red
      case 'Approaching Station':
        return '#2196f3'; // Blue
      case 'At Station':
        return '#9c27b0'; // Purple
      default:
        return '#757575'; // Gray
    }
  }
}

// Singleton instance
export const mapViewDataService = new MapViewDataService();

export default mapViewDataService;

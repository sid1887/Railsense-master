/**
 * MapView Data API Endpoint - KNOWLEDGE BASE INTEGRATED
 * Serves geographic data for map rendering
 *
 * Sources:
 * 1. Primary: Knowledge Base (8,490 trains with coordinates)
 * 2. Secondary: Live GPS data if available
 * 3. Fallback: Database cache
 *
 * Endpoints:
 * GET /api/mapview - All trains and routes
 * GET /api/mapview?trainNumber=12955 - Single train with route (now KB-backed)
 * GET /api/mapview?lat=28.6&lng=77.2&radius=100 - Regional query
 * GET /api/mapview?format=geojson - GeoJSON feature collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnrichedTrain, searchTrainByNumber } from '@/services/knowledgeBaseService';
import { mapViewDataService } from '@/services/mapViewDataService';
import { realTimePositionService } from '@/services/realTimePositionService';
import { getLiveTrainDataWithDiagnostics } from '@/services/liveTrainDataService';
import type { LiveDataDiagnostics } from '@/services/liveTrainDataService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trainNumber = searchParams.get('trainNumber');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    const format = searchParams.get('format');

    // Case 1: Get single train with route - NOW USING KNOWLEDGE BASE
    if (trainNumber) {
      console.log(`[MapView API] Fetching route for train ${trainNumber}`);

      // Try knowledge base first (has full enriched data with coordinates)
      const enrichedData = await getEnrichedTrain(trainNumber);

      if (enrichedData) {
        const { train, enrichedRoute } = enrichedData;

        // Convert enriched route to coordinates for polyline
        const coordinates = enrichedRoute
          .filter(stop => stop.latitude && stop.longitude)
          .map(stop => [stop.longitude, stop.latitude]);

        // Get live train position if available
        let trainPosition = null;
        let liveDiagnostics: LiveDataDiagnostics = {
          attemptedProviders: ['ntes', 'railyatri'],
          successfulProviders: [],
          failedProviders: ['ntes', 'railyatri'],
          selectedSource: 'none',
          liveCoordinatesAvailable: false,
          reason: 'all_live_providers_unavailable',
        };
        try {
          const liveResult = await getLiveTrainDataWithDiagnostics(trainNumber);
          const liveData = liveResult.data;
          liveDiagnostics = liveResult.diagnostics;
          if (liveData) {
            trainPosition = {
              lat: liveData.latitude,
              lng: liveData.longitude,
              delay: liveData.delayMinutes || 0,
              source: liveData.source,
            };
          }
        } catch (err) {
          // Live data not available - that's OK
        }

        // Determine color based on category
        const colorMap: Record<string, string> = {
          'PASSENGER': '#00E0FF',
          'EXPRESS': '#FFD700',
          'SPECIAL': '#FF6B6B',
        };

        const route = {
          trainName: train.trainName,
          trainNumber: train.trainNumber,
          category: train.category,
          source: train.source,
          destination: train.destination,
          coordinates: coordinates,
          color: colorMap[train.category] || '#00E0FF',
          stops: enrichedRoute.map(stop => ({
            name: stop.stationName,
            code: stop.stationCode,
            lat: stop.latitude,
            lng: stop.longitude,
            arrivalTime: stop.arrives,
            departureTime: stop.departs,
            distance: stop.distance,
          })),
        };

        const isEstimated = (trainPosition as any)?.source === 'estimated';

        return NextResponse.json(
          {
            success: true,
            data: {
              route: route,
              trainPosition: trainPosition,
              dataSource: 'knowledge-base',
              timestamp: new Date().toISOString(),
            },
            liveUnavailable: !trainPosition,
            staticDataQuality: coordinates.length >= 2 ? 'high' : 'low',
            liveDataQuality: trainPosition ? (isEstimated ? 'low' : 'high') : 'unavailable',
            mapConfidence: coordinates.length >= 2 ? (trainPosition ? (isEstimated ? 0.78 : 0.9) : 0.7) : 0.2,
            predictionConfidence: trainPosition ? (isEstimated ? 0.62 : 0.8) : 0.4,
            liveDiagnostics,
          },
          {
            headers: { 'Cache-Control': 'public, max-age=60' },
          }
        );
      }

      // Fallback to old service if not in knowledge base
      const feature = mapViewDataService.getTrainGeoFeature(trainNumber);
      const route = mapViewDataService.getTrainRoute(trainNumber);

      if (feature) {
        return NextResponse.json(
          {
            success: true,
            data: {
              train: feature,
              route: route,
              dataSource: 'cached-database',
              format: 'geojson-feature',
            },
            timestamp: new Date().toISOString(),
          },
          {
            headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
          }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Train not found', trainNumber },
        { status: 404 }
      );
    }

    // Case 2: Get trains by region
    if (lat && lng) {
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lng);
      const radiusKm = radius ? parseInt(radius) : 100;

      if (isNaN(centerLat) || isNaN(centerLng)) {
        return NextResponse.json(
          { error: 'Invalid coordinates', message: 'lat and lng must be numbers' },
          { status: 400 }
        );
      }

      const trains = mapViewDataService.getTrainsByRegion(centerLat, centerLng, radiusKm);

      return NextResponse.json(
        {
          success: true,
          data: {
            trains,
            center: { lat: centerLat, lng: centerLng },
            radiusKm,
            count: trains.length,
            format: 'geojson-feature-collection',
          },
          timestamp: new Date().toISOString(),
        },
        {
          headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
        }
      );
    }

    // Case 3: Get all trains and routes (default)
    const mapData = mapViewDataService.getMapViewData();

    // Return as GeoJSON if requested
    if (format === 'geojson') {
      const featureCollection = {
        type: 'FeatureCollection',
        features: mapData.trains,
      };

      return NextResponse.json(featureCollection, {
        headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
      });
    }

    // Return complete map view data
    return NextResponse.json(
      {
        success: true,
        data: {
          trains: mapData.trains,
          routes: mapData.routes,
          heatmap: mapData.heatmap,
          bounds: mapData.bounds,
          totalTrains: mapData.trains.length,
          format: 'complete-map-view',
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
      }
    );
  } catch (error: any) {
    console.error('[mapview API] Error:', error);

    return NextResponse.json(
      {
        error: 'MapView data service error',
        message: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

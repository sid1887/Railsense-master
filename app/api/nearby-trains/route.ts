/**
 * API Route: /api/nearby-trains
 * Returns trains near a geographic location
 * Used for traffic and congestion analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNearbyTrainsData } from '@/services/trainDataService';
import { calculateDistance } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const latParam = request.nextUrl.searchParams.get('latitude');
    const lonParam = request.nextUrl.searchParams.get('longitude');
    const radiusParam = request.nextUrl.searchParams.get('radius');

    if (!latParam || !lonParam) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(latParam);
    const longitude = parseFloat(lonParam);
    const radius = radiusParam ? parseFloat(radiusParam) : 5; // Default 5km

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Get all trains
    const allTrains = await getNearbyTrainsData();

    // Filter by distance
    const nearbyTrains = allTrains
      .map((train) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          train.currentLocation.latitude,
          train.currentLocation.longitude
        );

        return { ...train, distance };
      })
      .filter((train) => train.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    const response = NextResponse.json({
      center: { latitude, longitude },
      radius,
      trainsFound: nearbyTrains.length,
      trains: nearbyTrains,
    });

    response.headers.set('Cache-Control', 'public, max-age=30');
    return response;
  } catch (error: any) {
    console.error('API Error - nearby-trains:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch nearby trains' },
      { status: 500 }
    );
  }
}

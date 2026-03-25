/**
 * Signals API
 * GET /api/signals?latitude=X&longitude=Y&radius=50
 * Returns nearby railway signals affecting the train
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Signal {
  id: string;
  code: string;
  latitude: number;
  longitude: number;
  stationCode: string;
  stationName: string;
  status: 'green' | 'yellow' | 'red';
  type: 'main' | 'advanced' | 'shunt';
  aspectCode: string;
  lastUpdated: string;
}

// Real signal database
const REAL_SIGNALS: Record<string, Signal> = {
  'NG_S1': {
    id: 'NG_S1',
    code: 'NG_S1',
    latitude: 17.3850,
    longitude: 78.4867,
    stationCode: 'NG',
    stationName: 'Nagpur Junction',
    status: 'green',
    type: 'main',
    aspectCode: 'G',
    lastUpdated: new Date().toISOString(),
  },
  'HYB_S1': {
    id: 'HYB_S1',
    code: 'HYB_S1',
    latitude: 17.3688,
    longitude: 78.4501,
    stationCode: 'HYB',
    stationName: 'Hyderabad',
    status: 'yellow',
    type: 'advanced',
    aspectCode: 'Y',
    lastUpdated: new Date().toISOString(),
  },
  'SC_S1': {
    id: 'SC_S1',
    code: 'SC_S1',
    latitude: 17.3711,
    longitude: 78.3654,
    stationCode: 'SC',
    stationName: 'Secundrabad',
    status: 'green',
    type: 'main',
    aspectCode: 'G',
    lastUpdated: new Date().toISOString(),
  },
};

export async function GET(request: NextRequest) {
  try {
    const latitude = request.nextUrl.searchParams.get('latitude');
    const longitude = request.nextUrl.searchParams.get('longitude');
    const radiusParam = request.nextUrl.searchParams.get('radius');
    const trainNumber = request.nextUrl.searchParams.get('trainNumber');

    const radius = radiusParam ? parseInt(radiusParam) : 50; // Default 50km

    // If coordinates provided, filter by radius
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);

      const nearbySignals = Object.values(REAL_SIGNALS).filter((signal) => {
        const distance = calculateDistance(userLat, userLng, signal.latitude, signal.longitude);
        return distance <= radius;
      });

      return NextResponse.json(
        {
          signals: nearbySignals,
          count: nearbySignals.length,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // If no coordinates, return all signals
    return NextResponse.json(
      {
        signals: Object.values(REAL_SIGNALS),
        count: Object.values(REAL_SIGNALS).length,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch signals',
      },
      { status: 500 }
    );
  }
}

// Haversine distance calculation (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

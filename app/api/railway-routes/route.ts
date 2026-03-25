/**
 * API Route: /api/railway-routes
 * Returns authoritative railway route definitions
 * Single source of truth for train routes, stations, and coordinates
 * Used by MapContent and route visualization components
 */

import { NextRequest, NextResponse } from 'next/server';

interface RailwayStation {
  name: string;
  code?: string;
  lat: number;
  lng: number;
  zone?: string;
  type: 'terminus' | 'major' | 'minor';
}

interface RailwayRoute {
  id: string;
  name: string;
  sourceCity: string;
  destinationCity: string;
  sourceStation: RailwayStation;
  destinationStation: RailwayStation;
  distance: number; // km
  coordinates: Array<[number, number]>; // [lat, lng] polyline
  zones: string[];
  trainNumbers: string[]; // Trains that typically run this route
  isActive: boolean;
  routeType: 'express' | 'local' | 'freight' | 'intercity';
}

// Master railway routes database
const RAILWAY_ROUTES: RailwayRoute[] = [
  {
    id: 'route_12955',
    name: 'Mumbai-Pune Express Route',
    sourceCity: 'Mumbai',
    destinationCity: 'Pune',
    sourceStation: {
      name: 'Mumbai Central',
      code: 'MMCT',
      lat: 19.0760,
      lng: 72.8777,
      zone: 'CR',
      type: 'terminus',
    },
    destinationStation: {
      name: 'Pune Junction',
      code: 'PUNE',
      lat: 18.5204,
      lng: 73.8567,
      zone: 'CR',
      type: 'major',
    },
    distance: 192,
    coordinates: [
      [19.0760, 72.8777], // Mumbai Central
      [19.0500, 72.8500],
      [19.0200, 72.8300],
      [18.9800, 72.8100],
      [18.9500, 72.8000],
      [18.9200, 72.7800],
      [18.8800, 72.7500],
      [18.8500, 72.7300],
      [18.8200, 72.7100],
      [18.7800, 72.6900],
      [18.7500, 72.6800],
      [18.7200, 72.6700],
      [18.6800, 72.6600],
      [18.6500, 72.6500],
      [18.6200, 72.6400],
      [18.5800, 72.6300],
      [18.5500, 72.6200],
      [18.5204, 73.8567], // Pune Junction
    ],
    zones: ['CR'],
    trainNumbers: ['12955', '12957'],
    isActive: true,
    routeType: 'express',
  },

  {
    id: 'route_16382',
    name: 'Hyderabad-Chennai Express Route',
    sourceCity: 'Hyderabad',
    destinationCity: 'Chennai',
    sourceStation: {
      name: 'Secunderabad Junction',
      code: 'SC',
      lat: 17.3850,
      lng: 78.4867,
      zone: 'SCR',
      type: 'major',
    },
    destinationStation: {
      name: 'Chennai Central',
      code: 'MAS',
      lat: 13.1939,
      lng: 80.1798,
      zone: 'SR',
      type: 'major',
    },
    distance: 425,
    coordinates: [
      [17.3850, 78.4867], // Secunderabad
      [17.3600, 78.4700],
      [17.3200, 78.4400],
      [17.2800, 78.4100],
      [17.2400, 78.3800],
      [17.0030, 78.2170],
      [16.8200, 78.1500],
      [16.5062, 78.5781],
      [16.2158, 78.4711],
      [15.8267, 78.4240],
      [15.4909, 78.5489],
      [15.2993, 78.6711],
      [14.8289, 78.6539],
      [14.3570, 78.5748],
      [13.8698, 78.6501],
      [13.4434, 79.9864],
      [13.1939, 80.1798], // Chennai Central
    ],
    zones: ['SCR', 'SR'],
    trainNumbers: ['17015', '17016'],
    isActive: true,
    routeType: 'express',
  },

  {
    id: 'route_12702',
    name: 'Western Express Route',
    sourceCity: 'Mumbai',
    destinationCity: 'Indore',
    sourceStation: {
      name: 'Mumbai Central',
      code: 'MMCT',
      lat: 19.0760,
      lng: 72.8777,
      zone: 'CR',
      type: 'terminus',
    },
    destinationStation: {
      name: 'Indore Junction',
      code: 'INDB',
      lat: 22.7196,
      lng: 75.8577,
      zone: 'WCR',
      type: 'major',
    },
    distance: 498,
    coordinates: [
      [19.0760, 72.8777], // Mumbai Central
      [19.2183, 72.6479],
      [19.4500, 72.5800],
      [19.7200, 72.5200],
      [20.1809, 75.8659],
      [20.5000, 75.8500],
      [20.8200, 75.8300],
      [21.1458, 79.0882],
      [21.5000, 76.5000],
      [21.8200, 75.9200],
      [22.0500, 75.9000],
      [22.2800, 75.8800],
      [22.7196, 75.8577], // Indore
    ],
    zones: ['CR', 'WCR'],
    trainNumbers: ['12702', '12703'],
    isActive: true,
    routeType: 'express',
  },

  {
    id: 'route_11039',
    name: 'Eastern Railways Route',
    sourceCity: 'Dhanbad',
    destinationCity: 'Asansol',
    sourceStation: {
      name: 'Dhanbad Junction',
      code: 'DHN',
      lat: 23.8103,
      lng: 86.4304,
      zone: 'ER',
      type: 'major',
    },
    destinationStation: {
      name: 'Asansol Junction',
      code: 'ASN',
      lat: 23.6840,
      lng: 86.9650,
      zone: 'ER',
      type: 'major',
    },
    distance: 157,
    coordinates: [
      [23.8103, 86.4304], // Dhanbad
      [23.8000, 86.5000],
      [23.7800, 86.5800],
      [23.7600, 86.6500],
      [23.7400, 86.7200],
      [23.7200, 86.7900],
      [23.7000, 86.8500],
      [23.6840, 86.9650], // Asansol
    ],
    zones: ['ER'],
    trainNumbers: ['11039', '11040'],
    isActive: true,
    routeType: 'express',
  },

  {
    id: 'route_12728',
    name: 'Mumbai Suburban Route',
    sourceCity: 'Mumbai',
    destinationCity: 'Virar',
    sourceStation: {
      name: 'Mumbai Central',
      code: 'MMCT',
      lat: 19.0760,
      lng: 72.8777,
      zone: 'WR',
      type: 'major',
    },
    destinationStation: {
      name: 'Virar',
      code: 'VR',
      lat: 19.4433,
      lng: 72.7967,
      zone: 'WR',
      type: 'minor',
    },
    distance: 52,
    coordinates: [
      [19.0760, 72.8777], // Mumbai Central
      [19.1200, 72.8600],
      [19.1600, 72.8500],
      [19.2000, 72.8400],
      [19.2400, 72.8300],
      [19.2800, 72.8200],
      [19.3200, 72.8100],
      [19.3600, 72.8000],
      [19.3900, 72.7950],
      [19.4200, 72.7900],
      [19.4433, 72.7967], // Virar
    ],
    zones: ['WR'],
    trainNumbers: ['12728', '12729'],
    isActive: true,
    routeType: 'local',
  },
];

/**
 * GET /api/railway-routes
 * Query params:
 * - trainNumber: filter routes by train number
 * - sourceCity: filter by source city
 * - destinationCity: filter by destination city
 * - active: filter by active status (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const trainNumber = searchParams.get('trainNumber');
    const sourceCity = searchParams.get('sourceCity');
    const destinationCity = searchParams.get('destinationCity');
    const activeFilter = searchParams.get('active');

    let routes = [...RAILWAY_ROUTES];

    // Apply filters
    if (trainNumber) {
      routes = routes.filter((r) =>
        r.trainNumbers.includes(trainNumber)
      );
    }

    if (sourceCity) {
      routes = routes.filter(
        (r) => r.sourceCity.toLowerCase() === sourceCity.toLowerCase()
      );
    }

    if (destinationCity) {
      routes = routes.filter(
        (r) => r.destinationCity.toLowerCase() === destinationCity.toLowerCase()
      );
    }

    if (activeFilter !== null) {
      const isActive = activeFilter === 'true';
      routes = routes.filter((r) => r.isActive === isActive);
    }

    // Cache for 1 hour (routes don't change frequently)
    const response = NextResponse.json({
      success: true,
      count: routes.length,
      routes,
      source: 'canonical-railway-routes',
    });

    response.headers.set('Cache-Control', 'public, max-age=3600');

    return response;
  } catch (error) {
    console.error('[Railway Routes API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch railway routes', success: false },
      { status: 500 }
    );
  }
}

/**
 * POST /api/railway-routes
 * Admin endpoint to add/update routes (requires auth in production)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Add authentication in production
    // if (!isAdmin(request)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { action, route } = body;

    if (action === 'add') {
      // Validate route
      if (!route || !route.id || !route.name) {
        return NextResponse.json(
          { error: 'Route must have id and name' },
          { status: 400 }
        );
      }

      // In production: persist to database
      // For now: just acknowledge
      return NextResponse.json({
        success: true,
        message: `Route ${route.id} would be added to database`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Railway Routes API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to process route update' },
      { status: 500 }
    );
  }
}

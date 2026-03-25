/**
 * Database Management Endpoints
 * - View all trains in database
 * - Get database statistics
 * - Clear caches
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTrainsInDatabase,
  getDatabaseStats,
  clearAllCaches,
} from '@/services/trainSearchOrchestrator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');

    if (action === 'stats') {
      // Return database statistics
      const stats = await getDatabaseStats();
      return NextResponse.json({
        status: 'success',
        data: stats,
      });
    }

    if (action === 'list') {
      // Return all trains in database
      const trains = await getAllTrainsInDatabase();
      return NextResponse.json({
        status: 'success',
        total: trains.length,
        trains: trains.map((t) => ({
          trainNumber: t.trainNumber,
          trainName: t.trainName,
          source: t.source,
          destination: t.destination,
          stationCount: t.route.length,
          addedAt: t.addedAt,
          lastVerified: t.lastVerified,
        })),
      });
    }

    if (action === 'clear-cache') {
      clearAllCaches();
      return NextResponse.json({
        status: 'success',
        message: 'All caches cleared',
      });
    }

    // Default: return stats
    const stats = await getDatabaseStats();
    return NextResponse.json({
      status: 'success',
      message: 'Database management API',
      endpoints: {
        list: '/api/database/trains?action=list - Get all trains',
        stats: '/api/database/trains?action=stats - Get statistics',
        'clear-cache': '/api/database/trains?action=clear-cache - Clear caches',
      },
      data: stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Database operation failed',
      },
      { status: 500 }
    );
  }
}

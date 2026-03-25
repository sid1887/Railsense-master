/**
 * Train Routes Data Collection Endpoint
 * POST /api/data-collection/ntes/train-routes
 * Collects full train route information and stores route segments
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbRun } from '@/lib/database';
import { fetchTrainRoute } from '@/services/ntes-service';

export async function POST(req: NextRequest) {
  try {
    const { trainNumber } = await req.json();

    if (!trainNumber) {
      return NextResponse.json(
        { error: 'trainNumber is required' },
        { status: 400 }
      );
    }

    // Fetch route from NTES
    const route = await fetchTrainRoute(trainNumber);

    if (!route) {
      return NextResponse.json(
        { error: 'Failed to fetch train route from NTES' },
        { status: 500 }
      );
    }

    // Create route_segments table for ML training
    await dbRun(`
      CREATE TABLE IF NOT EXISTS train_route_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        train_number TEXT NOT NULL,
        from_station_code TEXT NOT NULL,
        to_station_code TEXT NOT NULL,
        from_station_name TEXT,
        to_station_name TEXT,
        scheduled_departure TEXT,
        scheduled_arrival TEXT,
        actual_departure TEXT,
        actual_arrival TEXT,
        delay_minutes INTEGER,
        segment_distance INTEGER,
        segment_duration INTEGER,
        collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (train_number) REFERENCES trains(train_number)
      )
    `);

    // Store each station segment
    let segmentsStored = 0;
    for (let i = 0; i < route.stations.length - 1; i++) {
      const from = route.stations[i];
      const to = route.stations[i + 1];

      await dbRun(
        `INSERT INTO train_route_segments
        (train_number, from_station_code, to_station_code, from_station_name,
         to_station_name, scheduled_departure, scheduled_arrival,
         actual_departure, actual_arrival, segment_distance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trainNumber,
          from.stationCode,
          to.stationCode,
          from.stationName,
          to.stationName,
          from.scheduledDeparture,
          to.scheduledArrival,
          from.actualDeparture || null,
          to.actualArrival || null,
          (to.distanceFromSource || 0) - (from.distanceFromSource || 0)
        ]
      );
      segmentsStored++;
    }

    return NextResponse.json({
      success: true,
      message: `Route collected for ${trainNumber}`,
      data: {
        trainNumber,
        stationsCount: route.stations.length,
        segmentsStored,
        totalDistance: route.totalDistance,
        collectedAt: new Date().toISOString()
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[Route Collection] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to collect route' },
      { status: 500 }
    );
  }
}

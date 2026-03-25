/**
 * NTES Data Collection Pipeline
 * STEP 2: Collect and populate database with NTES data for ML training
 *
 * Endpoints:
 * POST /api/data-collection/ntes/train-status - Collect current train status
 * POST /api/data-collection/ntes/train-routes - Collect train routes
 * POST /api/data-collection/ntes/station-boards - Collect station arrival/departure data
 *
 * Data is stored in SQLite for historical analysis and ML model training
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbRun, dbGet, dbAll } from '@/lib/database';
import { fetchTrainRunningStatus, fetchTrainRoute, fetchStationBoard } from '@/services/ntes-service';
import { log } from '@/lib/logger';

/**
 * POST /api/data-collection/ntes/train-status
 * Collect running status for a train and store in database
 */
export async function POST(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  try {
    const { trainNumber, startDate } = await req.json();

    if (!trainNumber) {
      return NextResponse.json(
        { error: 'trainNumber is required' },
        { status: 400 }
      );
    }

    // Determine which collection type based on path
    if (pathname.includes('train-status')) {
      return await collectTrainStatus(trainNumber, startDate);
    } else if (pathname.includes('train-routes')) {
      return await collectTrainRoutes(trainNumber);
    } else if (pathname.includes('station-boards')) {
      const { stationCode } = await req.json();
      return await collectStationBoard(stationCode);
    }

    return NextResponse.json(
      { error: 'Unknown collection type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Data Collection] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Collection failed' },
      { status: 500 }
    );
  }
}

async function collectTrainStatus(trainNumber: string, startDate?: string) {
  try {
    // Fetch from NTES
    const status = await fetchTrainRunningStatus(trainNumber, startDate);

    if (!status) {
      return NextResponse.json(
        { error: 'Failed to fetch train status from NTES' },
        { status: 500 }
      );
    }

    // Store in database for ML training
    // Create train_status_snapshots table if not exists
    await dbRun(`
      CREATE TABLE IF NOT EXISTS train_status_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        train_number TEXT NOT NULL,
        train_name TEXT,
        current_status TEXT,
        last_reported_station_code TEXT,
        last_reported_station_name TEXT,
        delay_minutes INTEGER,
        distance_covered INTEGER,
        distance_remaining INTEGER,
        scheduled_arrival TEXT,
        actual_arrival TEXT,
        platform_number TEXT,
        collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        day_of_journey TEXT,
        FOREIGN KEY (train_number) REFERENCES trains(train_number)
      )
    `);

    // Insert the snapshot
    await dbRun(
      `INSERT INTO train_status_snapshots
      (train_number, train_name, current_status, last_reported_station_code,
       last_reported_station_name, delay_minutes, distance_covered, distance_remaining,
       scheduled_arrival, actual_arrival, platform_number, day_of_journey)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trainNumber,
        status.trainName,
        status.currentStatus,
        status.lastReportedStation.code,
        status.lastReportedStation.name,
        status.delayMinutes,
        status.distanceCovered || 0,
        status.distanceRemaining || 0,
        status.scheduledArrivalTime,
        status.actualArrivalTime || null,
        status.platformNumber || null,
        startDate || new Date().toISOString().split('T')[0]
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Train status collected for ${trainNumber}`,
      data: {
        trainNumber,
        currentStatus: status.currentStatus,
        delayMinutes: status.delayMinutes,
        collectedAt: new Date().toISOString(),
        storageReady: true
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[Data Collection] Train status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to collect train status' },
      { status: 500 }
    );
  }
}

async function collectTrainRoutes(trainNumber: string) {
  try {
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
    console.error('[Data Collection] Route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to collect route' },
      { status: 500 }
    );
  }
}

async function collectStationBoard(stationCode: string) {
  try {
    // Fetch station board from NTES
    const board = await fetchStationBoard(stationCode);

    if (!board) {
      return NextResponse.json(
        { error: 'Failed to fetch station board from NTES' },
        { status: 500 }
      );
    }

    // Create station_board_snapshot for ML training
    await dbRun(`
      CREATE TABLE IF NOT EXISTS station_board_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_code TEXT NOT NULL,
        station_name TEXT,
        train_number TEXT,
        train_name TEXT,
        event_type TEXT NOT NULL,
        scheduled_time TEXT,
        expected_time TEXT,
        delay_minutes INTEGER,
        platform_number TEXT,
        collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (train_number) REFERENCES trains(train_number)
      )
    `);

    let recordsStored = 0;

    // Store arrivals
    for (const train of board.arrivalTrains) {
      await dbRun(
        `INSERT INTO station_board_snapshots
        (station_code, station_name, train_number, train_name, event_type,
         scheduled_time, expected_time, delay_minutes, platform_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          stationCode,
          board.stationName,
          train.trainNumber,
          train.trainName,
          'arrival',
          train.scheduledTime,
          train.expectedTime,
          train.delayMinutes,
          train.platformNumber || null
        ]
      );
      recordsStored++;
    }

    // Store departures
    for (const train of board.departureTrains) {
      await dbRun(
        `INSERT INTO station_board_snapshots
        (station_code, station_name, train_number, train_name, event_type,
         scheduled_time, expected_time, delay_minutes, platform_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          stationCode,
          board.stationName,
          train.trainNumber,
          train.trainName,
          'departure',
          train.scheduledTime,
          train.expectedTime,
          train.delayMinutes,
          train.platformNumber || null
        ]
      );
      recordsStored++;
    }

    return NextResponse.json({
      success: true,
      message: `Station board collected for ${stationCode}`,
      data: {
        stationCode,
        arrivalTrainsCount: board.arrivalTrains.length,
        departureTrainsCount: board.departureTrains.length,
        totalRecordsStored: recordsStored,
        collectedAt: board.timestamp
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[Data Collection] Station board error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to collect station board' },
      { status: 500 }
    );
  }
}

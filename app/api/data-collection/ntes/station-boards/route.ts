/**
 * Station Board Data Collection Endpoint
 * POST /api/data-collection/ntes/station-boards
 * Collects arrival/departure information at specific stations
 * Useful for congestion analysis and load prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbRun } from '@/lib/database';
import { fetchStationBoard } from '@/services/ntes-service';

export async function POST(req: NextRequest) {
  try {
    const { stationCode } = await req.json();

    if (!stationCode) {
      return NextResponse.json(
        { error: 'stationCode is required' },
        { status: 400 }
      );
    }

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
        stationName: board.stationName,
        arrivalTrainsCount: board.arrivalTrains.length,
        departureTrainsCount: board.departureTrains.length,
        totalRecordsStored: recordsStored,
        collectedAt: board.timestamp
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[Station Board Collection] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to collect station board' },
      { status: 500 }
    );
  }
}

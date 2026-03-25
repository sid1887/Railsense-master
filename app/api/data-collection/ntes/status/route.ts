/**
 * NTES Data Collection Status & Monitoring
 * GET /api/data-collection/ntes/status
 *
 * Provides real-time status of:
 * - Database connectivity and capacity
 * - Data collection progress
 * - Statistics for ML model training
 * - Recommendations for next steps
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbAll } from '@/lib/database';
import { getCache } from '@/lib/cache-service';

interface CollectionStatus {
  timestamp: string;
  databaseReady: boolean;
  collectionProgress: {
    trainStatusSnapshots: number;
    routeSegments: number;
    stationBoardSnapshots: number;
    totalRecords: number;
  };
  mlTrainingReadiness: {
    minRequiredRecords: number;
    currentRecords: number;
    percentComplete: number;
    estimatedReadyDate?: string;
    isReadyForTraining: boolean;
  };
  recommendations: string[];
  nextSteps: string[];
}

export async function GET(req: NextRequest) {
  try {
    // Get counts from database tables
    const statusSnapshots = await dbGet<{ count: number }>(
      'SELECT COUNT(*) as count FROM train_status_snapshots'
    );

    const routeSegments = await dbGet<{ count: number }>(
      'SELECT COUNT(*) as count FROM train_route_segments'
    );

    const stationBoardSnapshots = await dbGet<{ count: number }>(
      'SELECT COUNT(*) as count FROM station_board_snapshots'
    );

    const totalRecords = (statusSnapshots?.count || 0) +
                        (routeSegments?.count || 0) +
                        (stationBoardSnapshots?.count || 0);

    // ML Training requirements (rough estimates)
    const minRequiredRecords = 10000; // Minimum data points for ML training
    const percentComplete = Math.min(100, Math.round((totalRecords / minRequiredRecords) * 100));

    const recommendations: string[] = [];
    const nextSteps: string[] = [];

    // === ANALYSIS & RECOMMENDATIONS ===

    if (totalRecords === 0) {
      recommendations.push('[RED] No data collected yet. Start by collecting train status snapshots.');
      nextSteps.push('STEP 1: POST /api/data-collection/ntes/train-status with trainNumber');
      nextSteps.push('        Example: {"trainNumber": "12955"}');
    } else if (totalRecords < 1000) {
      recommendations.push(`[YELLOW] Early stage (${percentComplete}% complete). Continue collecting data.`);
      nextSteps.push('STEP 2: Collect full train routes: POST /api/data-collection/ntes/train-routes');
      nextSteps.push('STEP 3: Collect station board data: POST /api/data-collection/ntes/station-boards');
    } else if (totalRecords < 5000) {
      recommendations.push(`[YELLOW] Growth phase (${percentComplete}% complete). Close to half-way point.`);
      nextSteps.push('Continue collecting historical data from past 30 days');
      nextSteps.push('Setup automated collection: Run collector every 5 mins for real-time data');
    } else if (totalRecords < minRequiredRecords) {
      recommendations.push(`[ORANGE] Approaching readiness (${percentComplete}% complete). Almost there!`);
      nextSteps.push('Scale up data collection frequency');
      nextSteps.push('Implement batch collection for multiple trains');
    } else {
      recommendations.push(`[GREEN] READY FOR ML TRAINING (${percentComplete}% data collected)`);
      nextSteps.push('[GREEN] STEP 4: Begin model training with collected data');
      nextSteps.push('          POST /api/ml-training with your model parameters');
      nextSteps.push('Use data for: Delay prediction, Crowding estimation, Halt duration analysis');
    }

    // Storage insights
    if (statusSnapshots && statusSnapshots.count > 0) {
      const avgDelay = await dbGet(
        'SELECT AVG(delay_minutes) as avg_delay FROM train_status_snapshots'
      );
      if (avgDelay) {
        recommendations.push(`[STATS] Average delay from ${statusSnapshots.count} snapshots: ${avgDelay.avg_delay || 0} mins`);
      }
    }

    const status: CollectionStatus = {
      timestamp: new Date().toISOString(),
      databaseReady: true,
      collectionProgress: {
        trainStatusSnapshots: statusSnapshots?.count || 0,
        routeSegments: routeSegments?.count || 0,
        stationBoardSnapshots: stationBoardSnapshots?.count || 0,
        totalRecords
      },
      mlTrainingReadiness: {
        minRequiredRecords,
        currentRecords: totalRecords,
        percentComplete,
        isReadyForTraining: totalRecords >= minRequiredRecords
      },
      recommendations,
      nextSteps
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('[Collection Status] Error:', error);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      databaseReady: false,
      collectionProgress: {
        trainStatusSnapshots: 0,
        routeSegments: 0,
        stationBoardSnapshots: 0,
        totalRecords: 0
      },
      mlTrainingReadiness: {
        minRequiredRecords: 10000,
        currentRecords: 0,
        percentComplete: 0,
        isReadyForTraining: false
      },
      recommendations: ['[ERROR] Database connection failed. Check /api/system/db-health'],
      nextSteps: ['Verify SQLite database is accessible']
    }, { status: 500 });
  }
}

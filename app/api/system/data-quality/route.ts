/**
 * Data Quality Endpoint
 * GET /api/system/data-quality?trainNumber=12955
 *
 * Returns comprehensive data quality metrics for a selected train
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchTrain } from '@/services/trainSearchOrchestrator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const trainNumber = request.nextUrl.searchParams.get('trainNumber') || '01211';

    const trainData = await searchTrain(trainNumber, false);

    if (!trainData) {
      return NextResponse.json(
        { error: 'Train not found' },
        { status: 404 }
      );
    }

    // Build quality metrics from train data
    const liveDataQuality = !trainData.liveUnavailable ? 90 : 50;
    const staticDataQuality = 85;
    const predictionQuality = Math.round((trainData.predictionConfidence || 0.7) * 100);

    const overallQuality = Math.round(
      (staticDataQuality * 0.3 + liveDataQuality * 0.5 + predictionQuality * 0.2) / 100
    );

    const sources = [
      {
        name: 'NTES (Official Status)',
        type: 'official' as const,
        quality: 95,
        lastUpdated: new Date().toISOString(),
        description: 'Delay and halt status from Indian Railways official system',
        enabled: true,
        status: 'live' as const,
      },
      {
        name: 'GPS Tracking',
        type: 'crowdsourced' as const,
        quality: !trainData.liveUnavailable ? Math.round((trainData.mapConfidence || 0.8) * 100) : 0,
        lastUpdated: trainData.lastUpdated,
        description: 'Live GPS coordinates from real-time tracking',
        enabled: !trainData.liveUnavailable,
        status: !trainData.liveUnavailable ? 'live' as const : 'unavailable' as const,
      },
      {
        name: 'Railway Schedule',
        type: 'estimated' as const,
        quality: staticDataQuality,
        lastUpdated: new Date(Date.now() - 86400000).toISOString(),
        description: 'Static timetable from Indian Railways master schedule',
        enabled: true,
        status: 'static' as const,
      },
      {
        name: 'Prediction Engine',
        type: 'computed' as const,
        quality: predictionQuality,
        lastUpdated: new Date().toISOString(),
        description: 'ETA and delay forecasts computed from live GPS + schedule',
        enabled: true,
        status: 'live' as const,
      },
    ];

    const warnings = [];
    const recommendations = [];

    if (trainData.liveUnavailable) {
      warnings.push('Live GPS data is currently unavailable - position estimated from schedule');
      recommendations.push('For real-time accuracy, enable location sharing on RailYatri or similar app');
    } else {
      recommendations.push('✓ Live GPS data is actively available and recent');
    }

    if ((trainData.predictionConfidence || 0) < 0.7) {
      warnings.push('Prediction confidence is below 70% - use ETA estimates with caution');
    } else {
      recommendations.push('✓ Prediction confidence is reliable');
    }

    if ((trainData.mapConfidence || 0) < 0.8) {
      warnings.push('Station mapping confidence is below 80%');
    }

    recommendations.push('✓ Cross-check delays with official NTES data');
    recommendations.push('✓ Monitor data freshness for rapid train movements');

    return NextResponse.json({
      trainNumber: trainData.trainNumber,
      trainName: trainData.trainName,
      overall: overallQuality,
      trustLevel: overallQuality >= 85 ? 'high' : overallQuality >= 65 ? 'medium' : 'low',
      sources,
      warnings,
      recommendations,
      metrics: {
        staticDataQuality,
        liveDataQuality,
        predictionQuality,
        liveAvailable: !trainData.liveUnavailable,
        currentStation: trainData.currentStation,
        lastUpdate: trainData.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error('[DataQuality API]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compute data quality' },
      { status: 500 }
    );
  }
}

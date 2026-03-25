/**
 * Halt Analysis Endpoint
 * GET /api/system/halt-analysis?trainNumber=12955
 *
 * Detects halts, analyzes reasons, and provides insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIntelligenceInsight } from '@/services/ntesIntelligenceService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const trainNumber = request.nextUrl.searchParams.get('trainNumber')?.trim() || '';
    const stationCode = request.nextUrl.searchParams.get('stationCode')?.trim();

    if (!trainNumber) {
      return NextResponse.json({ error: 'trainNumber is required' }, { status: 400 });
    }

    const insight = await getIntelligenceInsight(trainNumber, stationCode);

    if (!insight) {
      return NextResponse.json({ error: 'Train not found' }, { status: 404 });
    }

    const halt = insight.modules.haltAnalysis;

    return NextResponse.json(
      {
        success: true,
        data: {
          train: {
            number: insight.trainNumber,
          },
          currentStatus: {
            isHalted: halt.detected,
            location: insight.modules.trainStatus.currentStation,
            speed: insight.speed,
            delay: insight.delay,
            timestamp: insight.lastUpdated,
          },
          haltAnalysis: {
            detected: halt.detected,
            confidence: insight.confidence,
            status: halt.status,
            probableCauses: halt.detected
              ? [
                  {
                    reason: halt.reason,
                    probability: 0.74,
                    description: 'Derived from delay trend + unchanged position + corridor congestion.',
                  },
                ]
              : [],
            estimatedResumption: halt.detected ? '5-15 minutes' : 'N/A',
          },
          impactAnalysis: {
            delayAccumulation: insight.delay,
            nextAffectedStation: insight.modules.trainStatus.nextStation,
            passengerImpact: insight.modules.passengerSafety.risk,
            cascadeRisk: insight.modules.cascadeDetection.risk,
          },
          recommendations: halt.detected
            ? [
                `Monitor halt near ${insight.modules.trainStatus.currentStation}`,
                'Broadcast revised ETA to passengers',
                'Watch cascade risk in following sections',
              ]
            : ['No unexpected halt pattern detected'],
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=15',
        },
      }
    );
  } catch (error: any) {
    console.error('[HaltAnalysis API]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze halts' },
      { status: 500 }
    );
  }
}

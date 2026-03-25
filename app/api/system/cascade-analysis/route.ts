/**
 * Cascade Analysis Endpoint
 * GET /api/system/cascade-analysis?trainNumber=12955
 *
 * Analyzes delay cascade and propagation effects
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

    const cascade = insight.modules.cascadeDetection;
    const network = insight.modules.networkIntelligence;
    const nextStation = insight.modules.trainStatus.nextStation;

    return NextResponse.json(
      {
        success: true,
        data: {
          train: {
            number: insight.trainNumber,
          },
          currentDelay: insight.delay,
          cascadeAnalysis: {
            delayOrigin: insight.modules.trainStatus.source,
            estimatedPropagation: [
              {
                station: nextStation,
                estimatedDelay: Math.max(insight.delay, Math.round(insight.delay * 1.15)),
                impactedTrains: cascade.affectedTrains,
              },
            ],
            affectedRoutes: [
              {
                sectionLoad: network.sectionLoad,
                congestionScore: network.congestionScore,
              },
            ],
            totalAffectedTrains: cascade.affectedTrains,
            detected: cascade.detected,
            risk: cascade.risk,
          },
          delayProgression: {
            trend: insight.modules.haltAnalysis.delayTrend.toLowerCase(),
            velocityOfChange:
              insight.modules.haltAnalysis.delayTrend === 'INCREASING'
                ? 'increasing'
                : insight.modules.haltAnalysis.delayTrend === 'DECREASING'
                  ? 'decreasing'
                  : 'stable',
            projectedDelay: Math.max(insight.delay, Math.round(insight.delay + network.congestionScore * 0.08)),
          },
          networkRiskFactors: {
            upstreamCongestion: network.congestionScore >= 55,
            downstreamCongestion: network.congestionScore >= 65,
            platformAvailability: insight.modules.stationLive.platformTrains.length < 4,
            junctionSpacing: network.sectionLoad === 'SEVERE' ? 'Tight' : 'Normal',
          },
          recoveryPotential: {
            estimatedRecovery: insight.delay > 0 ? '2-5 stations' : 'N/A',
            fastTrackSections: [],
            recoveryProbability: Math.max(0.2, Math.min(0.9, (100 - network.congestionScore) / 100)),
          },
          recommendations: cascade.detected
            ? [
                'Delay propagation detected: prioritize dispatch coordination',
                'Issue downstream alerts for connected sections',
                'Refresh passenger ETA more frequently',
              ]
            : [
                'No active cascade signal',
                'Continue monitoring section congestion and delay trends',
              ],
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=15',
        },
      }
    );
  } catch (error: any) {
    console.error('[CascadeAnalysis API]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze cascade' },
      { status: 500 }
    );
  }
}

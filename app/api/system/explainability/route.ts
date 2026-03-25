/**
 * AI Explainability Endpoint
 * GET /api/system/explainability?trainNumber=12955
 *
 * Explains AI decisions and predictions in human terms
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

    return NextResponse.json(
      {
        success: true,
        data: {
          train: {
            number: insight.trainNumber,
          },
          predictions: {
            delayForecast: {
              prediction: `${insight.delay} minutes`,
              confidence: insight.modules.explainability.confidence,
              reasoning: insight.modules.explainability.reasons,
              factors: [
                {
                  name: 'Current Delay',
                  weight: 0.35,
                  value: `${insight.delay}m`,
                  impact: insight.delay >= 20 ? 'High' : insight.delay >= 8 ? 'Medium' : 'Low',
                },
                {
                  name: 'Section Congestion',
                  weight: 0.3,
                  value: insight.modules.networkIntelligence.sectionLoad,
                  impact:
                    insight.modules.networkIntelligence.sectionLoad === 'SEVERE'
                      ? 'High'
                      : insight.modules.networkIntelligence.sectionLoad === 'HIGH'
                        ? 'Medium'
                        : 'Low',
                },
                {
                  name: 'Trains Between',
                  weight: 0.2,
                  value: String(insight.modules.networkIntelligence.trainsBetween),
                  impact: insight.modules.networkIntelligence.trainsBetween >= 10 ? 'High' : 'Low',
                },
                {
                  name: 'Data Confidence',
                  weight: 0.15,
                  value: `${insight.confidence}%`,
                  impact: insight.confidence >= 80 ? 'Low' : 'Medium',
                },
              ],
            },
            stationArrival: {
              prediction: insight.modules.trainStatus.nextStation,
              estimatedTime: insight.expectedArrival,
              confidence: insight.confidence,
              reasoning: [
                `Expected arrival derived from scheduled time + ${insight.runningLateMinutes}m delay.`,
                `Estimated speed model output: ${insight.speed} km/h.`,
                `Network signal: ${insight.modules.networkIntelligence.message}`,
              ],
            },
          },
          dataQualityImpact: {
            statement: `Source reliability is ${insight.modules.dataQuality.sourceReliability.toLowerCase()} with ${insight.confidence}% confidence.`,
            sources: [
              {
                name: 'NTES Running Status',
                used: insight.modules.trainStatus.source.startsWith('ntes'),
                confidence: insight.confidence / 100,
              },
              {
                name: 'Station Live Feed/Snapshots',
                used: true,
                confidence: Math.max(0.3, (insight.confidence - 8) / 100),
              },
              {
                name: 'Trains Between Segment Feed',
                used: Boolean(insight.modules.trainsBetween),
                confidence: Boolean(insight.modules.trainsBetween) ? Math.max(0.3, (insight.confidence - 12) / 100) : 0,
              },
            ],
          },
          modelCharacteristics: {
            type: 'Signal Derivation Engine (NTES-first)',
            updateFrequency: 'Every API refresh (dynamic route)',
            trainingData: 'Rule-based + live signal fusion',
            accuracy: `Confidence ${insight.confidence}%`,
          },
          disclaimers: [
            'NTES does not provide exact telemetry for every field; speed is derived from schedule-distance signals.',
            'Predictions can shift with fresh delay or congestion updates.',
          ],
          userGuidance: [
            'Treat this as live operational guidance with transparent reasons.',
            'Use expected arrival and risk outputs together for decisions.',
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
    console.error('[Explainability API]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch explainability' },
      { status: 500 }
    );
  }
}

/**
 * Passenger Safety Endpoint
 * GET /api/system/passenger-safety?trainNumber=12955
 *
 * Analyzes safety metrics and passenger risk factors
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

    const safety = insight.modules.passengerSafety;
    const network = insight.modules.networkIntelligence;

    return NextResponse.json(
      {
        success: true,
        data: {
          train: {
            number: insight.trainNumber,
          },
          safetyMetrics: {
            overallScore: insight.confidence,
            trackCondition: network.sectionLoad === 'SEVERE' ? 'Stressed' : 'Operational',
            weatherRisk: 'Unknown',
            derailmentRisk: safety.risk === 'HIGH' ? 'Elevated' : 'Minimal',
            collisionRisk: network.sectionLoad === 'SEVERE' ? 'Elevated' : 'Low',
          },
          passengerWelfare: {
            estimatedCrowding: insight.crowdLevel,
            ventilationStatus: safety.risk === 'HIGH' ? 'Potentially Impacted' : 'Normal',
            temperatureControl: 'Operational',
            facilities: {
              toilets: 'Unknown',
              water: 'Unknown',
              medical: 'Assistance via station channels',
            },
          },
          delayImpact: {
            passengerStress: safety.risk,
            emergencyDelay: insight.delay,
            estimatedCompensation: insight.delay > 60 ? 'Eligible' : 'Not Eligible',
          },
          alerts:
            safety.risk === 'HIGH' || insight.delay >= 25
              ? [
                  {
                    type: 'comfort-risk',
                    severity: safety.risk.toLowerCase(),
                    message: `${safety.message}. Delay ${insight.delay} minutes with congestion score ${network.congestionScore}.`,
                  },
                ]
              : [],
          recommendations: [
            'Share revised ETA and platform guidance with passengers',
            safety.risk === 'HIGH'
              ? 'High discomfort risk: prioritize passenger advisories and support at next halt'
              : 'Current risk remains manageable',
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
    console.error('[PassengerSafety API]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch safety metrics' },
      { status: 500 }
    );
  }
}

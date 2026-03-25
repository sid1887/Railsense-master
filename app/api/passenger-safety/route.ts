import { NextRequest, NextResponse } from 'next/server';
import { passengerSafetyService } from '@/services/passengerSafetyService';

/**
 * Passenger Safety & Dwell Analysis API
 * GET /api/passenger-safety - Analyze passenger safety
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Action: assess-safety
    if (action === 'assess-safety') {
      const trainNumber = searchParams.get('train') || '12723-RAJ';
      const originStation = searchParams.get('origin') || 'HYD';
      const destinationStation = searchParams.get('destination') || 'VJA';
      const trainCategory = searchParams.get('category') || 'rajdhani';
      const horizonStr = searchParams.get('horizon') || '120';
      const planningHorizon = parseInt(horizonStr, 10);

      const assessment = passengerSafetyService.assessPassengerSafety(
        trainNumber,
        originStation,
        destinationStation,
        trainCategory,
        planningHorizon
      );

      return NextResponse.json(
        {
          success: true,
          data: assessment,
        },
        { status: 200 }
      );
    }

    // Action: dwell-profile
    if (action === 'dwell-profile') {
      const stationId = searchParams.get('station') || 'HYD';

      const profile = passengerSafetyService.getDwellProfile(stationId);
      const connectionReq = passengerSafetyService.getConnectionRequirement(stationId);

      return NextResponse.json(
        {
          success: true,
          data: {
            stationId,
            dwell: profile,
            connectionTimeRequired: connectionReq,
          },
        },
        { status: 200 }
      );
    }

    // Default: return capabilities
    return NextResponse.json(
      {
        success: true,
        message: 'Passenger Safety & Dwell Analysis Service',
        capabilities: [
          {
            action: 'assess-safety',
            description: 'Comprehensive passenger safety assessment',
            params: [
              { name: 'train', type: 'string', example: '12723-RAJ' },
              { name: 'origin', type: 'string', example: 'HYD' },
              { name: 'destination', type: 'string', example: 'VJA' },
              { name: 'category', type: 'string', example: 'rajdhani' },
              { name: 'horizon', type: 'number', example: '120' },
            ],
          },
          {
            action: 'dwell-profile',
            description: 'Get dwell time profiles for a station',
            params: [{ name: 'station', type: 'string', example: 'HYD' }],
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Passenger safety analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze passenger safety',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

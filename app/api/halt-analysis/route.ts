import { NextRequest, NextResponse } from 'next/server';
import { haltReasonService } from '@/services/haltReasonService';

/**
 * Halt Reason Analysis API Endpoint
 * GET /api/halt-analysis - Analyze halt reasons
 * GET /api/halt-analysis/platforms - Get platform status
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Action: analyze-halt
    if (action === 'analyze-halt') {
      const trainNumber = searchParams.get('train') || '12723-RAJ';
      const location = searchParams.get('location') || 'SEC-002';
      const haltDurationStr = searchParams.get('duration') || '15';
      const haltDuration = parseInt(haltDurationStr, 10);

      // Create mock nearby trains
      const nearbyTrains = [
        { number: '12659-SHAB', direction: 'north', priority: 'shatabdi' },
        { number: '12809-SF', direction: 'south', priority: 'superfast' },
        { number: '11010-PASS', direction: 'north', priority: 'passenger' },
      ];

      const analysis = haltReasonService.analyzeHalt(
        trainNumber,
        location,
        haltDuration,
        nearbyTrains
      );

      return NextResponse.json(
        {
          success: true,
          data: analysis,
        },
        { status: 200 }
      );
    }

    // Action: platform-status
    if (action === 'platform-status') {
      const stationId = searchParams.get('station');

      if (stationId) {
        const status = haltReasonService.getPlatformStatus(stationId);
        if (!status) {
          return NextResponse.json(
            {
              success: false,
              error: `Station ${stationId} not found`,
            },
            { status: 404 }
          );
        }
        return NextResponse.json(
          {
            success: true,
            data: status,
          },
          { status: 200 }
        );
      }

      // Get all platform status
      const allStatus = haltReasonService.getAllPlatformStatus();
      return NextResponse.json(
        {
          success: true,
          data: allStatus,
        },
        { status: 200 }
      );
    }

    // Default: return service capabilities
    return NextResponse.json(
      {
        success: true,
        message: 'Halt Reason Analysis Service',
        capabilities: [
          {
            action: 'analyze-halt',
            description: 'Analyze why a train is halted',
            params: [
              { name: 'train', type: 'string', example: '12723-RAJ' },
              { name: 'location', type: 'string', example: 'SEC-002' },
              { name: 'duration', type: 'number', example: '15' },
            ],
          },
          {
            action: 'platform-status',
            description: 'Get platform occupancy status',
            params: [{ name: 'station', type: 'string', optional: true, example: 'HYD' }],
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Halt analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze halt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

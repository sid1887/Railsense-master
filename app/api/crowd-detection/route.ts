/**
 * Crowd Detection API
 * GET /api/crowd-detection?trainNumber=12955
 *
 * Returns crowd analysis based on search analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { crowdDetectionService } from '@/services/crowdDetectionService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const trainNumber = request.nextUrl.searchParams.get('trainNumber');

    if (!trainNumber) {
      return NextResponse.json(
        { error: 'trainNumber parameter required' },
        { status: 400 }
      );
    }

    // Get crowd estimation based on search analytics
    const crowdEstimation = crowdDetectionService.estimateCrowd(trainNumber);

    return NextResponse.json(crowdEstimation);
  } catch (error: any) {
    console.error('[Crowd Detection API]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to estimate crowd' },
      { status: 500 }
    );
  }
}

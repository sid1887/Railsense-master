/**
 * API Route: /api/insights
 * Returns only passenger insights and analysis summary
 * Lightweight endpoint for quick updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQuickTrainInsight } from '@/services/orchestrator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const trainNumber = request.nextUrl.searchParams.get('trainNumber');

    if (!trainNumber) {
      return NextResponse.json(
        { error: 'Train number is required' },
        { status: 400 }
      );
    }

    // Get quick insight (faster response)
    const insightData = await getQuickTrainInsight(trainNumber);

    // Set shorter cache for quick updates
    const response = NextResponse.json(insightData);
    response.headers.set('Cache-Control', 'public, max-age=15');

    return response;
  } catch (error: any) {
    console.error('API Error - insights:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch insights' },
      { status: 404 }
    );
  }
}

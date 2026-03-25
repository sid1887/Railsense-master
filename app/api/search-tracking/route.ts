/**
 * Search Tracking API
 * POST /api/search-tracking
 *
 * Records search events for crowd detection analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchAnalyticsTracker } from '@/services/searchAnalyticsTracker';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trainNumber, searchType = 'exact', userContext } = body;

    if (!trainNumber) {
      return NextResponse.json(
        { error: 'trainNumber required' },
        { status: 400 }
      );
    }

    // Record the search
    searchAnalyticsTracker.recordSearch(
      trainNumber,
      searchType || 'exact',
      userContext
    );

    return NextResponse.json({
      success: true,
      message: 'Search recorded',
      trainNumber,
    });
  } catch (error: any) {
    console.error('[Search Tracking API]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record search' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search-tracking?trainNumber=12955
 * Returns search analytics for a train
 */
export async function GET(request: NextRequest) {
  try {
    const trainNumber = request.nextUrl.searchParams.get('trainNumber');

    if (!trainNumber) {
      return NextResponse.json(
        { error: 'trainNumber parameter required' },
        { status: 400 }
      );
    }

    const analytics = searchAnalyticsTracker.getSearchAnalytics(trainNumber);

    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('[Search Analytics API]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get search analytics' },
      { status: 500 }
    );
  }
}

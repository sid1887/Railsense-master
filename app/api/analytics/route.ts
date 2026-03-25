/**
 * Analytics API Route
 * Returns halt patterns, congestion metrics, and provider health
 */

import { NextRequest, NextResponse } from 'next/server';

let analyticsAggregation: any = null;

// Only load on server-side
if (typeof window === 'undefined') {
  try {
    analyticsAggregation = require('@/services/analyticsAggregation').default;
  } catch (e) {
    console.error('[Analytics API] Failed to load analytics service:', e);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metricType = searchParams.get('type') || 'all';
    const hoursBack = parseInt(searchParams.get('hours') || '24');
    const sectionCode = searchParams.get('section');

    if (!analyticsAggregation) {
      return NextResponse.json(
        { error: 'Analytics service not initialized' },
        { status: 503 }
      );
    }

    const response: any = {
      timestamp: new Date().toISOString(),
      timeRange: `${hoursBack} hours`,
    };

    // Get provider health dashboard
    if (metricType === 'all' || metricType === 'provider') {
      response.providerHealth = await analyticsAggregation.getProviderHealthDashboard(hoursBack);
    }

    // Get halt patterns
    if (metricType === 'all' || metricType === 'halts') {
      response.haltPatterns = await analyticsAggregation.aggregateHaltPatterns(hoursBack);
    }

    // Get congestion patterns
    if (metricType === 'all' || metricType === 'congestion') {
      response.congestionPatterns = await analyticsAggregation.aggregateCongestionPatterns(hoursBack);
    }

    // Get problematic sections
    if (metricType === 'all' || metricType === 'problems') {
      response.problematicSections = await analyticsAggregation.getProblematicSections(hoursBack);
    }

    // Get specific section density
    if (sectionCode) {
      response.sectionDensity = await analyticsAggregation.getSectionDensity(sectionCode);
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: String(error) },
      { status: 500 }
    );
  }
}

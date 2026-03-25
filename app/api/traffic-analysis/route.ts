/**
 * Traffic Analysis API Endpoint (PHASE 12+)
 * Exposes real-time traffic analysis using actual train positions from realTimePositionService
 *
 * Endpoints:
 * GET /api/traffic-analysis - Complete system overview
 * GET /api/traffic-analysis?zone=delhi - Specific zone analysis
 * GET /api/traffic-analysis?bottlenecks=true - Major bottlenecks only
 * GET /api/traffic-analysis?trends=60 - Traffic trends (last N minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { trafficAnalysisService } from '@/services/trafficAnalysisService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zone = searchParams.get('zone');
    const bottlenecksOnly = searchParams.get('bottlenecks');
    const trendsMinutes = searchParams.get('trends');

    // Case 1: Get bottlenecks only
    if (bottlenecksOnly === 'true') {
      const bottlenecks = trafficAnalysisService.identifyBottlenecks();

      return NextResponse.json(
        {
          success: true,
          data: {
            type: 'bottlenecks',
            bottlenecks,
            totalBottlenecks: bottlenecks.length,
            criticalCount: bottlenecks.filter((b) => b.status === 'Critical').length,
          },
          timestamp: new Date().toISOString(),
        },
        {
          headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
        }
      );
    }

    // Case 2: Get traffic trends
    if (trendsMinutes) {
      const minutes = parseInt(trendsMinutes) || 60;
      const trends = trafficAnalysisService.getTrafficTrends(minutes);

      return NextResponse.json(
        {
          success: true,
          data: {
            type: 'trends',
            timerange: `${minutes} minutes`,
            patterns: trends,
            count: trends.length,
          },
          timestamp: new Date().toISOString(),
        },
        {
          headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
        }
      );
    }

    // Case 3: Get specific zone analysis
    if (zone) {
      const MAJOR_ZONES = {
        delhi: { lat: 28.6, lng: 77.2, region: 'North' },
        mumbai: { lat: 19.0, lng: 72.8, region: 'West' },
        bangalore: { lat: 12.9, lng: 77.6, region: 'South' },
        hyderabad: { lat: 17.3, lng: 78.5, region: 'South-Central' },
        kolkata: { lat: 22.5, lng: 88.3, region: 'East' },
      };

      const zoneData = MAJOR_ZONES[zone.toLowerCase() as keyof typeof MAJOR_ZONES];
      if (!zoneData) {
        return NextResponse.json(
          { error: 'Zone not found', availableZones: Object.keys(MAJOR_ZONES) },
          { status: 404 }
        );
      }

      const analysis = trafficAnalysisService.analyzeZone(
        zone.toUpperCase(),
        zoneData.region,
        zoneData.lat,
        zoneData.lng,
        100
      );

      return NextResponse.json(
        {
          success: true,
          data: analysis,
          timestamp: new Date().toISOString(),
        },
        {
          headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
        }
      );
    }

    // Case 4: Get complete system overview
    const bottlenecks = trafficAnalysisService.identifyBottlenecks();
    const majorZones = [
      trafficAnalysisService.analyzeZone('DELHI', 'North', 28.6, 77.2, 100),
      trafficAnalysisService.analyzeZone('MUMBAI', 'West', 19.0, 72.8, 100),
      trafficAnalysisService.analyzeZone('BANGALORE', 'South', 12.9, 77.6, 100),
      trafficAnalysisService.analyzeZone('HYDERABAD', 'South-Central', 17.3, 78.5, 100),
      trafficAnalysisService.analyzeZone('KOLKATA', 'East', 22.5, 88.3, 100),
    ];

    // Calculate system-wide metrics
    const totalTrains = majorZones.reduce((sum, z) => sum + z.totalTrains, 0);
    const criticalZones = majorZones.filter((z) => z.congestionLevel === 'CRITICAL').length;
    const avgSystemDelay = Math.round(
      majorZones.reduce((sum, z) => sum + z.avgDelay, 0) / majorZones.length
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          type: 'system-overview',
          summary: {
            totalTrains,
            totalZones: majorZones.length,
            criticalZones,
            avgSystemDelay,
            systemHealth: criticalZones === 0 ? 'Healthy' : criticalZones < 2 ? 'Degraded' : 'Critical',
          },
          zones: majorZones,
          bottlenecks: bottlenecks.slice(0, 5), // Top 5 bottlenecks
          recommendations: [
            bottlenecks.length > 0 ? `Avoid ${bottlenecks[0].name} due to congestion` : null,
            avgSystemDelay > 20 ? 'System-wide delays detected. Consider using alternative routes' : null,
            criticalZones > 0 ? `${criticalZones} zone(s) at critical congestion level` : null,
          ].filter((r) => r !== null),
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
      }
    );
  } catch (error: any) {
    console.error('[traffic-analysis API] Error:', error);

    return NextResponse.json(
      {
        error: 'Traffic analysis failed',
        message: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

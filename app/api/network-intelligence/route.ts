/**
 * API Route: /api/network-intelligence
 * Railway Network Intelligence Endpoint
 * Provides network-wide analysis, hotspot detection, priority conflicts, and flow predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { railwayNetworkService } from '@/services/railwayNetworkService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'analyze-network', includeHotspots = true, includePriorities = true } = body;

    let response: any = {};

    switch (action) {
      case 'analyze-network': {
        // Get comprehensive network analysis
        const metrics = railwayNetworkService.getNetworkMetrics();
        const sections = railwayNetworkService.getSections();
        const trainDensity = railwayNetworkService.getTrainDensity();
        const hotspots = includeHotspots ? railwayNetworkService.detectHotspots() : [];
        const priorityConflicts = includePriorities
          ? railwayNetworkService.detectPriorityConflicts()
          : [];

        response = {
          success: true,
          totalTrains: metrics.totalTrains,
          avgDensity: metrics.averageDensity,
          congestionScore: metrics.congestionScore,
          flowEfficiency: metrics.flowEfficiency,
          estimatedNetworkDelay: metrics.estimatedNetworkDelay,
          criticalSections: metrics.criticalSections,
          sections: sections.map((s) => ({
            id: s.id,
            from: s.from,
            to: s.to,
            distance: s.distance,
            trafficDensity: s.trafficDensity,
            congestionLevel: s.congestionLevel,
            trainCount: s.currentTrains.length,
            maxCapacity: s.maxTrainsPerHour,
            maintenanceStatus: s.maintenanceStatus,
          })),
          trainDensity: trainDensity.slice(0, 10), // Top 10
          hotspots,
          priorityConflicts,
          directionalFlow: {
            northBound: metrics.northBound,
            southBound: metrics.southBound,
            eastBound: metrics.eastBound,
            westBound: metrics.westBound,
          },
        };
        break;
      }

      case 'hotspots': {
        const hotspots = railwayNetworkService.detectHotspots();
        response = {
          success: true,
          hotspots,
          count: hotspots.length,
        };
        break;
      }

      case 'priority-conflicts': {
        const conflicts = railwayNetworkService.detectPriorityConflicts();
        response = {
          success: true,
          conflicts,
          count: conflicts.length,
        };
        break;
      }

      case 'sections': {
        const sections = railwayNetworkService.getSections();
        response = {
          success: true,
          sections,
          count: sections.length,
        };
        break;
      }

      case 'section-detail': {
        const { sectionId } = body;
        if (!sectionId) {
          return NextResponse.json(
            { error: 'sectionId parameter required' },
            { status: 400 }
          );
        }
        const section = railwayNetworkService.getSection(sectionId);
        if (!section) {
          return NextResponse.json(
            { error: `Section ${sectionId} not found` },
            { status: 404 }
          );
        }

        const trainsInSection = railwayNetworkService.getTrainsInSection(sectionId);
        response = {
          success: true,
          section,
          trains: trainsInSection,
          trainsCount: trainsInSection.length,
        };
        break;
      }

      case 'flow-prediction': {
        const { minutesAhead = 60 } = body;
        const prediction = railwayNetworkService.predictNetworkFlow(minutesAhead);
        response = {
          success: true,
          prediction,
          timeframe: minutesAhead,
        };
        break;
      }

      case 'congestion-radar': {
        const radar = railwayNetworkService.getCongestionRadar();
        response = {
          success: true,
          radar,
        };
        break;
      }

      case 'train-density': {
        const density = railwayNetworkService.getTrainDensity();
        response = {
          success: true,
          trains: density,
          count: density.length,
        };
        break;
      }

      default:
        return NextResponse.json(
          {
            error: 'Unknown action',
            supportedActions: [
              'analyze-network',
              'hotspots',
              'priority-conflicts',
              'sections',
              'section-detail',
              'flow-prediction',
              'congestion-radar',
              'train-density',
            ],
          },
          { status: 400 }
        );
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('[Network Intelligence API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process network intelligence request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Default: return network analysis
    const metrics = railwayNetworkService.getNetworkMetrics();
    const hotspots = railwayNetworkService.detectHotspots();
    const conflictsCount = railwayNetworkService.detectPriorityConflicts().length;

    return NextResponse.json({
      success: true,
      networkStatus: 'operational',
      metrics,
      hotspotsDetected: hotspots.length,
      priorityConflictsDetected: conflictsCount,
      availableActions: [
        'analyze-network',
        'hotspots',
        'priority-conflicts',
        'sections',
        'section-detail',
        'flow-prediction',
        'congestion-radar',
        'train-density',
      ],
    });
  } catch (error: any) {
    console.error('[Network Intelligence API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

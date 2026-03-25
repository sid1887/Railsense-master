import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/services/databasePersistenceService';

/**
 * Database Persistence API
 * GET /api/database - Manage persistent data
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Action: health
    if (action === 'health') {
      const metrics = await databaseService.getSystemHealthMetrics();

      return NextResponse.json(
        {
          success: true,
          data: {
            status: 'operational',
            ...metrics,
          },
        },
        { status: 200 }
      );
    }

    // Action: section-averages
    if (action === 'section-averages') {
      const sectionId = searchParams.get('section') || 'SEC-002';

      const averages = await databaseService.calculateSectionAverages(sectionId);

      return NextResponse.json(
        {
          success: true,
          data: {
            sectionId,
            ...averages,
          },
        },
        { status: 200 }
      );
    }

    // Action: cleanup
    if (action === 'cleanup') {
      const retentionDaysStr = searchParams.get('days') || '30';
      const retentionDays = parseInt(retentionDaysStr, 10);

      const deleted = await databaseService.cleanupOldData(retentionDays);

      return NextResponse.json(
        {
          success: true,
          data: {
            recordsDeleted: deleted,
            retentionDays,
          },
        },
        { status: 200 }
      );
    }

    // Action: export
    if (action === 'export') {
      const format = (searchParams.get('format') as 'json' | 'csv') || 'json';

      const data = await databaseService.exportData(format);

      return NextResponse.json(
        {
          success: true,
          format,
          data,
        },
        { status: 200 }
      );
    }

    // Default: return capabilities
    return NextResponse.json(
      {
        success: true,
        message: 'Database Persistence Service',
        capabilities: [
          {
            action: 'health',
            description: 'Get database health and storage metrics',
          },
          {
            action: 'section-averages',
            description: 'Calculate historical averages for a section',
            params: [{ name: 'section', type: 'string', example: 'SEC-002' }],
          },
          {
            action: 'cleanup',
            description: 'Clean up old data based on retention policy',
            params: [{ name: 'days', type: 'number', example: '30' }],
          },
          {
            action: 'export',
            description: 'Export data for analysis',
            params: [{ name: 'format', type: 'string', example: 'json|csv' }],
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Database persistence error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process database request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

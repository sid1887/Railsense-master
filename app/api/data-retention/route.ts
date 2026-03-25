/**
 * API Route: /api/data-retention
 * Manages data retention policies and cleanup operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { dataRetentionService, DataAgeInfo } from '@/services/dataRetentionService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const dataType = searchParams.get('type');

    if (action === 'policies') {
      // Get all retention policies
      return NextResponse.json(
        {
          policies: dataRetentionService.getAllPolicies(),
          count: dataRetentionService.getAllPolicies().length,
        },
        { status: 200 }
      );
    }

    if (action === 'policy' && dataType) {
      // Get specific policy
      const policy = dataRetentionService.getPolicy(dataType);
      if (!policy) {
        return NextResponse.json(
          { error: `Policy not found for ${dataType}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ policy }, { status: 200 });
    }

    if (action === 'schedule') {
      // Get cleanup schedule
      return NextResponse.json(
        {
          schedule: dataRetentionService.getCleanupSchedule(),
        },
        { status: 200 }
      );
    }

    if (action === 'impact') {
      // Calculate storage impact (simulated data ages)
      const simulatedAges: DataAgeInfo[] = [
        {
          dataType: 'train_snapshots',
          oldestRecord: Date.now() - 60 * 24 * 60 * 60 * 1000,
          newestRecord: Date.now(),
          totalRecords: 150000,
          sizeEstimateMB: 450,
          retentionDays: 90,
          willBeDeletedAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
        {
          dataType: 'halt_events',
          oldestRecord: Date.now() - 150 * 24 * 60 * 60 * 1000,
          newestRecord: Date.now(),
          totalRecords: 45000,
          sizeEstimateMB: 120,
          retentionDays: 180,
          willBeDeletedAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
        {
          dataType: 'data_quality_logs',
          oldestRecord: Date.now() - 20 * 24 * 60 * 60 * 1000,
          newestRecord: Date.now(),
          totalRecords: 25000,
          sizeEstimateMB: 65,
          retentionDays: 30,
          willBeDeletedAt: Date.now() + 10 * 24 * 60 * 60 * 1000,
        },
      ];

      const impact = dataRetentionService.getStorageImpactReport(simulatedAges);

      return NextResponse.json(
        {
          dataAges: simulatedAges,
          impact,
        },
        { status: 200 }
      );
    }

    // Default: return all policies and schedule
    return NextResponse.json(
      {
        policies: dataRetentionService.getAllPolicies(),
        schedule: dataRetentionService.getCleanupSchedule(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Data Retention API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve data retention info' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, dataType, policy } = body;

    if (action === 'set-policy' && dataType && policy) {
      // Update a retention policy
      dataRetentionService.setPolicy(dataType, {
        dataType,
        retentionDays: policy.retentionDays,
        description: policy.description || '',
        autoCleanup: policy.autoCleanup !== false,
        notifyBefore: policy.notifyBefore,
      });

      return NextResponse.json(
        { message: `Policy updated for ${dataType}`, policy },
        { status: 201 }
      );
    }

    if (action === 'cleanup' && dataType) {
      // Simulate cleanup operation
      const policy = dataRetentionService.getPolicy(dataType);
      if (!policy) {
        return NextResponse.json(
          { error: `Policy not found for ${dataType}` },
          { status: 404 }
        );
      }

      // In a real implementation, this would delete actual records
      const estimatedRecordsDeleted = Math.floor(Math.random() * 10000) + 100;
      dataRetentionService.recordCleanup(dataType, estimatedRecordsDeleted);

      return NextResponse.json(
        {
          message: `Cleanup executed for ${dataType}`,
          recordsDeleted: estimatedRecordsDeleted,
          dataType,
        },
        { status: 200 }
      );
    }

    if (action === 'export-policies') {
      // Export policies as JSON
      const policiesJson = dataRetentionService.exportPolicies();
      return NextResponse.json(
        { policies: JSON.parse(policiesJson) },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Data Retention API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process retention request' },
      { status: 500 }
    );
  }
}

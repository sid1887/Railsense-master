import { NextRequest, NextResponse } from 'next/server';
import { cascadeService } from '@/services/cascadeService';

/**
 * Delay Cascade & Priority Detection API
 * GET /api/cascade-analysis - Analyze cascade effects
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Action: analyze-cascade
    if (action === 'analyze-cascade') {
      const sourceTrain = searchParams.get('train') || '12723-RAJ';
      const delayStr = searchParams.get('delay') || '15';
      const initialDelay = parseInt(delayStr, 10);
      const section = searchParams.get('section') || 'SEC-002';

      const analysis = cascadeService.analyzeCascade(sourceTrain, initialDelay, section, 3);

      return NextResponse.json(
        {
          success: true,
          data: analysis,
        },
        { status: 200 }
      );
    }

    // Action: compare-priority
    if (action === 'compare-priority') {
      const train1 = searchParams.get('train1') || '12723-RAJ';
      const train2 = searchParams.get('train2') || '11010-PASS';

      const priority1 = cascadeService.getTrainPriority(train1);
      const priority2 = cascadeService.getTrainPriority(train2);
      const difference = cascadeService.comparePriorities(train1, train2);

      return NextResponse.json(
        {
          success: true,
          data: {
            train1: { name: train1, priority: priority1 },
            train2: { name: train2, priority: priority2 },
            difference,
            winner: difference > 0 ? train1 : train2,
            rightOfWay:
              difference > 0
                ? `${train1} has right of way over ${train2}`
                : `${train2} has right of way over ${train1}`,
          },
        },
        { status: 200 }
      );
    }

    // Default: return capabilities
    return NextResponse.json(
      {
        success: true,
        message: 'Delay Cascade & Priority Detection Service',
        capabilities: [
          {
            action: 'analyze-cascade',
            description: 'Analyze delay cascade effects from source train',
            params: [
              { name: 'train', type: 'string', example: '12723-RAJ' },
              { name: 'delay', type: 'number', example: '15' },
              { name: 'section', type: 'string', example: 'SEC-002' },
            ],
          },
          {
            action: 'compare-priority',
            description: 'Compare priority of two trains',
            params: [
              { name: 'train1', type: 'string', example: '12723-RAJ' },
              { name: 'train2', type: 'string', example: '11010-PASS' },
            ],
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cascade analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze cascade',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

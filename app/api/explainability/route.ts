import { NextRequest, NextResponse } from 'next/server';
import { explainabilityEngine } from '@/services/explainabilityEngine';

/**
 * Explainability Engine API Endpoint
 * GET /api/explainability - Generate explanations for predictions
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Action: explain-delay
    if (action === 'explain-delay') {
      const trainNumber = searchParams.get('train') || '12723-RAJ';
      const section = searchParams.get('section') || 'SEC-002';
      const delayStr = searchParams.get('delay') || '15';
      const predictedDelay = parseInt(delayStr, 10);

      const factors = {
        historical_delay: 12,
        congestion_level: 'high',
        train_priority: 'rajdhani',
        maintenance_block: false,
        weather: 'clear',
      };

      const explanation = explainabilityEngine.explainDelayPrediction(
        trainNumber,
        section,
        predictedDelay,
        factors
      );

      return NextResponse.json(
        {
          success: true,
          data: explanation,
        },
        { status: 200 }
      );
    }

    // Action: explain-halt
    if (action === 'explain-halt') {
      const trainNumber = searchParams.get('train') || '12723-RAJ';
      const location = searchParams.get('location') || 'SEC-002';
      const durationStr = searchParams.get('duration') || '15';
      const haltDuration = parseInt(durationStr, 10);

      const factors = {
        platform_occupancy: 85,
        crossing_train: false,
        expected_dwell: 8,
      };

      const explanation = explainabilityEngine.explainHaltPrediction(
        trainNumber,
        location,
        haltDuration,
        factors
      );

      return NextResponse.json(
        {
          success: true,
          data: explanation,
        },
        { status: 200 }
      );
    }

    // Action: narrative
    if (action === 'narrative') {
      const type = searchParams.get('type') || 'delay';
      const trainNumber = searchParams.get('train') || '12723-RAJ';
      const target = searchParams.get('target') || 'SEC-002';
      const valueStr = searchParams.get('value') || '15';
      const value = parseInt(valueStr, 10);

      let explanation;
      if (type === 'delay') {
        explanation = explainabilityEngine.explainDelayPrediction(
          trainNumber,
          target,
          value,
          {
            historical_delay: 12,
            congestion_level: 'high',
            train_priority: 'rajdhani',
            maintenance_block: false,
          }
        );
      } else {
        explanation = explainabilityEngine.explainHaltPrediction(trainNumber, target, value, {
          platform_occupancy: 85,
          crossing_train: false,
          expected_dwell: 8,
        });
      }

      const narrative = explainabilityEngine.generateNarrativeExplanation(explanation);

      return NextResponse.json(
        {
          success: true,
          data: {
            prediction: explanation.prediction,
            narrative,
            confidence: Math.round(100 - explanation.uncertaintyScore),
            uncertainty: explanation.uncertaintyScore,
          },
        },
        { status: 200 }
      );
    }

    // Default: return capabilities
    return NextResponse.json(
      {
        success: true,
        message: 'Explainability Engine Service',
        capabilities: [
          {
            action: 'explain-delay',
            description: 'Generate detailed explanation for delay prediction',
            params: [
              { name: 'train', type: 'string', example: '12723-RAJ' },
              { name: 'section', type: 'string', example: 'SEC-002' },
              { name: 'delay', type: 'number', example: '15' },
            ],
          },
          {
            action: 'explain-halt',
            description: 'Generate detailed explanation for halt prediction',
            params: [
              { name: 'train', type: 'string', example: '12723-RAJ' },
              { name: 'location', type: 'string', example: 'SEC-002' },
              { name: 'duration', type: 'number', example: '15' },
            ],
          },
          {
            action: 'narrative',
            description: 'Get human-readable narrative explanation',
            params: [
              { name: 'type', type: 'string', example: 'delay|halt' },
              { name: 'train', type: 'string', example: '12723-RAJ' },
              { name: 'target', type: 'string', example: 'SEC-002' },
              { name: 'value', type: 'number', example: '15' },
            ],
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Explainability error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate explanation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

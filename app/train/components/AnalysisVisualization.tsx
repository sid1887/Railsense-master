'use client';

import React, { useMemo } from 'react';
import { TrainAnalytics } from '@/types/analytics';
import dynamic from 'next/dynamic';

/**
 * Analysis Visualization Panels
 * Displays interactive charts and visualizations for train analytics
 * Uses Recharts for charting (lightweight, React-friendly)
 */

interface AnalysisVisualizationProps {
  analytics: TrainAnalytics;
}

// Dynamic import of chart components to avoid SSR issues
const HaltFactorsChart = dynamic(
  () => import('./charts/HaltFactorsChart'),
  {
    ssr: false,
    loading: () => <ChartPlaceholder title="Halt Factors Chart" />,
  }
);

const WaitTimeBreakdownChart = dynamic(
  () => import('./charts/WaitTimeBreakdownChart'),
  {
    ssr: false,
    loading: () => <ChartPlaceholder title="Wait Time Breakdown" />,
  }
);

const SectionCongestionChart = dynamic(
  () => import('./charts/SectionCongestionChart'),
  {
    ssr: false,
    loading: () => <ChartPlaceholder title="Section Congestion Map" />,
  }
);

const TrainTimelineChart = dynamic(
  () => import('./charts/TrainTimelineChart'),
  {
    ssr: false,
    loading: () => <ChartPlaceholder title="Train Movement Timeline" />,
  }
);

// Placeholder for charts that are loading
function ChartPlaceholder({ title }: { title: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '300px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '600',
      }}
    >
      Loading {title}...
    </div>
  );
}

export default function AnalysisVisualization({ analytics }: AnalysisVisualizationProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '24px',
        marginTop: '24px',
      }}
    >
      {/* Halt Factors Chart */}
      {analytics.haltAnalysis.isHalted && analytics.haltAnalysis.reason && (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h3
            style={{
              margin: '0 0 20px 0',
              fontSize: '1.3em',
              color: '#1a1a1a',
              borderBottom: '2px solid #ff9800',
              paddingBottom: '12px',
            }}
          >
            🔴 Halt Contributing Factors
          </h3>
          <HaltFactorsChart factors={analytics.haltAnalysis.reason.factors} />
        </div>
      )}

      {/* Wait Time Breakdown Chart */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h3
          style={{
            margin: '0 0 20px 0',
            fontSize: '1.3em',
            color: '#1a1a1a',
            borderBottom: '2px solid #1976d2',
            paddingBottom: '12px',
          }}
        >
          ⏱️ Wait Time Breakdown
        </h3>
        <WaitTimeBreakdownChart breakdown={analytics.waitTimePrediction.breakdown} />
      </div>

      {/* Section Congestion Chart */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h3
          style={{
            margin: '0 0 20px 0',
            fontSize: '1.3em',
            color: '#1a1a1a',
            borderBottom: '2px solid #4caf50',
            paddingBottom: '12px',
          }}
        >
          🛤️ Section Congestion Network
        </h3>
        <SectionCongestionChart heatmap={analytics.sectionAnalytics.networkHeatmap} />
      </div>

      {/* Timeline Chart */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          gridColumn: 'span 2',
        }}
      >
        <h3
          style={{
            margin: '0 0 20px 0',
            fontSize: '1.3em',
            color: '#1a1a1a',
            borderBottom: '2px solid #667eea',
            paddingBottom: '12px',
          }}
        >
          📈 Train Movement Timeline
        </h3>
        <TrainTimelineChart
          speed={analytics.speed}
          delay={analytics.delay}
          movementState={analytics.movementState}
        />
      </div>
    </div>
  );
}

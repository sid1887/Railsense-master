'use client';

import React, { useMemo } from 'react';

/**
 * Wait Time Breakdown Chart
 * Stacked bar chart showing components of total wait time
 */

interface Breakdown {
  totalWaitTime: number;
  baseStopDuration: number;
  trafficDelay: number;
  weatherDelay: number;
  delayCarryover: number;
  operationalDelay: number;
  confidence: number;
}

interface WaitTimeBreakdownChartProps {
  breakdown: Breakdown;
}

export default function WaitTimeBreakdownChart({ breakdown }: WaitTimeBreakdownChartProps) {
  const components = useMemo(() => {
    return [
      { label: 'Scheduled Stop', value: breakdown.baseStopDuration, color: '#1976d2' },
      { label: 'Traffic Delay', value: breakdown.trafficDelay, color: '#ff9800' },
      { label: 'Weather Impact', value: breakdown.weatherDelay, color: '#2196f3' },
      { label: 'Prior Delay', value: breakdown.delayCarryover, color: '#d32f2f' },
      { label: 'Operations', value: breakdown.operationalDelay, color: '#9c27b0' },
    ].filter((c) => c.value > 0);
  }, [breakdown]);

  const total = components.reduce((sum, c) => sum + c.value, 0);

  return (
    <div>
      {/* Stacked Bar */}
      <div
        style={{
          display: 'flex',
          height: '40px',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '24px',
          background: '#e0e0e0',
        }}
      >
        {components.map((component, idx) => (
          <div
            key={idx}
            style={{
              width: `${(component.value / total) * 100}%`,
              background: component.color,
              transition: 'width 0.3s ease',
              minWidth: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.75em',
              fontWeight: '600',
              padding: '0 4px',
            }}
            title={`${component.label}: ${component.value} min`}
          >
            {component.value > 0 && component.value > total * 0.1 && component.value}
          </div>
        ))}
      </div>

      {/* Legend & Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {components.map((component, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9em',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                background: component.color,
              }}
            />
            <span style={{ color: '#424242' }}>{component.label}:</span>
            <strong style={{ color: component.color }}>{component.value} min</strong>
          </div>
        ))}
      </div>

      {/* Total Summary */}
      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          background: '#e3f2fd',
          borderRadius: '8px',
          borderLeft: '4px solid #1976d2',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '600', color: '#1a1a1a' }}>Total Wait Time</span>
          <span
            style={{
              fontSize: '1.5em',
              fontWeight: '700',
              color: '#1976d2',
            }}
          >
            {breakdown.totalWaitTime} min
          </span>
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.9em', color: '#757575' }}>
          Prediction confidence: {breakdown.confidence}%
        </p>
      </div>
    </div>
  );
}

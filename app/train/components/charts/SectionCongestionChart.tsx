'use client';

import React from 'react';

/**
 * Section Congestion Chart
 * Network heatmap showing congestion levels across railway sections
 */

interface SectionCongestionChartProps {
  heatmap: Record<string, number>;
}

export default function SectionCongestionChart({ heatmap }: SectionCongestionChartProps) {
  if (!heatmap || Object.keys(heatmap).length === 0) {
    return <p style={{ color: '#757575', textAlign: 'center' }}>No section data available</p>;
  }

  const getColor = (value: number) => {
    if (value > 70) return '#d32f2f'; // High - Red
    if (value > 40) return '#ff9800'; // Medium - Orange
    return '#4caf50'; // Low - Green
  };

  const getLabel = (value: number) => {
    if (value > 70) return 'High';
    if (value > 40) return 'Medium';
    return 'Low';
  };

  const sortedSections = Object.entries(heatmap).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      {/* Network Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {sortedSections.map(([section, level]) => (
          <div
            key={section}
            style={{
              background: getColor(level),
              color: 'white',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              transition: 'transform 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            }}
            title={`${section}: ${level}% congestion`}
          >
            <div style={{ fontSize: '1.1em', fontWeight: '700', marginBottom: '4px' }}>{section}</div>
            <div style={{ fontSize: '0.85em', opacity: 0.9 }}>{level}%</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#1a1a1a' }}>Congestion Levels:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                background: '#4caf50',
              }}
            />
            <span style={{ fontSize: '0.9em', color: '#424242' }}>Low (&lt;40%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                background: '#ff9800',
              }}
            />
            <span style={{ fontSize: '0.9em', color: '#424242' }}>Medium (40-70%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                background: '#d32f2f',
              }}
            />
            <span style={{ fontSize: '0.9em', color: '#424242' }}>High (&gt;70%)</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          background: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#757575' }}>
          <strong>Sections Analyzed:</strong> {Object.keys(heatmap).length}
        </p>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#757575' }}>
          <strong>Average Congestion:</strong>{' '}
          {Math.round(Object.values(heatmap).reduce((a, b) => a + b, 0) / Object.keys(heatmap).length)}%
        </p>
        <p style={{ margin: '0', fontSize: '0.9em', color: '#757575' }}>
          <strong>Peak Section:</strong> {sortedSections[0][0]} ({sortedSections[0][1]}%)
        </p>
      </div>
    </div>
  );
}

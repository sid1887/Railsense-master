'use client';

import React from 'react';

/**
 * Halt Factors Chart
 * Bar chart showing factors contributing to train halt with their weights
 */

interface Factor {
  factor: string;
  weight: number;
  evidence: string;
}

interface HaltFactorsChartProps {
  factors: Factor[];
}

export default function HaltFactorsChart({ factors }: HaltFactorsChartProps) {
  if (!factors || factors.length === 0) {
    return <p style={{ color: '#757575', textAlign: 'center' }}>No halt factors identified</p>;
  }

  // Sort by weight descending
  const sortedFactors = [...factors].sort((a, b) => b.weight - a.weight);
  const maxWeight = Math.max(...sortedFactors.map((f) => f.weight));

  return (
    <div>
      {sortedFactors.map((factor, idx) => {
        const percentage = (factor.weight / maxWeight) * 100;
        const color = percentage > 70 ? '#d32f2f' : percentage > 40 ? '#ff9800' : '#4caf50';

        return (
          <div key={idx} style={{ marginBottom: '20px' }}>
            {/* Factor Name & Weight */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: '600', textTransform: 'capitalize', color: '#1a1a1a' }}>
                {factor.factor.replace(/_/g, ' ')}
              </span>
              <span
                style={{
                  background: color,
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '0.85em',
                  fontWeight: '600',
                }}
              >
                {Math.round(factor.weight * 100)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                height: '8px',
                background: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '6px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: color,
                  width: `${percentage}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Evidence */}
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '0.9em',
                color: '#757575',
              }}
            >
              {factor.evidence}
            </p>
          </div>
        );
      })}
    </div>
  );
}

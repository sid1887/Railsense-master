'use client';

import React, { useMemo } from 'react';

/**
 * Train Timeline Chart
 * Visual representation of train movement state and metrics over time
 */

interface TrainTimelineChartProps {
  speed: number;
  delay: number;
  movementState: string;
}

export default function TrainTimelineChart({
  speed,
  delay,
  movementState,
}: TrainTimelineChartProps) {
  // Generate mock timeline data (in real implementation, this would come from historical data)
  const timelineData = useMemo(() => {
    const now = new Date();
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const time = new Date(now);
      time.setMinutes(time.getMinutes() - i * 30);

      // Simulate speed and delay changes
      const speedVariation = Math.max(0, speed - i * 5 + Math.random() * 10);
      const delayVariation = delay + i * 2 + Math.random() * 5;

      data.push({
        time: time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        speed: Math.round(speedVariation),
        delay: Math.round(delayVariation),
      });
    }

    return data;
  }, [speed, delay]);

  const maxSpeed = Math.max(...timelineData.map((d) => d.speed), 80);
  const maxDelay = Math.max(...timelineData.map((d) => d.delay), 10);

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'running':
        return '#4caf50';
      case 'halted':
        return '#ff9800';
      case 'stalled':
        return '#d32f2f';
      default:
        return '#757575';
    }
  };

  return (
    <div>
      {/* Status Indicator */}
      <div
        style={{
          background: getStatusColor(movementState),
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: '600',
          textTransform: 'uppercase',
        }}
      >
        Current Status: {movementState}
      </div>

      {/* Timeline Graph */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: '200px',
          marginBottom: '20px',
          gap: '12px',
          padding: '12px',
          background: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        {timelineData.map((point, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {/* Speed Bar */}
            <div
              style={{
                width: '100%',
                height: `${(point.speed / maxSpeed) * 150}px`,
                background: '#1976d2',
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              title={`Speed: ${point.speed} km/h`}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = '#1565c0';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = '#1976d2';
              }}
            />

            {/* Time Label */}
            <span style={{ fontSize: '0.75em', color: '#757575', fontWeight: '500' }}>
              {point.time}
            </span>
          </div>
        ))}
      </div>

      {/* Stats Table */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
        }}
      >
        <div
          style={{
            background: '#e3f2fd',
            padding: '16px',
            borderRadius: '8px',
            borderLeft: '4px solid #1976d2',
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: '0.85em', color: '#757575' }}>Current Speed</p>
          <p style={{ margin: '0', fontSize: '1.6em', fontWeight: '700', color: '#1976d2' }}>
            {speed}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75em', color: '#757575' }}>km/h</p>
        </div>

        <div
          style={{
            background: '#fff3e0',
            padding: '16px',
            borderRadius: '8px',
            borderLeft: '4px solid #ff9800',
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: '0.85em', color: '#757575' }}>Current Delay</p>
          <p style={{ margin: '0', fontSize: '1.6em', fontWeight: '700', color: '#ff9800' }}>
            {delay > 0 ? '+' : ''}{delay}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75em', color: '#757575' }}>minutes</p>
        </div>

        <div
          style={{
            background: '#f3e5f5',
            padding: '16px',
            borderRadius: '8px',
            borderLeft: '4px solid #667eea',
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: '0.85em', color: '#757575' }}>Avg Speed</p>
          <p
            style={{
              margin: '0',
              fontSize: '1.6em',
              fontWeight: '700',
              color: '#667eea',
            }}
          >
            {Math.round(timelineData.reduce((sum, d) => sum + d.speed, 0) / timelineData.length)}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75em', color: '#757575' }}>km/h</p>
        </div>
      </div>

      {/* Trend Line */}
      <div
        style={{
          marginTop: '20px',
          padding: '12px',
          background: '#e8f5e9',
          borderRadius: '8px',
          fontSize: '0.9em',
          color: '#2e7d32',
        }}
      >
        <strong>📊 Trend:</strong>{' '}
        {speed > 50 ? 'Train is moving at good speed' : 'Train speed is reduced'}
        {delay > 20 ? ' with significant delays' : delay > 0 ? ' with minor delays' : ' and on schedule'}
      </div>
    </div>
  );
}

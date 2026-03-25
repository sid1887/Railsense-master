'use client';

import React from 'react';
import { Train, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import './design-system.css';

interface StatusBarProps {
  trackingCount?: number;
  haltedCount?: number;
  averageDelay?: number;
  lastUpdated?: string;
  selectedTrain?: string;
  onTrainSelect?: (trainNumber: string) => void;
  nearbyTrains?: Array<{ number: string; status: 'halted' | 'moving' | 'delayed' }>;
}

export default function StatusBar({
  trackingCount = 5,
  haltedCount = 2,
  averageDelay = 8,
  lastUpdated = '12:34:56 PM',
  selectedTrain = '14645',
  onTrainSelect,
  nearbyTrains: nearbyTrainsOverride,
}: StatusBarProps) {
  const nearbyTrains = nearbyTrainsOverride || [
    { number: '12955', status: 'halted' as const },
    { number: '14645', status: 'moving' as const },
    { number: '15432', status: 'halted' as const },
    { number: '16789', status: 'moving' as const },
    { number: '17654', status: 'delayed' as const },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        zIndex: 1000,
        backgroundColor: 'rgba(19, 24, 41, 0.8)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid hsl(220, 14%, 18%)',
        borderRadius: '16px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
      }}
    >
      {/* LEFT SECTION — System Stats */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {/* Tracking Stat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Train size={16} style={{ color: 'hsl(160, 84%, 44%)' }} />
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'hsl(215, 12%, 50%)',
              }}
            >
              Tracking
            </div>
            <div
              style={{
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                fontWeight: '700',
                color: 'hsl(210, 20%, 92%)',
              }}
            >
              {trackingCount}
            </div>
          </div>
        </div>

        {/* Halted Stat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} style={{ color: 'hsl(0, 72%, 55%)' }} />
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'hsl(215, 12%, 50%)',
              }}
            >
              Halted
            </div>
            <div
              style={{
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                fontWeight: '700',
                color: 'hsl(0, 72%, 55%)',
              }}
            >
              {haltedCount}
            </div>
          </div>
        </div>

        {/* Avg Delay Stat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} style={{ color: 'hsl(38, 92%, 55%)' }} />
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'hsl(215, 12%, 50%)',
              }}
            >
              Avg Delay
            </div>
            <div
              style={{
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                fontWeight: '700',
                color: 'hsl(38, 92%, 55%)',
              }}
            >
              +{averageDelay}m
            </div>
          </div>
        </div>
      </div>

      {/* CENTER — Last Updated */}
      <div
        style={{
          opacity: 0.6,
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: 'hsl(215, 12%, 50%)',
        }}
        className="hide-mobile"
      >
        Last updated: {lastUpdated}
      </div>

      {/* RIGHT SECTION — Train Selector */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginLeft: 'auto',
          overflow: 'auto',
          paddingRight: '4px',
        }}
      >
        {nearbyTrains.map((train) => {
          const isSelected = train.number === selectedTrain;
          const statusColor =
            train.status === 'halted'
              ? 'hsl(0, 72%, 55%)'
              : train.status === 'delayed'
                ? 'hsl(38, 92%, 55%)'
                : 'hsl(160, 84%, 44%)';

          const statusBg =
            train.status === 'halted'
              ? 'rgba(230, 57, 70, 0.1)'
              : train.status === 'delayed'
                ? 'rgba(252, 163, 17, 0.1)'
                : 'rgba(29, 209, 176, 0.1)';

          return (
            <button
              key={train.number}
              onClick={() => onTrainSelect?.(train.number)}
              style={{
                backgroundColor: isSelected ? statusBg : 'hsl(220, 16%, 14%)',
                color: isSelected ? statusColor : 'hsl(210, 20%, 92%)',
                border: isSelected ? `1px solid ${statusColor}` : '1px solid hsl(220, 14%, 18%)',
                borderRadius: '8px',
                paddingLeft: '8px',
                paddingRight: '10px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: statusColor,
                }}
              />
              {train.number}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

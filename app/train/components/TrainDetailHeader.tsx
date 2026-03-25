'use client';

import React from 'react';
import { Train, Gauge, Clock, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { TrainAnalytics } from '@/types/analytics';
import './design-system.css';

interface TrainDetailHeaderProps {
  analytics: TrainAnalytics;
}

export default function TrainDetailHeader({ analytics }: TrainDetailHeaderProps) {
  const statusColor =
    analytics.movementState === 'running'
      ? 'hsl(160, 84%, 44%)'
      : analytics.movementState === 'halted'
        ? 'hsl(0, 72%, 55%)'
        : 'hsl(38, 92%, 55%)';

  const statusBgColor =
    analytics.movementState === 'running'
      ? 'rgba(29, 209, 176, 0.15)'
      : analytics.movementState === 'halted'
        ? 'rgba(230, 57, 70, 0.15)'
        : 'rgba(252, 163, 17, 0.15)';

  const confidenceColor =
    analytics.haltConfidence > 70
      ? 'hsl(160, 84%, 44%)'
      : analytics.haltConfidence > 40
        ? 'hsl(38, 92%, 55%)'
        : 'hsl(0, 72%, 55%)';

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="card"
      style={{
        gridColumn: '1 / -1',
        padding: '24px',
        marginBottom: '24px',
      }}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 250px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN - Train Info */}
        <motion.div variants={itemVariants}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <Train size={20} style={{ color: 'hsl(160, 84%, 44%)' }} />
            <div>
              <h1
                className="display-md"
                style={{
                  color: 'hsl(210, 20%, 92%)',
                  margin: 0,
                }}
              >
                {analytics.trainName}
              </h1>
              <p
                style={{
                  fontSize: '13px',
                  color: 'hsl(215, 12%, 50%)',
                  margin: '4px 0 0 0',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Train {analytics.trainNumber} · {analytics.currentLocation.stationName} → {analytics.destinationStation}
              </p>
            </div>
          </div>

          {/* Metrics Row */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
            {/* Speed Metric */}
            <motion.div variants={itemVariants}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <Gauge
                  size={16}
                  style={{
                    color:
                      analytics.speed > 0
                        ? 'hsl(160, 84%, 44%)'
                        : 'hsl(0, 72%, 55%)',
                    marginBottom: '6px',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'hsl(215, 12%, 50%)',
                    marginBottom: '4px',
                  }}
                >
                  Speed
                </span>
                <span
                  style={{
                    fontSize: '28px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '700',
                    color:
                      analytics.speed > 0
                        ? 'hsl(160, 84%, 44%)'
                        : 'hsl(0, 72%, 55%)',
                  }}
                >
                  {analytics.speed}
                </span>
                <span style={{ fontSize: '11px', color: 'hsl(215, 12%, 50%)' }}>km/h</span>
              </div>
            </motion.div>

            {/* Delay Metric */}
            <motion.div variants={itemVariants}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <Clock
                  size={16}
                  style={{
                    color: 'hsl(38, 92%, 55%)',
                    marginBottom: '6px',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'hsl(215, 12%, 50%)',
                    marginBottom: '4px',
                  }}
                >
                  Delay
                </span>
                <span
                  style={{
                    fontSize: '28px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '700',
                    color: 'hsl(38, 92%, 55%)',
                  }}
                >
                  {analytics.delay > 0 ? '+' : ''}{analytics.delay}
                </span>
                <span style={{ fontSize: '11px', color: 'hsl(215, 12%, 50%)' }}>minutes</span>
              </div>
            </motion.div>

            {/* Confidence Metric */}
            <motion.div variants={itemVariants}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <Shield
                  size={16}
                  style={{
                    color: confidenceColor,
                    marginBottom: '6px',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'hsl(215, 12%, 50%)',
                    marginBottom: '4px',
                  }}
                >
                  Confidence
                </span>
                <span
                  style={{
                    fontSize: '28px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '700',
                    color: confidenceColor,
                  }}
                >
                  {analytics.haltConfidence}
                </span>
                <span style={{ fontSize: '11px', color: 'hsl(215, 12%, 50%)' }}>%</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN - Status Badge */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: statusBgColor,
              border: `2px solid ${statusColor}`,
              borderRadius: '20px',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow:
                analytics.movementState === 'halted'
                  ? '0 0 20px rgba(230, 57, 70, 0.3), 0 0 60px rgba(230, 57, 70, 0.1)'
                  : 'none',
              animation: analytics.movementState === 'halted' ? 'glow-fade 2s ease-in-out infinite' : 'none',
            }}
          >
            {/* Pulsing dot for halted */}
            {analytics.movementState === 'halted' && (
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: statusColor,
                  animation: 'halt-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            )}
            {/* Solid dot for moving/delayed */}
            {analytics.movementState !== 'halted' && (
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: statusColor,
                }}
              />
            )}
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
                color: statusColor,
                letterSpacing: '0.05em',
              }}
            >
              {analytics.movementState.toUpperCase()}
            </span>
          </div>
        </motion.div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes halt-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        @keyframes glow-fade {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </motion.div>
  );
}

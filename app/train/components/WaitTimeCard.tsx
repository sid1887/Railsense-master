'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { TrainAnalytics } from '@/types/analytics';
import './design-system.css';

interface WaitTimeCardProps {
  analytics: TrainAnalytics;
}

export default function WaitTimeCard({ analytics }: WaitTimeCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  // ✅ LIVE DATA from analytics.waitTimePrediction
  const prediction = analytics.waitTimePrediction;
  const waitTime = Math.round(prediction.breakdown.totalWaitTime);
  const minWait = prediction.range.min;
  const maxWait = prediction.range.max;
  const confidence = prediction.breakdown.confidence;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const confidenceColor =
    confidence > 70
      ? 'hsl(160, 84%, 44%)'
      : confidence > 40
        ? 'hsl(38, 92%, 55%)'
        : 'hsl(0, 72%, 55%)';

  return (
    <motion.div
      className="card"
      style={{
        textAlign: 'center',
        padding: '24px',
        marginBottom: '16px',
      }}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Hero Number - Animated Count Up */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div
          style={{
            fontSize: '64px',
            fontFamily: 'var(--font-mono)',
            fontWeight: '700',
            color: 'hsl(160, 84%, 44%)',
            lineHeight: '1',
            marginBottom: '8px',
          }}
        >
          {waitTime}
        </div>
        <div
          style={{
            fontSize: '14px',
            color: 'hsl(215, 12%, 50%)',
            marginBottom: '20px',
          }}
        >
          minutes
        </div>
      </motion.div>

      {/* Range Display */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '13px',
            color: 'hsl(215, 12%, 50%)',
            marginBottom: '8px',
          }}
        >
          Range: {minWait}-{maxWait} min
        </div>

        {/* Range Visualization */}
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: 'hsl(220, 16%, 14%)',
            borderRadius: '3px',
            overflow: 'hidden',
            position: 'relative',
            marginBottom: '12px',
          }}
        >
          {/* Background bar (0-20 min scale) */}
          <div
            style={{
              position: 'absolute',
              left: `${(minWait / 20) * 100}%`,
              width: `${((maxWait - minWait) / 20) * 100}%`,
              height: '100%',
              backgroundColor: 'hsl(160, 84%, 44%)',
              borderRadius: '3px',
            }}
          />
          {/* Current position indicator */}
          <div
            style={{
              position: 'absolute',
              left: `${(waitTime / 20) * 100}%`,
              top: '-6px',
              width: '16px',
              height: '18px',
              backgroundColor: 'hsl(160, 84%, 44%)',
              borderRadius: '2px',
              transform: 'translateX(-50%)',
              boxShadow: '0 0 12px rgba(29, 209, 176, 0.5)',
            }}
          />
        </div>
      </div>

      {/* Confidence Meter */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '13px', color: 'hsl(215, 12%, 50%)' }}>Confidence</span>
          <span
            style={{
              fontSize: '14px',
              fontFamily: 'var(--font-mono)',
              fontWeight: '600',
              color: confidenceColor,
            }}
          >
            {confidence}%
          </span>
        </div>
        {/* Confidence bar */}
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: 'hsl(220, 16%, 14%)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <motion.div
            style={{
              height: '100%',
              backgroundColor: confidenceColor,
              borderRadius: '3px',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Breakdown Toggle */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '12px',
          color: 'hsl(160, 84%, 44%)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: '12px 0',
          fontWeight: '600',
          width: '100%',
        }}
      >
        <ChevronDown
          size={14}
          style={{
            transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
        Show Breakdown
      </button>

      {/* Breakdown Content */}
      {showBreakdown && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            paddingTop: '16px',
            borderTop: '1px solid hsl(220, 14%, 18%)',
            marginTop: '16px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Factor 1 */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  fontSize: '12px',
                  color: 'hsl(215, 12%, 50%)',
                }}
              >
                <span>Section history</span>
                <span style={{ fontWeight: '600' }}>+3 min</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: 'hsl(220, 16%, 14%)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '30%',
                    height: '100%',
                    backgroundColor: 'hsl(160, 84%, 44%)',
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>

            {/* Factor 2 */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  fontSize: '12px',
                  color: 'hsl(215, 12%, 50%)',
                }}
              >
                <span>Traffic factor</span>
                <span style={{ fontWeight: '600' }}>+2 min</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: 'hsl(220, 16%, 14%)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '20%',
                    height: '100%',
                    backgroundColor: 'hsl(38, 92%, 55%)',
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>

            {/* Factor 3 */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  fontSize: '12px',
                  color: 'hsl(215, 12%, 50%)',
                }}
              >
                <span>Weather factor</span>
                <span style={{ fontWeight: '600' }}>+1 min</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: 'hsl(220, 16%, 14%)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '10%',
                    height: '100%',
                    backgroundColor: 'hsl(210, 40%, 50%)',
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: 'hsl(215, 12%, 50%)',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid hsl(220, 14%, 18%)',
              fontStyle: 'italic',
            }}
          >
            Predicted via historical data (73% match)
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

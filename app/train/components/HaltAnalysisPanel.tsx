'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { TrainAnalytics } from '@/types/analytics';
import './design-system.css';

interface HaltAnalysisPanelProps {
  analytics: TrainAnalytics;
}

export default function HaltAnalysisPanel({ analytics }: HaltAnalysisPanelProps) {
  const [expandedAdvanced, setExpandedAdvanced] = useState(false);

  // Determine severity based on confidence
  const severity =
    analytics.haltConfidence > 80
      ? 'HIGH'
      : analytics.haltConfidence > 50
        ? 'MEDIUM'
        : 'LOW';

  const severityColor =
    severity === 'HIGH'
      ? 'rgba(230, 57, 70, 0.15)'
      : severity === 'MEDIUM'
        ? 'rgba(252, 163, 17, 0.15)'
        : 'rgba(29, 209, 176, 0.15)';

  const severityTextColor =
    severity === 'HIGH'
      ? 'hsl(0, 72%, 55%)'
      : severity === 'MEDIUM'
        ? 'hsl(38, 92%, 55%)'
        : 'hsl(160, 84%, 44%)';

  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      className="card-halt"
      style={{
        padding: '20px',
        marginBottom: '16px',
      }}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header Row */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} style={{ color: 'hsl(0, 72%, 55%)' }} />
          <h2
            className="heading-md"
            style={{
              color: 'hsl(210, 20%, 92%)',
              margin: 0,
            }}
          >
            Halt Analysis
          </h2>
        </div>
        <div
          style={{
            backgroundColor: severityColor,
            color: severityTextColor,
            border: `1px solid ${severityTextColor}`,
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
          }}
        >
          {severity}
        </div>
      </motion.div>

      {/* Reasons List */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* Reason 1 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid hsl(220, 14%, 18%)',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'hsl(0, 72%, 55%)',
            }}
          />
          <span
            style={{
              fontSize: '13px',
              color: 'hsl(210, 20%, 92%)',
              flex: 1,
            }}
          >
            Platform Unavailable
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'hsl(215, 12%, 50%)',
              fontWeight: '600',
            }}
          >
            87%
          </span>
        </div>

        {/* Reason 2 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid hsl(220, 14%, 18%)',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'hsl(38, 92%, 55%)',
            }}
          />
          <span
            style={{
              fontSize: '13px',
              color: 'hsl(210, 20%, 92%)',
              flex: 1,
            }}
          >
            Nearby Section Congestion
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'hsl(215, 12%, 50%)',
              fontWeight: '600',
            }}
          >
            65%
          </span>
        </div>

        {/* Reason 3 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'hsl(160, 84%, 44%)',
            }}
          />
          <span
            style={{
              fontSize: '13px',
              color: 'hsl(210, 20%, 92%)',
              flex: 1,
            }}
          >
            Scheduled Halt
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'hsl(215, 12%, 50%)',
              fontWeight: '600',
            }}
          >
            45%
          </span>
        </div>
      </motion.div>

      {/* Supporting Evidence */}
      <motion.div
        variants={itemVariants}
        style={{
          backgroundColor: 'rgba(29, 209, 176, 0.05)',
          border: '1px solid rgba(29, 209, 176, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '12px',
          lineHeight: '1.5',
        }}
      >
        <div style={{ color: 'hsl(210, 20%, 92%)', marginBottom: '4px' }}>
          <span style={{ fontStyle: 'italic' }}>Suggested action:</span> Platform 3 is now available. Move allocation
          to this platform immediately.
        </div>
        <div
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'hsl(215, 12%, 50%)',
          }}
        >
          Source: NTES at 13:24:30
        </div>
      </motion.div>

      {/* Estimated Resume */}
      <motion.div
        variants={itemVariants}
        style={{
          backgroundColor: 'hsl(220, 16%, 14%)',
          border: '1px solid hsl(220, 14%, 18%)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'hsl(215, 12%, 50%)',
            marginBottom: '6px',
          }}
        >
          Estimated Resume
        </div>
        <div
          style={{
            fontSize: '20px',
            fontFamily: 'var(--font-mono)',
            fontWeight: '700',
            color: 'hsl(160, 84%, 44%)',
            marginBottom: '8px',
          }}
        >
          ~5-12 minutes
        </div>
        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: 'hsl(220, 14%, 18%)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <motion.div
            style={{
              height: '100%',
              backgroundColor: 'hsl(160, 84%, 44%)',
              borderRadius: '3px',
            }}
            initial={{ width: '0%' }}
            animate={{ width: '35%' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Advanced Analysis Collapsible */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => setExpandedAdvanced(!expandedAdvanced)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'hsl(160, 84%, 44%)',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: '0',
            fontWeight: '600',
          }}
        >
          <ChevronDown
            size={14}
            style={{
              transform: expandedAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
          Advanced Analysis
        </button>

        {/* Expandable Content */}
        {expandedAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid hsl(220, 14%, 18%)',
              fontSize: '12px',
              color: 'hsl(215, 12%, 50%)',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: 'hsl(210, 20%, 92%)' }}>Contributing Factors:</strong>
            </div>
            <ul style={{ margin: '0', paddingLeft: '20px', color: 'hsl(215, 12%, 50%)' }}>
              <li>Platform allocation conflict detected</li>
              <li>Adjacent section congestion (2 trains halted)</li>
              <li>Signal aspect shows caution</li>
              <li>Scheduled maintenance window approaching</li>
            </ul>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

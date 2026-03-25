'use client';

import React from 'react';
import { GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';
import './design-system.css';

interface RailwaySectionData {
  code: string;
  name: string;
  congestion: number; // 0-100
}

interface NearbyRailwaySectionsProps {
  sections?: RailwaySectionData[];
}

export default function NearbyRailwaySections({
  sections = [
    { code: 'SC1', name: 'Secunderabad - Kachiguda', congestion: 85 },
    { code: 'SC2', name: 'Kachiguda - Tandur', congestion: 45 },
    { code: 'SC3', name: 'Tandur - Kurnool', congestion: 20 },
    { code: 'SC4', name: 'Kurnool - Guntakal', congestion: 62 },
  ],
}: NearbyRailwaySectionsProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  const getCongestionColor = (congestion: number) => {
    if (congestion > 75) return 'hsl(0, 72%, 55%)'; // Red
    if (congestion > 40) return 'hsl(38, 92%, 55%)'; // Amber
    return 'hsl(160, 84%, 44%)'; // Green
  };

  const getCongestionBg = (congestion: number) => {
    if (congestion > 75) return 'rgba(230, 57, 70, 0.15)';
    if (congestion > 40) return 'rgba(252, 163, 17, 0.15)';
    return 'rgba(29, 209, 176, 0.15)';
  };

  const avgCongestion = Math.round(sections.reduce((sum, s) => sum + s.congestion, 0) / sections.length);
  const peakSection = sections.reduce((max, s) => (s.congestion > max.congestion ? s : max));

  return (
    <motion.div
      className="card"
      style={{
        padding: '20px',
        marginBottom: '16px',
      }}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
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
          <GitBranch size={16} style={{ color: 'hsl(160, 84%, 44%)' }} />
          <h2
            className="heading-md"
            style={{
              color: 'hsl(210, 20%, 92%)',
              margin: 0,
            }}
          >
            Nearby Railway Sections
          </h2>
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'hsl(0, 0%, 98%)',
            backgroundColor: 'rgba(139, 92, 246, 0.16)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            padding: '4px 10px',
            borderRadius: '999px',
            fontWeight: 600,
          }}
        >
          {sections.length} nearby
        </div>
      </motion.div>

      {/* Section Bars */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {sections.map((section, index) => {
          const color = getCongestionColor(section.congestion);
          const bgColor = getCongestionBg(section.congestion);

          return (
            <motion.div
              key={section.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background-color 150ms ease',
                borderRadius: '8px',
                padding: '4px 6px',
              }}
            >
              {/* Section Code Pill */}
              <div
                style={{
                  backgroundColor: bgColor,
                  color: color,
                  border: `1px solid ${color}`,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: '600',
                  minWidth: '50px',
                  textAlign: 'center',
                }}
              >
                {section.code}
              </div>

              {/* Section Name */}
              <div
                style={{
                  fontSize: '11px',
                  color: 'hsl(215, 12%, 50%)',
                  minWidth: '140px',
                }}
              >
                {section.name}
              </div>

              {/* Congestion Bar */}
              <div
                style={{
                  flex: 1,
                  height: '12px',
                  backgroundColor: 'hsl(220, 16%, 14%)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  style={{
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: '6px',
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${section.congestion}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                />
              </div>

              {/* Percentage */}
              <div
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: '600',
                  color: color,
                  minWidth: '35px',
                  textAlign: 'right',
                }}
              >
                {section.congestion}%
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Legend */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          gap: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid hsl(220, 14%, 18%)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'hsl(0, 72%, 55%)',
            }}
          />
          <span style={{ color: 'hsl(215, 12%, 50%)' }}>High (&gt;75%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'hsl(38, 92%, 55%)',
            }}
          />
          <span style={{ color: 'hsl(215, 12%, 50%)' }}>Medium (40-75%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'hsl(160, 84%, 44%)',
            }}
          />
          <span style={{ color: 'hsl(215, 12%, 50%)' }}>Low (&lt;40%)</span>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          gap: '24px',
          fontSize: '12px',
          color: 'hsl(215, 12%, 50%)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div>
          <span style={{ fontWeight: '600', color: 'hsl(210, 20%, 92%)' }}>Nearby trains:</span> {sections.length * 2}
        </div>
        <div>
          <span style={{ fontWeight: '600', color: 'hsl(210, 20%, 92%)' }}>Avg congestion:</span> {avgCongestion}%
        </div>
        <div>
          <span style={{ fontWeight: '600', color: 'hsl(210, 20%, 92%)' }}>Peak section:</span> {peakSection.code}
        </div>
      </motion.div>
    </motion.div>
  );
}

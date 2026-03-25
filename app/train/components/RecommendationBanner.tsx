'use client';

import React from 'react';
import { Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecommendationBannerProps {
  text?: string;
}

export default function RecommendationBanner({
  text = 'Move to platform 3 to board the next available service',
}: RecommendationBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      style={{
        background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.16) 0%, rgba(139, 92, 246, 0.06) 100%)',
        borderLeft: '3px solid hsl(262, 83%, 58%)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <Lightbulb
        size={16}
        style={{
          color: 'hsl(262, 83%, 58%)',
          marginTop: '2px',
          flexShrink: 0,
        }}
      />
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'hsl(262, 83%, 58%)',
            marginBottom: '4px',
          }}
        >
          Recommendation
        </div>
        <div
          style={{
            fontSize: '14px',
            color: 'hsl(210, 20%, 92%)',
            lineHeight: '1.5',
          }}
        >
          {text}
        </div>
      </div>
    </motion.div>
  );
}

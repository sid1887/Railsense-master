'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface Insight {
  level: 'success' | 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action?: string;
}

interface InsightsPanelProps {
  insights: Insight[];
}

/**
 * Insights Panel Component
 * Displays system insights and recommendations
 */
export default function InsightsPanel({ insights }: InsightsPanelProps) {
  const getIconAndColor = (level: string) => {
    switch (level) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-900/20',
          borderColor: 'border-green-700',
          textColor: 'text-green-300',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-900/20',
          borderColor: 'border-yellow-700',
          textColor: 'text-yellow-300',
        };
      case 'critical':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-900/20',
          borderColor: 'border-red-700',
          textColor: 'text-red-300',
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-900/20',
          borderColor: 'border-blue-700',
          textColor: 'text-blue-300',
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-text-primary">Insights & Recommendations</h3>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {insights.length === 0 ? (
          <p className="text-text-secondary text-sm">No insights at this time</p>
        ) : (
          insights.map((insight, idx) => {
            const { icon: Icon, bgColor, borderColor, textColor } = getIconAndColor(
              insight.level
            );

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded border space-y-2 ${bgColor} ${borderColor}`}
              >
                <div className="flex items-start gap-3">
                  <Icon size={20} className={`shrink-0 mt-0.5 ${textColor}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm ${textColor}`}>{insight.title}</h4>
                    <p className="text-xs text-text-secondary mt-1">{insight.description}</p>

                    {insight.action && (
                      <p className={`text-xs font-semibold ${textColor} mt-2`}>
                        ➜ {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

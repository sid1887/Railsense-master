'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Clock,
  MapPin,
  Train,
  X,
} from 'lucide-react';
import { PassengerAlert } from '@/services/passengerAlertService';

interface ConnectionAlertCardProps {
  alert: PassengerAlert;
  onDismiss?: (alertId: string) => void;
  onAction?: (action: string, alertId: string) => void;
  compact?: boolean;
}

/**
 * ConnectionAlertCard Component
 * Displays individual passenger alerts with action buttons
 */
export default function ConnectionAlertCard({
  alert,
  onDismiss,
  onAction,
  compact = false,
}: ConnectionAlertCardProps) {
  const [expanded, setExpanded] = useState(!compact);

  const getIcon = () => {
    switch (alert.severity) {
      case 'critical':
        return AlertTriangle;
      case 'warning':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getColors = () => {
    switch (alert.severity) {
      case 'critical':
        return {
          bg: 'rgba(230, 57, 70, 0.1)',
          border: '#e63946',
          text: '#e63946',
        };
      case 'warning':
        return {
          bg: 'rgba(252, 163, 17, 0.1)',
          border: '#fca311',
          text: '#fca311',
        };
      default:
        return {
          bg: 'rgba(88, 199, 250, 0.1)',
          border: '#58c7fa',
          text: '#58c7fa',
        };
    }
  };

  const Icon = getIcon();
  const colors = getColors();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-lg border p-4 transition-all"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderLeft: `4px solid ${colors.border}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <motion.div
          animate={alert.severity === 'critical' ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon size={20} style={{ color: colors.text }} className="mt-0.5 shrink-0" />
        </motion.div>

        {/* Title & Message */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary text-sm">{alert.title}</h3>

          {/* Show message if expanded or not compact */}
          {(expanded || !compact) && (
            <p className="text-xs text-text-secondary mt-1">{alert.message}</p>
          )}

          {/* Connection Details */}
          {alert.affectedConnection && (
            <motion.div
              initial={expanded ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
              animate={expanded ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-2 space-y-1 text-xs text-text-secondary"
            >
              <div className="flex items-center gap-2">
                <Train size={14} />
                <span>{alert.affectedConnection.trainNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <span>{alert.affectedConnection.boardingStation}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>
                  {new Date(alert.affectedConnection.boardingTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          {expanded && alert.suggestedActions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-wrap gap-2 mt-3"
            >
              {alert.suggestedActions.map((action, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onAction?.(action.action, alert.id)}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-dark-card hover:bg-dark-bg/80 text-text-primary transition-all border border-dark-border hover:border-accent-blue/50"
                >
                  {action.label}
                  <ChevronRight size={12} className="inline ml-1" />
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-start gap-2 shrink-0">
          {compact && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-dark-card rounded transition-all"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <ChevronRight
                size={16}
                style={{
                  color: colors.text,
                  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              />
            </motion.button>
          )}

          {compact && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDismiss?.(alert.id)}
              className="p-1 hover:bg-dark-card rounded transition-all"
              title="Dismiss"
            >
              <X size={16} style={{ color: colors.text }} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Action Required Badge */}
      {alert.actionRequired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 inline-block px-2 py-1 rounded text-xs font-semibold bg-red-900/30 border border-red-700 text-red-200"
        >
          ⚠️ Action Required
        </motion.div>
      )}
    </motion.div>
  );
}

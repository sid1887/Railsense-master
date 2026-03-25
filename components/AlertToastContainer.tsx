'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
} from 'lucide-react';
import { alertManager, Alert, AlertType } from '@/services/alertManager';

/**
 * Get appropriate icon and colors for alert type
 */
const getAlertIcon = (type: AlertType) => {
  switch (type) {
    case 'critical':
      return { icon: AlertTriangle, color: '#e63946', bg: 'rgba(230, 57, 70, 0.1)' };
    case 'error':
      return { icon: AlertCircle, color: '#e63946', bg: 'rgba(230, 57, 70, 0.1)' };
    case 'warning':
      return { icon: AlertTriangle, color: '#fca311', bg: 'rgba(252, 163, 17, 0.1)' };
    case 'success':
      return { icon: CheckCircle, color: '#1dd1b0', bg: 'rgba(29, 209, 176, 0.1)' };
    default:
      return { icon: Info, color: '#58c7fa', bg: 'rgba(88, 199, 250, 0.1)' };
  }
};

/**
 * AlertToastContainer Component
 * Displays real-time alerts and notifications with sound toggle
 */
export default function AlertToastContainer() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to alert manager
    const unsubscribe = alertManager.subscribe((newAlerts) => {
      setAlerts(newAlerts);
    });

    return unsubscribe;
  }, []);

  const criticalAlerts = alerts.filter((a) => a.type === 'critical');
  const otherAlerts = alerts.filter((a) => a.type !== 'critical');

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md space-y-3 pointer-events-none">
      {/* Critical Alerts (Always visible, at top) */}
      <AnimatePresence mode="popLayout">
        {criticalAlerts.map((alert) => (
          <AlertToast
            key={alert.id}
            alert={alert}
            onDismiss={() => alertManager.removeAlert(alert.id)}
            priority="high"
          />
        ))}
      </AnimatePresence>

      {/* Other Alerts (Collapsible for space) */}
      <AnimatePresence mode="popLayout">
        {otherAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="pointer-events-auto"
          >
            {otherAlerts.length > 3 ? (
              <motion.button
                onClick={() =>
                  setExpandedCategory(expandedCategory === 'other' ? null : 'other')
                }
                className="w-full p-3 rounded-lg bg-dark-card border border-dark-border text-text-secondary text-sm hover:border-accent-blue/50 transition-all"
              >
                {expandedCategory === 'other'
                  ? `Hide ${otherAlerts.length} alerts`
                  : `Show ${otherAlerts.length} alerts`}
              </motion.button>
            ) : null}

            {(expandedCategory === 'other' || otherAlerts.length <= 3) &&
              otherAlerts.map((alert) => (
                <AlertToast
                  key={alert.id}
                  alert={alert}
                  onDismiss={() => alertManager.removeAlert(alert.id)}
                  priority="normal"
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Alerts Indicator */}
      {alerts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-4 text-text-secondary text-xs"
        >
          All systems normal
        </motion.div>
      )}

      {/* Alert Stats */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-2 text-text-secondary text-xs"
        >
          {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Individual Alert Toast Component
 */
function AlertToast({
  alert,
  onDismiss,
  priority = 'normal',
}: {
  alert: Alert;
  onDismiss: () => void;
  priority?: 'high' | 'normal';
}) {
  const { icon: Icon, color, bg } = getAlertIcon(alert.type);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!alert.expiresIn) return;

    const interval = setInterval(() => {
      const remaining = alert.timestamp + alert.expiresIn! - Date.now();
      if (remaining <= 0) {
        onDismiss();
      } else {
        const seconds = Math.ceil(remaining / 1000);
        setTimeLeft(seconds > 60 ? `${Math.ceil(seconds / 60)}m` : `${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [alert, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: 400 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 20, x: 400 }}
      transition={{ type: 'spring', damping: 15 }}
      className="pointer-events-auto"
      style={{
        scale: priority === 'high' ? 1.05 : 1,
      }}
    >
      <motion.div
        animate={priority === 'high' ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className="rounded-lg border p-4 pointer-events-auto shadow-xl"
        style={{
          backgroundColor: bg,
          borderColor: color,
          borderLeft: `4px solid ${color}`,
        }}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <motion.div
            animate={priority === 'high' ? { rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Icon size={20} style={{ color }} className="mt-0.5 shrink-0" />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-text-primary text-sm">{alert.title}</h4>
            <p className="text-xs text-text-secondary mt-1">{alert.message}</p>

            {/* Actions */}
            {alert.actions && alert.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {alert.actions.map((action, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      action.onClick();
                      onDismiss();
                    }}
                    className="px-3 py-1 rounded text-xs font-semibold bg-dark-card hover:bg-dark-bg/80 text-text-primary transition-all"
                  >
                    {action.label}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Close & Timer */}
          <div className="flex items-center gap-2 shrink-0">
            {timeLeft && (
              <span className="text-xs text-text-secondary font-semibold">{timeLeft}</span>
            )}
            {alert.dismissible && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onDismiss}
                className="p-1 hover:bg-dark-card rounded transition-all"
              >
                <X size={16} style={{ color }} />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

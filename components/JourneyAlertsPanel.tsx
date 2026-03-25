'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
} from 'lucide-react';
import { passengerAlertService, PassengerAlert } from '@/services/passengerAlertService';
import ConnectionAlertCard from './ConnectionAlertCard';

interface JourneyAlertsPanelProps {
  trainNumber: string;
  boardingStation: string;
  alightingStation: string;
  compact?: boolean;
}

/**
 * JourneyAlertsPanel Component
 * Displays all alerts related to a passenger's journey
 */
export default function JourneyAlertsPanel({
  trainNumber,
  boardingStation,
  alightingStation,
  compact = false,
}: JourneyAlertsPanelProps) {
  const [alerts, setAlerts] = useState<PassengerAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const unsubscribe = passengerAlertService.subscribe((newAlerts) => {
      setAlerts(newAlerts.filter((a) => !dismissedAlerts.has(a.id)));
    });

    return unsubscribe;
  }, [dismissedAlerts]);

  const handleDismiss = (alertId: string) => {
    passengerAlertService.dismissAlert(alertId);
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const handleAction = (action: string, alertId: string) => {
    passengerAlertService.markAsRead(alertId);

    switch (action) {
      case 'view-alternatives':
        // Navigate to search page with alternative routes
        window.location.href = `/search?from=${boardingStation}&to=${alightingStation}&alternatives=true`;
        break;
      case 'contact-support':
        // Open support modal/chat
        console.log('Opening support contact');
        break;
      case 'acknowledge':
        handleDismiss(alertId);
        break;
    }
  };

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');
  const infoAlerts = alerts.filter((a) => a.severity === 'info');

  const displayedAlerts = showAll ? alerts : alerts.slice(0, 3);

  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-4"
      >
        <div className="flex items-center gap-3">
          <CheckCircle size={20} className="text-accent-green shrink-0" />
          <div>
            <h3 className="font-semibold text-text-primary">All Clear</h3>
            <p className="text-xs text-text-secondary">No alerts for your journey. Safe travels!</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-accent-blue" />
            <h2 className="text-lg font-semibold text-text-primary">Journey Alerts</h2>
            {alerts.length > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-900/30 border border-red-700 text-red-200">
                {alerts.length}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Critical Alerts */}
      <AnimatePresence mode="popLayout">
        {criticalAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide">Critical</h3>
            {criticalAlerts.slice(0, showAll ? Infinity : 1).map((alert) => (
              <ConnectionAlertCard
                key={alert.id}
                alert={alert}
                onDismiss={handleDismiss}
                onAction={handleAction}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Alerts */}
      <AnimatePresence mode="popLayout">
        {warningAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Warnings</h3>
            {warningAlerts.slice(0, showAll ? Infinity : 2).map((alert) => (
              <ConnectionAlertCard
                key={alert.id}
                alert={alert}
                onDismiss={handleDismiss}
                onAction={handleAction}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Alerts */}
      <AnimatePresence mode="popLayout">
        {infoAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Information</h3>
            {infoAlerts.slice(0, showAll ? Infinity : 1).map((alert) => (
              <ConnectionAlertCard
                key={alert.id}
                alert={alert}
                onDismiss={handleDismiss}
                onAction={handleAction}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* View All / Collapse */}
      {alerts.length > 4 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 px-4 rounded border border-dark-border hover:border-accent-blue/50 text-text-secondary hover:text-text-primary transition-all text-sm font-semibold"
        >
          <Eye size={14} className="inline mr-2" />
          {showAll ? `Show less (${alerts.length - 4} more)` : `View all (${alerts.length} total)`}
        </motion.button>
      )}

      {/* Stats */}
      {!compact && alerts.length > 0 && (
        <div className="flex gap-4 text-xs text-text-secondary mt-4 pt-4 border-t border-dark-border">
          {criticalAlerts.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>{criticalAlerts.length} critical</span>
            </div>
          )}
          {warningAlerts.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>{warningAlerts.length} warning</span>
            </div>
          )}
          {infoAlerts.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>{infoAlerts.length} info</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

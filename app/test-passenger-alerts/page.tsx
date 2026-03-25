'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import JourneyAlertsPanel from '@/components/JourneyAlertsPanel';
import { usePassengerAlerts } from '@/hooks/usePassengerAlerts';

/**
 * Passenger Alerts Demo & Test Page
 */
export default function PassengerAlertsTestPage() {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const journey = {
    journeyId: 'demo-12001',
    trainNumber: '12001',
    boardingStation: 'NDLS',
    boardingStationCode: 'DLI',
    alightingStation: 'MUV',
    alightingStationCode: 'MUV',
    boardingTime: Date.now() + 3600000, // 1 hour from now
    expectedArrival: Date.now() + 3600000 + 14400000, // 4 hours from now
  };

  const {
    checkConnectionMiss,
    checkDelayWarning,
    checkPlatformChange,
    checkServiceDisruption,
  } = usePassengerAlerts(journey);

  const handleTestConnectionMiss = () => {
    const now = Date.now();
    const connectingBoardingTime = now + 18000000; // 5 hours from now
    const estimatedArrival = now + 19800000; // 5.5 hours from now (missed by 30 mins)

    checkConnectionMiss('16016', 'CNB', connectingBoardingTime, estimatedArrival);
    setSelectedAction('connection-miss');
  };

  const handleTestDelayWarning = () => {
    checkDelayWarning(10, 45); // 40-minute predicted delay
    setSelectedAction('delay-warning');
  };

  const handleTestPlatformChange = () => {
    checkPlatformChange('5', '8');
    setSelectedAction('platform-change');
  };

  const handleTestTightConnection = () => {
    const now = Date.now();
    const connectingBoardingTime = now + 18000000; // 5 hours from now
    const estimatedArrival = now + 17700000; // 4.95 hours from now (only 5 minutes buffer)

    checkConnectionMiss('16016', 'CNB', connectingBoardingTime, estimatedArrival);
    setSelectedAction('connection-tight');
  };

  const handleTestServiceDisruption = () => {
    checkServiceDisruption('NDLS-CNB', 'Track maintenance ongoing', 120);
    setSelectedAction('disruption');
  };

  const tests = [
    {
      label: 'Missed Connection',
      action: handleTestConnectionMiss,
      description: 'Trigger a critical alert for missed connection',
    },
    {
      label: 'Delay Warning (45m)',
      action: handleTestDelayWarning,
      description: 'High-risk delay affecting journey',
    },
    {
      label: 'Platform Change',
      action: handleTestPlatformChange,
      description: 'Boarding platform changed from 5 to 8',
    },
    {
      label: 'Tight Connection',
      action: handleTestTightConnection,
      description: 'Only 5 minutes between arrival and next train',
    },
    {
      label: 'Service Disruption',
      action: handleTestServiceDisruption,
      description: 'Track maintenance on your route',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-text-primary mb-2">Passenger Alerts System</h1>
          <p className="text-text-secondary">
            Test journey: Train 12001 (NDLS → MUV) departing in 1 hour
          </p>
        </motion.div>

        {/* Test Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          {tests.map((test, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={test.action}
              className={`p-4 rounded-lg border transition-all text-left ${
                selectedAction === test.label.toLowerCase().replace(/\s+/g, '-')
                  ? 'border-accent-blue bg-accent-blue/10'
                  : 'border-dark-border hover:border-accent-blue/50'
              }`}
            >
              <h3 className="font-semibold text-text-primary text-sm">{test.label}</h3>
              <p className="text-xs text-text-secondary mt-1">{test.description}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* Alerts Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-dark-card border border-dark-border rounded-lg p-6"
        >
          <h2 className="text-xl font-semibold text-text-primary mb-4">Live Alerts</h2>
          <div className="space-y-3">
            <JourneyAlertsPanel
              trainNumber={journey.trainNumber}
              boardingStation={journey.boardingStation}
              alightingStation={journey.alightingStation}
            />
          </div>
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-accent-blue mb-3">How It Works</h3>
          <ul className="text-text-secondary text-sm space-y-2 list-disc list-inside">
            <li>Click any test button to simulate a real-world scenario</li>
            <li>Alerts appear in the &quot;Live Alerts&quot; section with appropriate severity levels</li>
            <li>Critical alerts (red) require immediate action from passengers</li>
            <li>Warning alerts (orange) suggest reviewing alternatives</li>
            <li>Info alerts (blue) are for awareness</li>
            <li>Each alert auto-expires after a configurable duration</li>
            <li>Passengers can dismiss or take suggested actions on each alert</li>
          </ul>
        </motion.div>

        {/* Integration Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-accent-purple mb-3">Integration Points</h3>
          <ul className="text-text-secondary text-sm space-y-2 list-disc list-inside">
            <li>
              <strong>Train Detail Page:</strong> JourneyAlertsPanel shows real-time alerts for
              selected train
            </li>
            <li>
              <strong>Search Results:</strong> Badges show alert count on connections
            </li>
            <li>
              <strong>API Endpoint:</strong> /api/passenger-alerts for programmatic alert generation
            </li>
            <li>
              <strong>Hook:</strong> usePassengerAlerts() for component integration
            </li>
            <li>
              <strong>Toast Notifications:</strong> Critical alerts also appear in toast container
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

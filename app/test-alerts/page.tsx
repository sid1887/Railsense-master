'use client';

import { useEffect, useState } from 'react';
import { AlertHelpers } from '@/services/alertManager';

/**
 * Alert Test Page
 * Demonstrates alert system functionality and testing
 */
export default function AlertTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addLog = (message: string) => {
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCreateAlert = async () => {
    addLog('Creating test alert via API...');
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'warning',
          category: 'delay',
          title: 'Test Delay Alert',
          message: 'This is a test alert for Train 12001',
          trainNumber: '12001',
          dismissible: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addLog(`✅ Alert created: ${data.alertId}`);
      } else {
        addLog(`❌ Failed to create alert: ${res.status}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  const testGetAlerts = async () => {
    addLog('Fetching alerts...');
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        addLog(`✅ Retrieved ${data.alerts.length} alerts`);
      } else {
        addLog(`❌ Failed to fetch alerts: ${res.status}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  const testDelayAlert = () => {
    addLog('Creating delay alert via AlertHelpers...');
    try {
      AlertHelpers.delayAlert('12001', 5, 25);
      addLog('✅ Delay alert created successfully');
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  const testHaltAlert = () => {
    addLog('Creating halt alert via AlertHelpers...');
    try {
      AlertHelpers.haltAlert('12001', 'NDLS-CNB', 15);
      addLog('✅ Halt alert created successfully');
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  const testCongestionAlert = () => {
    addLog('Creating congestion alert via AlertHelpers...');
    try {
      AlertHelpers.congestionAlert('NDLS-VIRAR', 'Delhi to Virar', 'critical');
      addLog('✅ Congestion alert created successfully');
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addLog('Starting comprehensive alert system tests...');

    // Test 1: Create delay alert
    testDelayAlert();
    await new Promise((r) => setTimeout(r, 500));

    // Test 2: Create halt alert
    testHaltAlert();
    await new Promise((r) => setTimeout(r, 500));

    // Test 3: Create congestion alert
    testCongestionAlert();
    await new Promise((r) => setTimeout(r, 500));

    // Test 4: Create via API
    await new Promise((r) => setTimeout(r, 500));
    await testCreateAlert();

    // Test 5: Get alerts
    await new Promise((r) => setTimeout(r, 500));
    await testGetAlerts();

    addLog('✅ All tests completed!');
  };

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-text-primary mb-8">Alert System Test Panel</h1>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={runAllTests}
            className="px-6 py-3 bg-accent-blue hover:bg-accent-blue/80 rounded-lg text-white font-semibold transition-all"
          >
            Run All Tests
          </button>
          <button
            onClick={testCreateAlert}
            className="px-6 py-3 bg-accent-green hover:bg-accent-green/80 rounded-lg text-white font-semibold transition-all"
          >
            Test API Create
          </button>
          <button
            onClick={testGetAlerts}
            className="px-6 py-3 bg-accent-purple hover:bg-accent-purple/80 rounded-lg text-white font-semibold transition-all"
          >
            Test API Get
          </button>
          <button
            onClick={testDelayAlert}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-semibold transition-all"
          >
            Test Delay Alert
          </button>
          <button
            onClick={testHaltAlert}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white font-semibold transition-all"
          >
            Test Halt Alert
          </button>
          <button
            onClick={testCongestionAlert}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-all"
          >
            Test Congestion Alert
          </button>
        </div>

        {/* Results Log */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Test Results Log</h2>
          <div className="bg-dark-bg rounded p-4 h-96 overflow-y-auto space-y-2">
            {testResults.length === 0 ? (
              <p className="text-text-secondary text-sm">Click a test button to start...</p>
            ) : (
              testResults.map((result, i) => (
                <p key={i} className="text-text-secondary text-sm font-mono">
                  {result}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-accent-blue mb-3">How to Test</h3>
          <ul className="text-text-secondary text-sm space-y-2 list-disc list-inside">
            <li>Click &quot;Run All Tests&quot; to execute all test scenarios sequentially</li>
            <li>Individual test buttons allow testing specific alert types</li>
            <li>Watch the toast notification container (bottom-right) for visual alerts</li>
            <li>Check browser console for detailed logging</li>
            <li>Open Operator Dashboard at /train/operator to see integration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

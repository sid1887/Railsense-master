'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Plus, FileText, Settings } from 'lucide-react';
import MLTrainingDashboard from '@/components/MLTrainingDashboard';

/**
 * ML Model Training Page
 * Complete interface for training ML models with data management
 */
export default function MLTrainingPage() {
  const [showAddData, setShowAddData] = useState(false);
  const [newDataPoints, setNewDataPoints] = useState(1);
  const [dataAdded, setDataAdded] = useState(0);

  const handleAddTrainingData = async () => {
    // Generate sample training data
    const dataPoints = [];
    for (let i = 0; i < newDataPoints; i++) {
      dataPoints.push({
        trainNumber: `TRAIN-${Math.floor(Math.random() * 9000) + 1000}`,
        dayOfWeek: Math.floor(Math.random() * 7),
        hourOfDay: Math.floor(Math.random() * 24),
        seasonality: Math.floor(Math.random() * 4),
        routeDistance: 300 + Math.random() * 700,
        previousDelay: Math.random() * 20,
        weatherCondition: Math.floor(Math.random() * 3),
        trafficDensity: Math.floor(Math.random() * 100),
        haltCount: Math.floor(Math.random() * 12),
        signallingStatus: Math.random() > 0.1 ? 1 : 2,
        actualDelay: Math.random() * 30,
      });
    }

    try {
      const response = await fetch('/api/ml-training?action=batch-training-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataPoints }),
      });

      if (response.ok) {
        const result = await response.json();
        setDataAdded(newDataPoints);
        setTimeout(() => setShowAddData(false), 1500);
      }
    } catch (error) {
      console.error('Error adding training data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <Brain size={32} className="text-indigo-400" />
            <h1 className="text-3xl font-bold text-text-primary">ML Model Training</h1>
          </div>
          <p className="text-text-secondary">
            Train, evaluate, and manage machine learning models for delay prediction
          </p>
        </motion.div>

        <div className="grid grid-cols-4 gap-4">
          {/* Main Content */}
          <div className="col-span-3">
            <MLTrainingDashboard />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-2"
            >
              <h3 className="font-semibold text-text-primary text-sm mb-3">Quick Actions</h3>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAddData(true)}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
              >
                <Plus size={16} />
                Add Training Data
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
              >
                <FileText size={16} />
                Export Results
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
              >
                <Settings size={16} />
                Settings
              </motion.button>
            </motion.div>

            {/* Info Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-3 text-xs"
            >
              <div>
                <p className="text-text-secondary mb-1">Best Practice:</p>
                <p className="text-text-primary">
                  Train with 1000+ data points for reliable models
                </p>
              </div>

              <div className="border-t border-dark-border pt-3">
                <p className="text-text-secondary mb-1">Model Evaluation:</p>
                <ul className="text-text-primary space-y-1 list-disc list-inside">
                  <li>R² Score measures fit quality</li>
                  <li>MAE shows average error magnitude</li>
                  <li>RMSE penalizes large errors</li>
                </ul>
              </div>

              <div className="border-t border-dark-border pt-3">
                <p className="text-text-secondary mb-1">Retraining Tips:</p>
                <ul className="text-text-primary space-y-1 list-disc list-inside">
                  <li>Weekly: For stable routes</li>
                  <li>Bi-weekly: For high variance</li>
                  <li>Monthly: For baseline models</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Add Training Data Modal */}
        {showAddData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowAddData(false)}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-card border border-dark-border rounded-lg p-6 max-w-md w-full mx-4 space-y-4"
            >
              <h3 className="text-lg font-semibold text-text-primary">
                Add Training Data
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-text-primary block mb-2">
                    Number of Data Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newDataPoints}
                    onChange={(e) => setNewDataPoints(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    {newDataPoints} points will be generated with realistic values
                  </p>
                </div>

                {dataAdded > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-green-900/20 border border-green-700 rounded text-sm text-green-300"
                  >
                    ✓ Added {dataAdded} data points successfully!
                  </motion.div>
                )}
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddData(false)}
                  className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border hover:border-blue-500 rounded font-semibold text-text-primary transition"
                >
                  Cancel
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddTrainingData}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-white transition"
                >
                  Add Data
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Information Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-6"
        >
          {/* Training Process */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Training Process</h3>
            <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
              <li>Collect historical delay data</li>
              <li>Normalize features for model consistency</li>
              <li>Train linear regression with regularization</li>
              <li>Split data: 80% training, 20% testing</li>
              <li>Use gradient descent for optimization</li>
              <li>Calculate performance metrics (R², MAE, RMSE)</li>
              <li>Evaluate generalization ability</li>
              <li>Activate best performing model</li>
            </ol>
          </div>

          {/* Metrics Explanation */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Performance Metrics</h3>
            <div className="text-sm text-text-secondary space-y-3">
              <div>
                <p className="font-semibold text-text-primary mb-1">R² (Coefficient of Determination)</p>
                <p>Measures how well predictions fit the data. 0.8+ is good, 0.9+ is excellent</p>
              </div>

              <div>
                <p className="font-semibold text-text-primary mb-1">MAE (Mean Absolute Error)</p>
                <p>Average absolute difference in minutes. Lower is better</p>
              </div>

              <div>
                <p className="font-semibold text-text-primary mb-1">RMSE (Root Mean Squared Error)</p>
                <p>Similar to MAE but penalizes larger errors more heavily</p>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Best Practices</h3>
            <ul className="text-sm text-text-secondary space-y-2 list-disc list-inside">
              <li>Always validate on unseen data</li>
              <li>Monitor for data drift over time</li>
              <li>Use diverse training scenarios</li>
              <li>Retrain periodically with new data</li>
              <li>Compare models before activation</li>
              <li>Archive old models for rollback</li>
              <li>Log all training runs</li>
              <li>Version control models and configs</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

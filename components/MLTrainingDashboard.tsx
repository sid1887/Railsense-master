'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlayCircle,
  BarChart3,
  CheckCircle,
  Trash2,
  TrendingUp,
  AlertCircle,
  Database,
  Clock,
} from 'lucide-react';

interface ModelInfo {
  id: string;
  version: number;
  accuracy: number;
  mae: number;
  isActive: boolean;
  createdAt: number;
  trainingDuration: number;
}

interface TrainingJob {
  jobId: string;
  status: string;
  progress: number;
}

interface MLTrainingDashboardProps {
  onTrainStart?: () => void;
  onModelActivate?: (modelId: string) => void;
}

/**
 * ML Model Training Dashboard
 * Interface for training, managing, and comparing ML models
 */
export default function MLTrainingDashboard({
  onTrainStart,
  onModelActivate,
}: MLTrainingDashboardProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activeJob, setActiveJob] = useState<TrainingJob | null>(null);
  const [trainingDataSize, setTrainingDataSize] = useState(0);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [autoRetrainEnabled, setAutoRetrainEnabled] = useState(true);
  const [retrainingSchedule, setRetrainingSchedule] = useState({
    intervalDays: 7,
    nextRetrain: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Simulate fetching model data
  useEffect(() => {
    const mockModels: ModelInfo[] = [
      {
        id: 'model-initial',
        version: 1,
        accuracy: 0.82,
        mae: 4.5,
        isActive: true,
        createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
        trainingDuration: 2400,
      },
      {
        id: 'model-v2',
        version: 2,
        accuracy: 0.88,
        mae: 3.2,
        isActive: false,
        createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        trainingDuration: 2600,
      },
    ];

    setModels(mockModels);
    setTrainingDataSize(3500);
  }, []);

  const handleStartTraining = () => {
    onTrainStart?.();

    const job: TrainingJob = {
      jobId: `job-${Date.now()}`,
      status: 'running',
      progress: 0,
    };

    setActiveJob(job);

    // Simulate training progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setActiveJob(null);

        // Add new trained model
        const newModel: ModelInfo = {
          id: `model-${Date.now()}`,
          version: models.length + 1,
          accuracy: 0.85 + Math.random() * 0.1,
          mae: 3.0 + Math.random() * 1.5,
          isActive: false,
          createdAt: Date.now(),
          trainingDuration: 2500,
        };

        setModels([newModel, ...models]);
      } else {
        setActiveJob({ ...job, progress: Math.round(progress) });
      }
    }, 500);
  };

  const handleActivateModel = (modelId: string) => {
    onModelActivate?.(modelId);
    setModels(
      models.map((m) => ({
        ...m,
        isActive: m.id === modelId,
      }))
    );
  };

  const handleDeleteModel = (modelId: string) => {
    setModels(models.filter((m) => m.id !== modelId));
    setSelectedModels(selectedModels.filter((id) => id !== modelId));
  };

  const toggleModelSelection = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const activeModel = models.find((m) => m.isActive);
  const selectedModelsList = models.filter((m) => selectedModels.includes(m.id));

  return (
    <div className="space-y-6">
      {/* Training Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Database size={20} className="text-cyan-400" />
          Training Data & Status
        </h3>

        <div className="grid grid-cols-3 gap-4">
          {/* Data Points */}
          <div className="bg-dark-bg rounded p-4">
            <p className="text-sm text-text-secondary mb-1">Training Data Points</p>
            <p className="text-2xl font-bold text-cyan-400">{trainingDataSize.toLocaleString()}</p>
            <p className="text-xs text-text-secondary mt-1">
              {trainingDataSize >= 1000 ? '✓ Sufficient' : '⚠ Low'}
            </p>
          </div>

          {/* Active Model */}
          <div className="bg-dark-bg rounded p-4">
            <p className="text-sm text-text-secondary mb-1">Active Model</p>
            <p className="text-2xl font-bold text-green-400">v{activeModel?.version || 0}</p>
            <p className="text-xs text-text-secondary mt-1">
              Accuracy: {((activeModel?.accuracy || 0) * 100).toFixed(1)}%
            </p>
          </div>

          {/* Training Job */}
          <div className="bg-dark-bg rounded p-4">
            <p className="text-sm text-text-secondary mb-1">Training Status</p>
            <p className="text-2xl font-bold text-blue-400">
              {activeJob ? `${activeJob.progress}%` : 'Ready'}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {activeJob ? 'Training in progress...' : 'Idle'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {activeJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">Training Progress</p>
              <p className="text-sm text-text-secondary">{activeJob.progress}%</p>
            </div>
            <div className="w-full h-3 bg-dark-bg rounded overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${activeJob.progress}%` }}
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Start Training Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStartTraining}
        disabled={!!activeJob}
        className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-green-800 disabled:to-green-800 disabled:opacity-50 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition"
      >
        <PlayCircle size={18} />
        {activeJob ? `Training... ${activeJob.progress}%` : 'Start Model Training'}
      </motion.button>

      {/* Auto-Retraining Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Clock size={20} className="text-yellow-400" />
            Auto-Retraining Schedule
          </h3>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRetrainEnabled}
              onChange={(e) => setAutoRetrainEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-text-secondary">
              {autoRetrainEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        {autoRetrainEnabled && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-dark-bg rounded p-3">
              <p className="text-text-secondary mb-1">Interval</p>
              <p className="font-semibold text-text-primary">
                {retrainingSchedule.intervalDays} days
              </p>
            </div>
            <div className="bg-dark-bg rounded p-3">
              <p className="text-text-secondary mb-1">Next Retraining</p>
              <p className="font-semibold text-text-primary">
                {retrainingSchedule.nextRetrain.toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Models List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <BarChart3 size={20} className="text-purple-400" />
          Trained Models ({models.length})
        </h3>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {models.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle size={32} className="mx-auto text-text-secondary mb-2" />
              <p className="text-text-secondary">No models trained yet</p>
            </div>
          ) : (
            models.map((model, idx) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded border flex items-center gap-3 transition ${
                  model.isActive
                    ? 'bg-green-900/20 border-green-700'
                    : 'bg-dark-bg border-dark-border hover:border-blue-500'
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model.id)}
                  onChange={() => toggleModelSelection(model.id)}
                  className="w-4 h-4 cursor-pointer"
                />

                {/* Model Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-text-primary">Version {model.version}</p>
                    {model.isActive && (
                      <span className="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-text-secondary">
                    <span>
                      <strong>Accuracy:</strong> {(model.accuracy * 100).toFixed(1)}%
                    </span>
                    <span>
                      <strong>MAE:</strong> {model.mae.toFixed(2)}
                    </span>
                    <span>
                      <strong>Trained:</strong>{' '}
                      {Math.floor((Date.now() - model.createdAt) / (24 * 60 * 60 * 1000))}d ago
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!model.isActive && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleActivateModel(model.id)}
                      title="Activate model"
                      className="p-2 hover:bg-blue-900/30 rounded transition"
                    >
                      <CheckCircle size={18} className="text-blue-400" />
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeleteModel(model.id)}
                    title="Delete model"
                    className="p-2 hover:bg-red-900/30 rounded transition"
                  >
                    <Trash2 size={18} className="text-red-400" />
                  </motion.button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Model Comparison */}
      {selectedModelsList.length === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-400" />
            Model Comparison
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {selectedModelsList.map((model, idx) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-dark-bg rounded p-4 space-y-2"
              >
                <p className="font-semibold text-text-primary">Version {model.version}</p>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Accuracy</span>
                    <span className="font-semibold text-cyan-400">
                      {(model.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-text-secondary">Mean Absolute Error</span>
                    <span className="font-semibold text-blue-400">{model.mae.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-text-secondary">Training Time</span>
                    <span className="font-semibold text-yellow-400">
                      {(model.trainingDuration / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {selectedModelsList[1].accuracy > selectedModelsList[0].accuracy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-green-900/20 border border-green-700 rounded text-sm text-green-300"
            >
              ✓ Version {selectedModelsList[1].version} is{' '}
              {(
                (selectedModelsList[1].accuracy - selectedModelsList[0].accuracy) *
                100
              ).toFixed(1)}
              % more accurate
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

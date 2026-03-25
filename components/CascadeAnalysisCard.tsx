'use client';

import React from 'react';
import { AlertTriangle, TrendingDown, Clock, Zap, AlertCircle } from 'lucide-react';
import { CascadeAnalysis } from '@/services/cascadeService';

interface CascadeAnalysisCardProps {
  analysis: CascadeAnalysis;
}

export const CascadeAnalysisCard: React.FC<CascadeAnalysisCardProps> = ({ analysis }) => {
  const getCascadeLevelColor = (level: number) => {
    if (level >= 70) return 'from-red-500 to-red-700';
    if (level >= 50) return 'from-orange-500 to-orange-700';
    if (level >= 30) return 'from-yellow-500 to-yellow-700';
    return 'from-green-500 to-emerald-500';
  };

  const getCascadeLevelLabel = (level: number) => {
    if (level >= 70) return 'CRITICAL CASCADE';
    if (level >= 50) return 'HIGH CASCADE';
    if (level >= 30) return 'MODERATE CASCADE';
    return 'MINIMAL CASCADE';
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getCascadeLevelColor(analysis.cascadeLevel)} p-6 text-white`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-1">Cascade Analysis</h3>
            <p className="text-white text-opacity-90">Train {analysis.sourceTrain}</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{analysis.cascadeLevel}</div>
            <div className="text-sm font-semibold mt-1">Cascade Level</div>
          </div>
        </div>

        {/* Initial Impact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-20 rounded p-3">
            <div className="text-sm text-white text-opacity-80">Source Delay</div>
            <div className="text-2xl font-bold">{analysis.sourceDelay}</div>
            <div className="text-xs text-white text-opacity-70">minutes</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-3">
            <div className="text-sm text-white text-opacity-80">Network Impact</div>
            <div className="text-2xl font-bold">{analysis.networkImpactScore}</div>
            <div className="text-xs text-white text-opacity-70">%</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Cascade Label */}
        <div className="flex items-center gap-2 text-lg font-bold">
          <TrendingDown className="w-6 h-6 text-red-600" />
          {getCascadeLevelLabel(analysis.cascadeLevel)}
        </div>

        {/* Timeline */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Cascade Timeline
          </h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Peak Cascade Time:</span>
              <span className="font-semibold">{formatTime(analysis.cascadePeakTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Resolution Timeframe:</span>
              <span className="font-semibold">{analysis.cascadeResolutionTime.toFixed(0)} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Prediction Uncertainty:</span>
              <span className="font-semibold">{analysis.uncertaintyScore.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Affected Trains */}
        {analysis.affectedTrains.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Affected Trains ({analysis.affectedTrains.length})
            </h4>

            <div className="space-y-2">
              {analysis.affectedTrains.map((train, idx) => {
                const riskColors = {
                  low: 'border-green-200 bg-green-50',
                  medium: 'border-yellow-200 bg-yellow-50',
                  high: 'border-orange-200 bg-orange-50',
                  critical: 'border-red-200 bg-red-50',
                };

                const riskBadgeColors = {
                  low: 'bg-green-200 text-green-800',
                  medium: 'bg-yellow-200 text-yellow-800',
                  high: 'bg-orange-200 text-orange-800',
                  critical: 'bg-red-200 text-red-800',
                };

                return (
                  <div key={idx} className={`rounded-lg p-3 border ${riskColors[train.riskLevel]}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-sm text-gray-900">
                          {train.affectedTrain}
                        </div>
                        <div className="text-xs text-gray-600">
                          Path: {train.propagationPath.join(' → ')}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          riskBadgeColors[train.riskLevel]
                        }`}
                      >
                        {train.riskLevel.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-700">
                      <div>
                        <span className="text-gray-600">Original:</span>
                        <div className="font-semibold">{train.originalDelay} min</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Cascaded:</span>
                        <div className="font-semibold">+{train.cascadedDelay} min</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <div className="font-semibold">{train.totalDelay} min</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Priority Conflicts */}
        {analysis.priorityConflicts.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              Priority Conflicts ({analysis.priorityConflicts.length})
            </h4>

            <div className="space-y-2">
              {analysis.priorityConflicts.map((conflict, idx) => (
                <div key={idx} className="rounded-lg p-3 border border-yellow-200 bg-yellow-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">
                        {conflict.highPriorityTrain} ↛ {conflict.lowPriorityTrain}
                      </div>
                      <div className="text-xs text-gray-600">
                        Location: {conflict.conflictLocation}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        conflict.severityScore > 70
                          ? 'bg-red-200 text-red-800'
                          : conflict.severityScore > 50
                            ? 'bg-orange-200 text-orange-800'
                            : 'bg-yellow-200 text-yellow-800'
                      }`}
                    >
                      SEV {conflict.severityScore.toFixed(0)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <div>
                      <span className="text-gray-600">Wait Time:</span>
                      <div className="font-semibold">{conflict.estimatedWaitTime} min</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Delay Impact:</span>
                      <div className="font-semibold">+{conflict.delayFromConflict} min</div>
                    </div>
                  </div>

                  {conflict.isOnCriticalPath && (
                    <div className="mt-2 pt-2 border-t border-yellow-300 text-xs font-semibold text-red-700">
                      ⚠️ On critical path - may cause further cascades
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-blue-800 list-disc ml-4">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cascade Impact Breakdown */}
        <div className="bg-gray-100 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Cascade Metrics</h4>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Cascade Level</span>
                <span className="font-semibold">{analysis.cascadeLevel}%</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    analysis.cascadeLevel >= 70
                      ? 'bg-red-500'
                      : analysis.cascadeLevel >= 50
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                  }`}
                  style={{ width: `${analysis.cascadeLevel}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Network Impact</span>
                <span className="font-semibold">{analysis.networkImpactScore}%</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-purple-500"
                  style={{ width: `${analysis.networkImpactScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">Prediction Uncertainty</span>
                <span className="font-semibold">{analysis.uncertaintyScore.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-red-400"
                  style={{ width: `${analysis.uncertaintyScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

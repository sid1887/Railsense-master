'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { PassengerSafetyAssessment } from '@/services/passengerSafetyService';

interface PassengerSafetyCardProps {
  assessment: PassengerSafetyAssessment;
}

export const PassengerSafetyCard: React.FC<PassengerSafetyCardProps> = ({ assessment }) => {
  const getSafetyColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  const getSafetyLabel = (score: number) => {
    if (score >= 80) return 'EXCELLENT';
    if (score >= 60) return 'GOOD';
    if (score >= 40) return 'CAUTION';
    return 'CRITICAL';
  };

  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'border-red-200 bg-red-50';
    if (impact === 'medium') return 'border-yellow-200 bg-yellow-50';
    return 'border-green-200 bg-green-50';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header with Safety Score */}
      <div className={`bg-gradient-to-r ${getSafetyColor(assessment.overallSafetyScore)} p-6 text-white`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-1">
              {assessment.trainNumber} - Safety Assessment
            </h3>
            <p className="text-white text-opacity-90">
              {assessment.originStation} → {assessment.destinationStation}
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{assessment.overallSafetyScore}</div>
            <div className="text-sm font-semibold mt-1">
              {getSafetyLabel(assessment.overallSafetyScore)}
            </div>
          </div>
        </div>

        {/* Passenger Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-20 rounded p-3">
            <div className="text-sm text-white text-opacity-80">Total Passengers</div>
            <div className="text-2xl font-bold">{assessment.totalPassengers}</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded p-3">
            <div className="text-sm text-white text-opacity-80">Connecting</div>
            <div className="text-2xl font-bold">{assessment.connectionPassengers}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Alerts */}
        {assessment.alerts.length > 0 && (
          <div className="space-y-2">
            {assessment.alerts.map((alert, idx) => {
              const isWarning = alert.includes('⚠️');
              return (
                <div
                  key={idx}
                  className={`rounded-lg p-3 flex gap-3 ${
                    isWarning ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                  }`}
                >
                  {isWarning ? (
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={`text-sm ${isWarning ? 'text-red-800' : 'text-green-800'}`}>
                    {alert}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Safety Windows */}
        {assessment.safetyWindows.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Connection Safety Windows
            </h4>
            <div className="space-y-2">
              {assessment.safetyWindows.map((window, idx) => {
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
                  <div key={idx} className={`rounded-lg p-3 border ${riskColors[window.riskLevel]}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-sm text-gray-900">
                        Window {idx + 1}: {new Date(window.startTime).toLocaleTimeString()}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          riskBadgeColors[window.riskLevel]
                        }`}
                      >
                        {window.riskLevel.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Min. Connection Time:</span>
                        <span className="font-semibold">
                          {window.minimumConnectionTime.toFixed(0)} min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Safety Margin:</span>
                        <span className={window.safetyMargin < 3 ? 'text-red-600 font-bold' : ''}>
                          {window.safetyMargin.toFixed(0)} min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Affected Passengers:</span>
                        <span className="font-semibold">{window.passengerImpact}</span>
                      </div>
                    </div>

                    {window.reasonsForRisk.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300 text-xs text-gray-700">
                        {window.reasonsForRisk.map((reason, ridx) => (
                          <div key={ridx} className="list-disc ml-4">
                            {reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dwell Anomalies */}
        {assessment.dwellAnomalies.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Dwell Time Analysis
            </h4>
            <div className="space-y-2">
              {assessment.dwellAnomalies.map((dwell, idx) => (
                <div key={idx} className={`rounded-lg p-3 border ${getImpactColor(dwell.passengerImpact)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">
                        {dwell.stationName} ({dwell.stationId})
                      </div>
                      <div className="text-xs text-gray-600">
                        {dwell.trainNumber}
                      </div>
                    </div>
                    {dwell.anomalyDetected && (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-red-200 text-red-800">
                        {dwell.anomalyType?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 mb-2">
                    <div>
                      <span className="text-gray-600">Expected:</span>
                      <div className="font-semibold">{dwell.expectedDwellTime.toFixed(1)} min</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Actual:</span>
                      <div className="font-semibold">
                        {dwell.actualDwellTime.toFixed(1)} min
                      </div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="text-xs font-semibold text-gray-700 mb-1">
                      Deviation: {dwell.deviation > 0 ? '+' : ''}{dwell.deviation.toFixed(1)} min ({dwell.deviationPercent > 0 ? '+' : ''}{dwell.deviationPercent.toFixed(0)}%)
                    </div>
                  </div>

                  {dwell.possibleCauses.length > 0 && (
                    <div className="text-xs text-gray-700">
                      <span className="font-semibold block mb-1">Possible Causes:</span>
                      {dwell.possibleCauses.map((cause, cidx) => (
                        <div key={cidx} className="ml-2 list-disc">
                          {cause}
                        </div>
                      ))}
                    </div>
                  )}

                  {dwell.cascadeRiskLevel > 30 && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <div className="flex items-center gap-1 text-xs font-semibold text-orange-700">
                        <AlertCircle className="w-3 h-3" />
                        Cascade Risk: {dwell.cascadeRiskLevel.toFixed(0)}%
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Factors */}
        {assessment.riskFactors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Risk Factors
            </h4>
            <div className="space-y-2">
              {assessment.riskFactors.map((factor, idx) => {
                const severityColors = {
                  low: 'border-blue-200 bg-blue-50',
                  medium: 'border-yellow-200 bg-yellow-50',
                  high: 'border-red-200 bg-red-50',
                };

                const severityText = {
                  low: 'text-blue-900',
                  medium: 'text-yellow-900',
                  high: 'text-red-900',
                };

                return (
                  <div key={idx} className={`rounded-lg p-3 border ${severityColors[factor.severity]}`}>
                    <div className="flex items-start justify-between mb-1">
                      <p className={`font-semibold text-sm ${severityText[factor.severity]}`}>
                        {factor.factor}
                      </p>
                      <span className="text-xs font-bold">
                        {factor.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-700 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Affects: {factor.affectedPassengers} passengers
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {assessment.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {assessment.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-blue-800 list-disc ml-4">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

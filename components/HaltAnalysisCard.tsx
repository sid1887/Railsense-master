'use client';

import React from 'react';
import { Clock, AlertTriangle, Zap, Info } from 'lucide-react';
import { HaltAnalysis } from '@/services/haltReasonService';
import { HaltReasonDisplay } from './HaltReasonDisplay';

interface HaltAnalysisCardProps {
  analysis: HaltAnalysis;
}

export const HaltAnalysisCard: React.FC<HaltAnalysisCardProps> = ({ analysis }) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const riskLevelColor = (factors: string[]) => {
    if (factors.length === 0) return 'bg-green-50 border-green-200';
    if (factors.length === 1) return 'bg-yellow-50 border-yellow-200';
    if (factors.length === 2) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${riskLevelColor(analysis.riskFactors)}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">{analysis.trainNumber}</h3>
          <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded">
            {analysis.haltDuration.toFixed(0)} min halt
          </span>
        </div>
        <p className="text-purple-100">{analysis.location}</p>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Primary Reason */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Primary Reason</h4>
          <HaltReasonDisplay reason={analysis.primaryReason} isPrimary={true} />
        </div>

        {/* Secondary Reasons */}
        {analysis.secondaryReasons.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Contributing Factors</h4>
            <div className="space-y-2">
              {analysis.secondaryReasons.map((reason, idx) => (
                <HaltReasonDisplay key={idx} reason={reason} isPrimary={false} />
              ))}
            </div>
          </div>
        )}

        {/* Factors Summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>
              Resume: <span className="font-semibold">{formatTime(analysis.estimatedResumeTime)}</span>
            </span>
          </div>

          {analysis.priorityTrain && (
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              <span>
                Waiting for: <span className="font-semibold">{analysis.priorityTrain}</span>
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {analysis.platformOccupancy ? (
              <>
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-red-700">Platform blocked</span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-green-700">Platforms available</span>
              </>
            )}
          </div>

          {analysis.maintenanceBlock && (
            <div className="flex items-center gap-2 col-span-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-orange-700">Maintenance block active</span>
            </div>
          )}
        </div>

        {/* Risk Factors */}
        {analysis.riskFactors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-semibold text-red-900 text-sm">Risk Factors</h5>
                <ul className="mt-1 space-y-1">
                  {analysis.riskFactors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-red-800 list-disc ml-4">
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Factors */}
        <div className="bg-gray-50 rounded p-3 text-sm">
          <div className="font-semibold text-gray-700 mb-2">Detected Factors</div>
          <div className="space-y-1 text-gray-600">
            <div className="flex items-center justify-between">
              <span>Platform Occupancy:</span>
              <span className={analysis.platformOccupancy ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                {analysis.platformOccupancy ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Crossing Train Detection:</span>
              <span className={analysis.nearbyOppositeDirection ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                {analysis.nearbyOppositeDirection ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Section Capacity:</span>
              <span className={analysis.sectionCapacityBreached ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                {analysis.sectionCapacityBreached ? 'BREACHED' : 'NORMAL'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Maintenance Block:</span>
              <span className={analysis.maintenanceBlock ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                {analysis.maintenanceBlock ? 'ACTIVE' : 'NONE'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Signal Hold:</span>
              <span className={analysis.signalHold ? 'text-yellow-600 font-bold' : 'text-green-600 font-bold'}>
                {analysis.signalHold ? 'YES' : 'NO'}
              </span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3 flex gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Analysis based on platform occupancy, signal density, maintenance status, historical delay patterns, and priority train detection.
          </p>
        </div>
      </div>
    </div>
  );
};

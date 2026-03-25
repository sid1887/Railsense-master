'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, Clock, AlertCircle, Zap } from 'lucide-react';
import { HaltReason } from '@/services/haltReasonService';

interface HaltReasonDisplayProps {
  reason: HaltReason;
  isPrimary?: boolean;
}

export const HaltReasonDisplay: React.FC<HaltReasonDisplayProps> = ({ reason, isPrimary = true }) => {
  const severityColors = {
    low: 'bg-blue-50 border-blue-200',
    medium: 'bg-yellow-50 border-yellow-200',
    high: 'bg-orange-50 border-orange-200',
    critical: 'bg-red-50 border-red-200',
  };

  const severityTextColors = {
    low: 'text-blue-900',
    medium: 'text-yellow-900',
    high: 'text-orange-900',
    critical: 'text-red-900',
  };

  const severityBadgeColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    infrastructure: <Zap className="w-4 h-4" />,
    traffic: <AlertCircle className="w-4 h-4" />,
    maintenance: <Clock className="w-4 h-4" />,
    operational: <CheckCircle className="w-4 h-4" />,
    safety: <AlertTriangle className="w-4 h-4" />,
  };

  return (
    <div
      className={`border rounded-lg p-4 ${isPrimary ? 'ring-2 ring-purple-300' : ''} ${
        severityColors[reason.severity]
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {categoryIcons[reason.category]}
          <h4 className={`font-semibold ${severityTextColors[reason.severity]}`}>
            {reason.reason}
          </h4>
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded text-sm font-medium ${severityBadgeColors[reason.severity]}`}>
            {reason.severity.toUpperCase()}
          </span>
          <span className="px-2 py-1 rounded text-sm font-medium bg-purple-100 text-purple-800">
            {reason.confidence}%
          </span>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">Evidence:</p>
        <ul className="space-y-1">
          {reason.evidence.map((evidence, idx) => (
            <li key={idx} className="text-sm text-gray-600 ml-4 list-disc">
              {evidence}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Category: <span className="font-medium capitalize">{reason.category}</span>
      </div>
    </div>
  );
};

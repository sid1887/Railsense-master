'use client';

import React from 'react';
import { ChevronRight, Lightbulb, AlertCircle } from 'lucide-react';
import { ReasoningChain } from '@/services/explainabilityEngine';

interface ReasoningChainDisplayProps {
  chain: ReasoningChain;
  index?: number;
}

export const ReasoningChainDisplay: React.FC<ReasoningChainDisplayProps> = ({ chain, index = 0 }) => {
  const [expanded, setExpanded] = React.useState(index === 0);

  const getWeightColor = (weight: number) => {
    if (weight > 0.2) return 'text-red-600';
    if (weight > 0.12) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getDirectionIcon = (direction: 'positive' | 'negative' | 'neutral') => {
    if (direction === 'positive') return '↑';
    if (direction === 'negative') return '↓';
    return '→';
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 flex items-start justify-between cursor-pointer transition"
      >
        <div className="text-left flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-yellow-600" />
            <h4 className="font-semibold text-gray-900">{chain.conclusion}</h4>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-800 font-medium">
              {chain.confidence}% confidence
            </span>
          </div>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-gray-600 transition-transform flex-shrink-0 ${
            expanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-4 border-t border-gray-200 space-y-4">
          {/* Logical Flow */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-3">Reasoning Steps</h5>
            <div className="space-y-2">
              {chain.logicalFlow.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-semibold text-xs flex items-center justify-center">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 pt-0.5">{step}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Points */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-3">Evidence Factors</h5>
            <div className="space-y-2">
              {chain.evidence.map((evidence, idx) => (
                <div key={idx} className="bg-gray-50 rounded p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-500">
                        {getDirectionIcon(evidence.direction)}
                      </span>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{evidence.factor}</div>
                        <div className="text-xs text-gray-500">{evidence.source}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${getWeightColor(evidence.weight)}`}>
                      {(evidence.weight * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-700">{evidence.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alternative Explanations */}
          {chain.alternatives.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-3">Alternative Scenarios</h5>
              <div className="space-y-2">
                {chain.alternatives.map((alt, idx) => (
                  <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-sm font-semibold text-blue-900">{alt.explanation}</div>
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded font-medium whitespace-nowrap ml-2">
                        {alt.confidence}%
                      </span>
                    </div>
                    <div className="text-xs text-blue-700">
                      Probability: {(alt.probability * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

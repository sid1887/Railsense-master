'use client';

import React from 'react';
import { AlertTriangle, Lightbulb, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { ExplainedPrediction } from '@/services/explainabilityEngine';
import { ReasoningChainDisplay } from './ReasoningChainDisplay';

interface ExplainabilityCardProps {
  prediction: ExplainedPrediction;
  showNarrative?: boolean;
  narrative?: string;
}

export const ExplainabilityCard: React.FC<ExplainabilityCardProps> = ({
  prediction,
  showNarrative = false,
  narrative = '',
}) => {
  const confidence = Math.round(100 - prediction.uncertaintyScore);

  const getConfidenceColor = (conf: number) => {
    if (conf > 85) return 'border-green-200 bg-green-50';
    if (conf > 70) return 'border-yellow-200 bg-yellow-50';
    if (conf > 50) return 'border-orange-200 bg-orange-50';
    return 'border-red-200 bg-red-50';
  };

  const getUncertaintyColor = (uncertainty: number) => {
    if (uncertainty < 20) return 'text-green-700';
    if (uncertainty < 40) return 'text-yellow-700';
    if (uncertainty < 60) return 'text-orange-700';
    return 'text-red-700';
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${getConfidenceColor(confidence)}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
        <h3 className="text-lg font-bold mb-1">{prediction.prediction}</h3>
        <p className="text-purple-100 text-sm">{prediction.timeframe}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Confidence Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Confidence</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{confidence}%</div>
            <div className="text-xs text-gray-500 mt-1">High confidence prediction</div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Uncertainty</span>
            </div>
            <div className={`text-3xl font-bold ${getUncertaintyColor(prediction.uncertaintyScore)}`}>
              {prediction.uncertaintyScore.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Real-time factors</div>
          </div>
        </div>

        {/* Narrative Explanation */}
        {showNarrative && narrative && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 whitespace-pre-line font-medium leading-relaxed">
                {narrative}
              </div>
            </div>
          </div>
        )}

        {/* Key Factors */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Key Factors
          </h4>
          <div className="space-y-2">
            {prediction.keyFactors.map((factor, idx) => {
              const impactColors = {
                high: 'border-red-200 bg-red-50',
                medium: 'border-yellow-200 bg-yellow-50',
                low: 'border-blue-200 bg-blue-50',
              };

              const impactText = {
                high: 'text-red-700',
                medium: 'text-yellow-700',
                low: 'text-blue-700',
              };

              return (
                <div key={idx} className={`rounded-lg p-3 border ${impactColors[factor.impact]}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className={`font-semibold text-sm ${impactText[factor.impact]}`}>
                        {factor.name}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">{factor.explanation}</div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                        factor.impact === 'high'
                          ? 'bg-red-200 text-red-800'
                          : factor.impact === 'medium'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-blue-200 text-blue-800'
                      }`}
                    >
                      {factor.impact.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary Reasoning Chain */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Detailed Reasoning</h4>
          <ReasoningChainDisplay chain={prediction.primaryChain} index={0} />
        </div>

        {/* Supporting Chains */}
        {prediction.supportingChains.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Alternative Reasoning Paths</h4>
            <div className="space-y-3">
              {prediction.supportingChains.map((chain, idx) => (
                <ReasoningChainDisplay key={idx} chain={chain} index={idx + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Contextual Insights */}
        {prediction.contextualInsights.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Contextual Insights</h4>
            <div className="space-y-2">
              {prediction.contextualInsights.map((insight, idx) => (
                <div key={idx} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-gray-400">•</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {prediction.recommendations.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {prediction.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-green-800 list-disc ml-4">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Limitations */}
        {prediction.limitations.length > 0 && (
          <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-600" />
              Model Limitations
            </h4>
            <ul className="space-y-1">
              {prediction.limitations.map((limit, idx) => (
                <li key={idx} className="text-xs text-gray-700 list-disc ml-4">
                  {limit}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Info */}
        <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            This explanation is generated by combining statistical models, historical patterns, and real-time
            network data. Use alongside human judgment for critical decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

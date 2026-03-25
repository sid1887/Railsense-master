/**
 * Enhanced Train Search Component
 * Features: Autocomplete, recent searches, suggestions, loading state
 * PHASE 1 FIX: Uses Master Catalog API for train data (source of truth)
 */
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import RailLoader from '@/components/RailLoader';

interface SearchSuggestion {
  number: string;
  name: string;
  type: 'recent' | 'suggested';
}

interface CatalogTrain {
  trainNumber: string;
  trainName: string;
}

export const EnhancedSearchComponent: React.FC = () => {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchSuggestion[]>([]);
  const [catalogTrains, setCatalogTrains] = useState<CatalogTrain[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // PHASE 1 FIX: Load train catalog from API on mount
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/master-train-catalog?limit=200');
        const data = await response.json();
        const trains = data?.data?.trains || data?.trains;
        if (data.success && Array.isArray(trains)) {
          setCatalogTrains(
            trains.map((t: any) => ({
              trainNumber: t.trainNumber,
              trainName: t.trainName,
            }))
          );
          console.log(`[EnhancedSearch] Loaded ${trains.length} trains from catalog`);
        }
      } catch (error) {
        console.error('[EnhancedSearch] Failed to load catalog:', error);
      }
    };
    loadCatalog();
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentTrainSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Handle input changes and filtering
  useEffect(() => {
    if (!input.trim()) {
      // Show recent searches when input is empty
      setSuggestions(recentSearches);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      const query = input.toLowerCase();

      // First, filter from catalog
      const filtered = catalogTrains
        .filter(
          (train) =>
            train.trainNumber.includes(query) ||
            train.trainName.toLowerCase().includes(query)
        )
        .slice(0, 7)
        .map((train) => ({
          number: train.trainNumber,
          name: train.trainName,
          type: 'suggested' as const,
        }));

      // Add a "Search for" option if input is a number (allow any train number)
      const digitsOnly = query.replace(/\D/g, '');
      if (digitsOnly.length > 2 && !filtered.some(s => s.number === digitsOnly)) {
        filtered.push({
          number: digitsOnly,
          name: `Search Train ${digitsOnly}`,
          type: 'suggested' as const,
        });
      }

      setSuggestions(filtered);
      setIsLoading(false);
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [input, recentSearches, catalogTrains]);

  const handleSelectTrain = (trainNumber: string, trainName: string) => {
    console.log(`[EnhancedSearch] Selected train: ${trainNumber}`);

    // Add to recent searches
    const newRecent = [
      { number: trainNumber, name: trainName, type: 'recent' as const },
      ...recentSearches.filter((s) => s.number !== trainNumber),
    ].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recentTrainSearches', JSON.stringify(newRecent));

    // Show loading state
    setIsNavigating(true);
    setShowSuggestions(false);

    // Navigate to train detail page
    console.log(`[EnhancedSearch] Navigating to /train/${trainNumber}`);
    router.push(`/train/${trainNumber}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Allow pressing Enter with any input, extract digits as train number
      const digitsOnly = input.replace(/\D/g, '');
      if (digitsOnly.length > 0) {
        handleSelectTrain(digitsOnly, `Train ${digitsOnly}`);
      } else if (suggestions.length > 0) {
        handleSelectTrain(suggestions[0].number, suggestions[0].name);
      }
    }
  };

  return (
    <>
      {/* Full-screen loading overlay during navigation */}
      {isNavigating && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ margin: '0 auto 16px', width: 'fit-content' }}>
              <RailLoader size="lg" />
            </div>
            <div style={{ color: 'hsl(210, 20%, 92%)', fontSize: '14px', fontWeight: '500' }}>
              Loading train details...
            </div>
            <div style={{ color: 'hsl(215, 12%, 50%)', fontSize: '12px', marginTop: '8px' }}>
              Fetching real-time data
            </div>
          </div>
        </div>
      )}

      <div ref={searchRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search Input Container with Glassmorphism */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-accent-blue to-accent-cyan opacity-20 rounded-xl blur-lg group-hover:opacity-40 transition-opacity" />
        <div className="relative bg-dark-card backdrop-blur-xl bg-opacity-50 border border-accent-blue border-opacity-30 rounded-xl p-4 hover:border-opacity-50 transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-accent-blue flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by train number or name (e.g., 12702 or Coromandel)"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white placeholder-text-secondary outline-none text-lg"
            />
            {isLoading && (
              <RailLoader size="sm" />
            )}
          </div>

          {/* Loading Shimmer State */}
          {isLoading && (
            <div className="mt-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-gray-700 rounded animate-shimmer" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-dark-card border border-accent-blue border-opacity-30 rounded-xl overflow-hidden z-50 shadow-2xl shadow-accent-blue/20">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectTrain(suggestion.number, suggestion.name)}
              className="px-4 py-3 border-b border-dark-bg last:border-b-0 hover:bg-dark-bg cursor-pointer transition-colors duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-accent-blue group-hover:text-accent-cyan transition-colors">
                    {suggestion.number}
                  </div>
                  <div className="text-xs text-text-secondary">{suggestion.name}</div>
                </div>
                {suggestion.type === 'recent' && (
                  <span className="text-xs px-2 py-1 bg-accent-blue bg-opacity-20 text-accent-blue rounded">Recent</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Searches Fallback */}
      {input === '' && recentSearches.length > 0 && showSuggestions && (
        <div className="absolute top-full mt-2 w-full bg-dark-card border border-accent-blue border-opacity-30 rounded-xl overflow-hidden z-50 shadow-2xl shadow-accent-blue/20">
          <div className="px-4 py-2 text-xs text-text-secondary font-semibold uppercase tracking-wider bg-dark-bg">
            Recent Searches
          </div>
          {recentSearches.map((search, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectTrain(search.number, search.name)}
              className="px-4 py-3 border-b border-dark-bg last:border-b-0 hover:bg-dark-bg cursor-pointer transition-colors duration-200 group"
            >
              <div className="text-sm font-semibold text-accent-blue group-hover:text-accent-cyan transition-colors">
                {search.number} - {search.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click outside handler */}
      <div
        className="fixed inset-0 -z-10"
        onClick={() => setShowSuggestions(false)}
      />

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        .animate-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.2) 50%,
            rgba(255, 255, 255, 0.1) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
      </div>
    </>
  );
};

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Sliders } from 'lucide-react';
import { parseTrainNumber } from '@/lib/utils';
import RailLoader from '@/components/RailLoader';

/**
 * TrainSearch Component
 * Allows users to search for trains by number or name
 * Navigates to train details page on submission
 */
export default function TrainSearch() {
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const query = parseTrainNumber(searchInput.trim());
    if (!query) {
      setError('Please enter a valid train number');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push(`/train/${query}`);
    } catch (err) {
      setError('Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSearch}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full"
    >
      {/* Input Container */}
      <div className="relative mb-4">
        <div className="card p-1 flex items-center gap-3 border-accent-blue/30 focus-within:border-accent-blue focus-within:glow-blue transition-all duration-300">
          <Search className="text-accent-blue ml-4 flex-shrink-0" size={24} />
          <input
            type="text"
            placeholder="Search by train number (e.g., 12702) or name"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setError('');
            }}
            disabled={isLoading}
            className="flex-1 bg-transparent outline-none text-text-primary placeholder-text-secondary py-3 px-2"
          />
          <motion.button
            type="submit"
            disabled={isLoading || !searchInput.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <RailLoader size="xs" />
                Searching...
              </span>
            ) : (
              'Search'
            )}
          </motion.button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-alert-red/20 border border-alert-red text-alert-red px-4 py-3 rounded-lg text-sm mb-4"
        >
          {error}
        </motion.div>
      )}

      {/* Suggested Trains */}
      <div className="mt-6">
        <p className="text-text-secondary text-sm mb-3 pl-2">Popular Trains:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['12702', '17015', '11039'].map((trainNum) => (
            <motion.button
              key={trainNum}
              type="button"
              onClick={() => {
                setSearchInput(trainNum);
                router.push(`/train/${trainNum}`);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="card p-3 text-center hover:glow-blue transition-all duration-300 border-accent-blue/30"
            >
              <div className="font-semibold text-accent-blue">{trainNum}</div>
              <div className="text-xs text-text-secondary mt-1">Tap to view</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Advanced Search Link */}
      <motion.button
        type="button"
        onClick={() => router.push('/search')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full mt-6 card p-3 border border-dashed border-accent-blue/50 hover:border-accent-blue hover:bg-accent-blue/5 transition-all flex items-center justify-center gap-2 text-accent-blue hover:text-accent-blue-light"
      >
        <Sliders size={18} />
        <span className="font-semibold">Advanced Search & Filters</span>
      </motion.button>
    </motion.form>
  );
}

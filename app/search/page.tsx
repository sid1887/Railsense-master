/**
 * Advanced Train Search Page
 * Combined filtering, sorting, and results display
 */

import { Suspense } from 'react';
import { SearchPageContent } from './SearchPageContent';
import RailLoader from '@/components/RailLoader';

function SearchPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-bg to-dark-card p-4 md:p-8 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <RailLoader size="lg" />
        <p className="text-text-secondary">Loading search...</p>
      </div>
    </div>
  );
}

export default function AdvancedSearchPage() {
  return (
    <Suspense fallback={<SearchPageLoading />}>
      <SearchPageContent />
    </Suspense>
  );
}

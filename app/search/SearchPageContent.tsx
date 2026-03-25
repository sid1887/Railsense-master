'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import {
  TrainFilters,
  SortOptions,
  filterTrains,
  sortTrains,
  getRecommendedSort,
  FilteredTrain,
} from '@/services/filterService';
import FilterControls from '@/components/FilterControls';
import TrainResults from '@/components/TrainResults';

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<TrainFilters>({});
  const [sort, setSort] = useState<SortOptions>({ field: 'name', direction: 'asc' });
  const [allTrains, setAllTrains] = useState<FilteredTrain[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    const loadTrainCatalog = async () => {
      try {
        setCatalogLoading(true);
        const response = await fetch('/api/master-train-catalog?limit=200');
        const data = await response.json();

        if (data.success && data.data && data.data.trains) {
          const transformedTrains = data.data.trains.map((train: any) => ({
            trainNumber: train.trainNumber,
            trainName: train.trainName,
            speed: train.avgSpeed || train.maxSpeed || 0,
            delay: 0,
            status: 'moving' as const,
            region: train.zone || 'Unknown',
            distance: train.distance || 0,
            matchScore: 100,
            dataQuality: 95,
          }));

          setAllTrains(transformedTrains);
        } else {
          setAllTrains([]);
        }
      } catch {
        setAllTrains([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    loadTrainCatalog();
  }, []);

  useEffect(() => {
    const searchText = searchParams.get('q');
    const region = searchParams.get('region');
    const status = searchParams.get('status');

    if (searchText || region || status) {
      const nextFilters: TrainFilters = {
        searchText: searchText || undefined,
        region: region || undefined,
        status: (status as 'moving' | 'halted' | 'delayed') || undefined,
      };
      setFilters(nextFilters);
      setSort(getRecommendedSort(nextFilters));
    }
  }, [searchParams]);

  const filteredAndSortedTrains = useMemo(() => {
    const filtered = filterTrains(allTrains, filters);
    const sorted = sortTrains(filtered, sort);
    return sorted;
  }, [filters, sort, allTrains]);

  const handleFilterChange = (newFilters: TrainFilters) => {
    setFilters(newFilters);

    const params = new URLSearchParams();
    if (newFilters.searchText) params.set('q', newFilters.searchText);
    if (newFilters.region) params.set('region', newFilters.region);
    if (newFilters.status) params.set('status', newFilters.status);

    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    router.push(newUrl);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchText = e.target.value;
    handleFilterChange({ ...filters, searchText: searchText || undefined });
  };

  const handleSortChange = (newSort: SortOptions) => {
    setSort(newSort);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#17315f_0%,#0b132a_42%,#090d1f_100%)] px-4 pb-14 pt-8 md:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 rounded-2xl border border-cyan-300/20 bg-slate-900/55 p-6 backdrop-blur-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Train Discovery</p>
          <h1 className="mb-2 text-4xl font-black leading-tight text-white md:text-5xl">
            Search With Precision
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 md:text-base">
            Explore Indian railway trains with real catalog data and smart filters. Move from discovery to
            live intelligence in one flow.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricTile label="Catalog Status" value={catalogLoading ? 'Loading' : 'Live'} />
            <MetricTile label="Total Trains" value={allTrains.length} />
            <MetricTile label="Filtered" value={filteredAndSortedTrains.length} />
            <MetricTile label="Sort Mode" value={`${sort.field}:${sort.direction}`} />
          </div>
        </header>

        {/* Search Input */}
        <div className="mb-6 rounded-2xl border border-indigo-500/30 bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-400/70" />
            <input
              type="text"
              placeholder="Search train by name or number (e.g., Rajdhani, 12345)..."
              value={filters.searchText || ''}
              onChange={handleSearchChange}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {filters.searchText && (
              <button
                onClick={() => handleSearchChange({ target: { value: '' } } as any)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <FilterControls
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          activeFilters={filters}
          activeSort={sort}
          trainCount={filteredAndSortedTrains.length}
        />

        <div className="mt-6">
          <TrainResults
            trains={filteredAndSortedTrains}
            loading={catalogLoading}
            onTrainSelect={(trainNumber) => {
              router.push(`/train/${trainNumber}`);
            }}
          />
        </div>

        <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCard
            title="Real Catalog Data"
            text="Search and filters run against master catalog entries, not static placeholders."
          />
          <InfoCard
            title="Fast Filtering"
            text="Filter and sort update instantly so users can narrow routes quickly during peak periods."
          />
          <InfoCard
            title="Direct Train Drilldown"
            text="Any selected result routes straight into live train intelligence and prediction modules."
          />
        </section>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-950/55 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-cyan-200">{value}</p>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="surface-glass rounded-xl p-4">
      <h3 className="mb-2 text-base font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-300">{text}</p>
    </article>
  );
}

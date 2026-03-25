'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RailLoader from '@/components/RailLoader';
import HarmonicMandala from '@/components/backgrounds/HarmonicMandala';
import { GlassCard } from '@/components/ui/GlassCard';
import { ModernButton } from '@/components/ui/ModernButton';

interface SavedTrain {
  train_number: string;
  train_name: string;
  from_station: string;
  to_station: string;
  saved_at: string;
}

export default function SavedTrainsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [trains, setTrains] = useState<SavedTrain[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!loading && isAuthenticated) {
      fetchSavedTrains();
    }
  }, [isAuthenticated, loading, router]);

  const fetchSavedTrains = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/user/saved-trains', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch saved trains');

      const data = await res.json();
      setTrains(data.trains);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleUnsave = async (trainNumber: string) => {
    if (!confirm('Remove this train from saved trains?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/user/saved-trains?trainNumber=${trainNumber}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to unsave train');

      setTrains(trains.filter(t => t.train_number !== trainNumber));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RailLoader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background */}
      <HarmonicMandala />

      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              RailSense
            </h1>
            <p className="text-gray-400 text-sm">Saved Trains</p>
          </div>
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Header Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-white mb-2">❤️ Saved Trains</h2>
          <p className="text-gray-400">Your collection of favorite trains</p>
        </div>

        {/* Stats Cards */}
        {trains.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 animate-fadeInUp">
            <GlassCard hover className="p-6">
              <div className="text-gray-400 text-sm">Total Saved</div>
              <div className="text-4xl font-bold text-white mt-2">{trains.length}</div>
              <div className="text-indigo-400 text-xs mt-2">🚂 Trains</div>
            </GlassCard>
            <GlassCard hover className="p-6">
              <div className="text-gray-400 text-sm">Routes Covered</div>
              <div className="text-4xl font-bold text-white mt-2">
                {new Set(trains.map(t => t.from_station + '-' + t.to_station)).size}
              </div>
              <div className="text-purple-400 text-xs mt-2">🛤️ Routes</div>
            </GlassCard>
            <GlassCard hover className="p-6">
              <div className="text-gray-400 text-sm">Recently Added</div>
              <div className="text-lg font-bold text-white mt-2">
                {trains.length > 0
                  ? new Date(trains[0].saved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'N/A'
                }
              </div>
              <div className="text-pink-400 text-xs mt-2">📅 Date</div>
            </GlassCard>
          </div>
        )}

        {/* Trains Grid */}
        {trains.length === 0 ? (
          <div className="animate-fadeInUp">
            <GlassCard className="p-16 text-center">
              <div className="text-6xl mb-4">🚄</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Saved Trains Yet</h3>
              <p className="text-gray-400 mb-8">Start exploring trains and save your favorites to quick access them later</p>
              <Link href="/search">
                <ModernButton variant="glow" size="lg">
                  🔍 Search Trains
                </ModernButton>
              </Link>
            </GlassCard>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trains.map((train, idx) => (
              <div
                key={train.train_number}
                className="animate-fadeInUp"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <GlassCard hover neon className="h-full p-6 flex flex-col">
                  <div className="mb-4">
                    <Link
                      href={`/train/${train.train_number}`}
                      className="text-xl font-bold text-white hover:text-indigo-300 transition-colors"
                    >
                      {train.train_number}
                    </Link>
                    <h3 className="text-gray-300 text-sm mt-1">{train.train_name}</h3>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-3 my-4 flex-1">
                    <div>
                      <div className="text-xs text-gray-500">FROM</div>
                      <div className="font-semibold text-white text-sm">{train.from_station}</div>
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="text-indigo-400">→</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">TO</div>
                      <div className="font-semibold text-white text-sm">{train.to_station}</div>
                    </div>
                  </div>

                  {/* Save Date */}
                  <div className="text-xs text-gray-500 border-t border-white/10 pt-4 mb-4">
                    Saved {new Date(train.saved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/train/${train.train_number}`} className="flex-1">
                      <ModernButton variant="primary" size="sm" className="w-full">
                        View
                      </ModernButton>
                    </Link>
                    <ModernButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnsave(train.train_number)}
                      className="border-red-500/50 text-red-400"
                    >
                      💔
                    </ModernButton>
                  </div>
                </GlassCard>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

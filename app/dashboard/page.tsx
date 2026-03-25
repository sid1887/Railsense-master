'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import RailLoader from '@/components/RailLoader';
import HarmonicMandala from '@/components/backgrounds/HarmonicMandala';
import { GlassCard } from '@/components/ui/GlassCard';
import { ModernButton } from '@/components/ui/ModernButton';
import { AnimatedSectionHeader } from '@/components/ui/AnimatedSectionHeader';

export default function DashboardPage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    setIsVisible(true);
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RailLoader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const stats = [
    { label: 'Saved Trains', value: '0', icon: '❤️', color: 'from-pink-500 to-rose-500' },
    { label: 'Searches', value: '0', icon: '🔍', color: 'from-blue-500 to-purple-500' },
    { label: 'Alerts Active', value: '0', icon: '🔔', color: 'from-yellow-500 to-orange-500' },
    { label: 'Preferences', value: 'Configured', icon: '⚙️', color: 'from-green-500 to-emerald-500' },
  ];

  const quickLinks = [
    { href: '/search', label: 'Search Trains', icon: '🚆', desc: 'Find & track trains' },
    { href: '/saved-trains', label: 'Saved Trains', icon: '❤️', desc: 'Your favorites' },
    { href: '/preferences', label: 'Preferences', icon: '⚙️', desc: 'Customize experience' },
    { href: '/notifications', label: 'Notifications', icon: '🔔', desc: 'Stay updated' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Animation */}
      <HarmonicMandala />

      {/* Header Navigation */}
      <header className="relative z-10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              RailSense
            </h1>
            <p className="text-gray-400 text-sm">Smart Railway Intelligence</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-white font-semibold">{user?.name || user?.email}</p>
              <p className="text-gray-400 text-sm">{user?.role}</p>
            </div>
            <ModernButton
              variant="outline"
              size="sm"
              onClick={logout}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              Logout
            </ModernButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div
          className={`mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-5xl font-bold text-white mb-2">
                Welcome back, {user?.name?.split(' ')[0] || 'Traveler'}! 🚂
              </h2>
              <p className="text-gray-400 text-lg">Track, predict, and navigate your journeys with intelligence</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <GlassCard hover neon className="p-6 h-full group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`text-4xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all`}>
                    {stat.icon}
                  </div>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>

        {/* Quick Links Section */}
        <div className="mb-12">
          <AnimatedSectionHeader
            title="Quick Navigation"
            subtitle="Access your most-used features instantly"
            icon="⚡"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                className={`transition-all duration-500 group ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <GlassCard hover className="p-6 h-full">
                  <div className="text-4xl mb-3 group-hover:scale-125 transition-transform">
                    {link.icon}
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-indigo-400 transition-colors">
                    {link.label}
                  </h3>
                  <p className="text-gray-400 text-sm">{link.desc}</p>
                </GlassCard>
              </Link>
            ))}
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2">
            <AnimatedSectionHeader title="Profile Summary" icon="👤" />
            <GlassCard neon className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Full Name</p>
                    <p className="text-white text-xl font-semibold">{user?.name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Email Address</p>
                    <p className="text-white text-xl font-semibold break-all">{user?.email}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Account Role</p>
                    <p className="text-white text-xl font-semibold capitalize">{user?.role}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Member Since</p>
                    <p className="text-white text-xl font-semibold">
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <Link href="/profile">
                <ModernButton variant="glow" size="lg" className="w-full mt-8">
                  ✏️ Edit Profile
                </ModernButton>
              </Link>
            </GlassCard>
          </div>

          {/* Quick Stats */}
          <div>
            <AnimatedSectionHeader title="Account Status" icon="✅" />
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-white">Account Active</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
                <span className="text-white">Alerts Enabled</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-white">Real-time Tracking</span>
              </div>
              <hr className="border-white/10 my-4" />
              <Link href="/preferences">
                <ModernButton variant="secondary" size="md" className="w-full">
                  Manage Settings
                </ModernButton>
              </Link>
            </GlassCard>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <AnimatedSectionHeader title="Recent Activity" icon="📊" />
          <GlassCard className="p-8">
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-4">No activity yet</p>
              <p className="text-gray-500 text-sm mb-6">Start exploring trains to see your activity here</p>
              <Link href="/search">
                <ModernButton variant="primary" size="lg">
                  🚆 Search Trains Now
                </ModernButton>
              </Link>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}

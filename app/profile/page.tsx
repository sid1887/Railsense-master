'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import RailLoader from '@/components/RailLoader';
import HarmonicMandala from '@/components/backgrounds/HarmonicMandala';
import { GlassCard } from '@/components/ui/GlassCard';
import { ModernButton } from '@/components/ui/ModernButton';

export default function ProfilePage() {
  const { user, isAuthenticated, loading, updateProfile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    if (user?.name) {
      setName(user.name);
    }
    setIsVisible(true);
  }, [isAuthenticated, loading, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile({ name });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Animation */}
      <HarmonicMandala />

      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              RailSense
            </h1>
            <p className="text-gray-400 text-sm">Profile Settings</p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          className={`transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">Edit Profile</h2>
            <p className="text-gray-400">Update your personal information</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 flex items-center gap-2">
              <span>✓</span>
              {success}
            </div>
          )}

          {/* Profile Form Card */}
          <GlassCard neon className="p-8 mb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input-modern w-full bg-white/5 cursor-not-allowed opacity-60"
                />
                <p className="text-xs text-gray-500 mt-1">Your email address cannot be changed</p>
              </div>

              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-modern w-full"
                  placeholder="Enter your full name"
                />
                <p className="text-xs text-gray-500 mt-1">This is how you'll appear in the system</p>
              </div>

              {/* Role Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Role</label>
                <input
                  type="text"
                  value={user?.role || ''}
                  disabled
                  className="input-modern w-full bg-white/5 cursor-not-allowed opacity-60"
                />
                <p className="text-xs text-gray-500 mt-1">Your account type</p>
              </div>

              {/* Member Since */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  <span className="font-semibold">Member Since:</span>{' '}
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6">
                <ModernButton
                  variant="glow"
                  size="lg"
                  className="flex-1"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? 'Saving...' : '✓ Save Profile'}
                </ModernButton>
                <ModernButton
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  Cancel
                </ModernButton>
              </div>
            </form>
          </GlassCard>

          {/* Account Info Card */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Account Status</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400">Active</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Email Verified</span>
                <span className="text-purple-400">✓ Verified</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Two-Factor Auth</span>
                <span className="text-gray-400">Not enabled</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}

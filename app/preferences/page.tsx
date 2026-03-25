'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import RailLoader from '@/components/RailLoader';
import HarmonicMandala from '@/components/backgrounds/HarmonicMandala';
import { GlassCard } from '@/components/ui/GlassCard';
import { ModernButton } from '@/components/ui/ModernButton';

interface Preferences {
  notification_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  theme: string;
  language: string;
  alert_frequency: string;
}

const ToggleSwitch = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) => (
  <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10">
    <label className="text-gray-200 font-medium">{label}</label>
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        checked ? 'bg-indigo-500' : 'bg-gray-500'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export default function PreferencesPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences>({
    notification_enabled: true,
    email_enabled: true,
    push_enabled: true,
    theme: 'dark',
    language: 'en',
    alert_frequency: 'immediate',
  });
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!loading && isAuthenticated) {
      fetchPreferences();
    }
  }, [isAuthenticated, loading, router]);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/user/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch preferences');

      const data = await res.json();
      setPreferences(data.preferences);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notificationEnabled: preferences.notification_enabled,
          emailEnabled: preferences.email_enabled,
          pushEnabled: preferences.push_enabled,
          theme: preferences.theme,
          language: preferences.language,
          alertFrequency: preferences.alert_frequency,
        }),
      });

      if (!res.ok) throw new Error('Failed to save preferences');

      setSuccess('✓ Preferences saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
            <p className="text-gray-400 text-sm">Preferences</p>
          </div>
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 animate-fadeInUp">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 animate-fadeInUp">
            {success}
          </div>
        )}

        {/* Header Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-white mb-2">⚙️ Preferences</h2>
          <p className="text-gray-400">Customize your RailSense experience</p>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Notification Settings Section */}
          <div className="animate-fadeInUp" style={{ animationDelay: '100ms' }}>
            <GlassCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🔔</span>
                <h3 className="text-2xl font-bold text-white">Notification Settings</h3>
              </div>
              <div className="space-y-3">
                <ToggleSwitch
                  checked={preferences.notification_enabled}
                  onChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      notification_enabled: checked,
                    })
                  }
                  label="Enable all notifications"
                />
                <ToggleSwitch
                  checked={preferences.email_enabled}
                  onChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      email_enabled: checked,
                    })
                  }
                  label="Email notifications"
                />
                <ToggleSwitch
                  checked={preferences.push_enabled}
                  onChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      push_enabled: checked,
                    })
                  }
                  label="Push notifications"
                />
              </div>
            </GlassCard>
          </div>

          {/* Alert Frequency Section */}
          <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <GlassCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">⏱️</span>
                <h3 className="text-2xl font-bold text-white">Alert Frequency</h3>
              </div>
              <select
                value={preferences.alert_frequency}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    alert_frequency: e.target.value,
                  })
                }
                className="input-modern w-full"
              >
                <option value="immediate">🚨 Immediate</option>
                <option value="hourly">⏰ Hourly Digest</option>
                <option value="daily">📅 Daily Digest</option>
                <option value="never">🔇 Never</option>
              </select>
              <p className="text-gray-400 text-sm mt-3">
                Choose how often you want to receive train alerts and notifications
              </p>
            </GlassCard>
          </div>

          {/* Appearance Section */}
          <div className="animate-fadeInUp" style={{ animationDelay: '300ms' }}>
            <GlassCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🎨</span>
                <h3 className="text-2xl font-bold text-white">Appearance</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 font-medium mb-3">Theme</label>
                  <select
                    value={preferences.theme}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        theme: e.target.value,
                      })
                    }
                    className="input-modern w-full"
                  >
                    <option value="light">☀️ Light</option>
                    <option value="dark">🌙 Dark</option>
                    <option value="auto">📱 Auto (System)</option>
                  </select>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Language Section */}
          <div className="animate-fadeInUp" style={{ animationDelay: '400ms' }}>
            <GlassCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🌍</span>
                <h3 className="text-2xl font-bold text-white">Language</h3>
              </div>
              <select
                value={preferences.language}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    language: e.target.value,
                  })
                }
                className="input-modern w-full"
              >
                <option value="en">🇺🇸 English</option>
                <option value="hi">🇮🇳 Hindi</option>
                <option value="es">🇪🇸 Spanish</option>
                <option value="fr">🇫🇷 French</option>
              </select>
              <p className="text-gray-400 text-sm mt-3">
                Select your preferred language for the RailSense interface
              </p>
            </GlassCard>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 animate-fadeInUp" style={{ animationDelay: '500ms' }}>
            <ModernButton
              type="submit"
              variant="glow"
              size="lg"
              disabled={saving}
              className="flex-1"
            >
              {saving ? '⏳ Saving...' : '💾 Save Preferences'}
            </ModernButton>
            <ModernButton
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              className="border-gray-500/50 text-gray-300"
            >
              Cancel
            </ModernButton>
          </div>
        </form>
      </main>
    </div>
  );
}

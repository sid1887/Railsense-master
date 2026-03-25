'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import RailLoader from '@/components/RailLoader';
import HarmonicMandala from '@/components/backgrounds/HarmonicMandala';
import { GlassCard } from '@/components/ui/GlassCard';
import { ModernButton } from '@/components/ui/ModernButton';

interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  train_number: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!loading && isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, loading, router]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/user/notifications?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch notifications');

      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/api/user/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationId,
        }),
      });

      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/api/user/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'markAllAsRead' }),
      });

      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/user/notifications?id=${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(notifications.filter((n) => n.id !== notificationId));
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

  const notificationIcons: Record<string, string> = {
    delay: '⏱️',
    alert: '🚨',
    update: '📢',
    arrival: '🎉',
    departure: '🚂',
    default: '🔔',
  };

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
            <p className="text-gray-400 text-sm">Notifications</p>
          </div>
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                {unreadCount} unread
              </span>
            )}
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
              ← Back
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-bold text-white mb-2">🔔 Notifications</h2>
            <p className="text-gray-400">Stay updated with your train alerts and events</p>
          </div>
          {unreadCount > 0 && (
            <ModernButton
              variant="glow"
              size="md"
              onClick={handleMarkAllAsRead}
            >
              ✓ Mark All Read
            </ModernButton>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="animate-fadeInUp">
            <GlassCard className="p-12 text-center">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-bold text-white mb-2">All Caught Up!</h3>
              <p className="text-gray-400 mb-6">You don't have any notifications yet</p>
              <Link href="/search">
                <ModernButton variant="primary" size="lg">
                  🚆 Search Trains
                </ModernButton>
              </Link>
            </GlassCard>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif, idx) => (
              <div
                key={notif.id}
                className={`animate-fadeInUp`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <GlassCard
                  hover
                  neon={!notif.is_read}
                  className={`p-6 ${!notif.is_read ? 'border-yellow-500/50' : ''}`}
                >
                  <div className="flex gap-4">
                    <div className="text-3xl flex-shrink-0">
                      {notificationIcons[notif.notification_type] || notificationIcons.default}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">{notif.title}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          !notif.is_read
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                        }`}>
                          {notif.is_read ? 'Read' : 'Unread'}
                        </span>
                        <span className="text-xs px-3 py-1 rounded-full font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
                          {notif.notification_type}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-3">{notif.message}</p>
                      {notif.train_number && (
                        <Link
                          href={`/train/${notif.train_number}`}
                          className="inline-block text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-2"
                        >
                          → View Train {notif.train_number}
                        </Link>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(notif.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!notif.is_read && (
                        <ModernButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="border-indigo-500/50 text-indigo-400"
                        >
                          Read
                        </ModernButton>
                      )}
                      <ModernButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(notif.id)}
                        className="border-red-500/50 text-red-400"
                      >
                        Delete
                      </ModernButton>
                    </div>
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

/**
 * Global Navbar Component
 * Sticky navigation with breadcrumbs, features dropdown, and page indicator
 */
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFeaturesDropdown, setShowFeaturesDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Generate breadcrumbs based on current path
  useEffect(() => {
    const segments = pathname.split('/').filter((s) => s);
    const crumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

    let currentPath = '';
    segments.forEach((segment, i) => {
      currentPath += `/${segment}`;
      let label = segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Special case for train numbers
      if (segment === 'train' && segments[i + 1]) {
        label = `Train ${segments[i + 1]}`;
      }

      if (i !== segments.length - 1 || segment !== 'train') {
        crumbs.push({ label, href: currentPath });
      }
    });

    setBreadcrumbs(crumbs);
  }, [pathname]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const intelligenceFeatures = [
    { label: 'Intelligence Hub', href: '/intelligence-hub', desc: 'Central tracking and network overview' },
    { label: 'Data Quality', href: '/data-quality', desc: 'Source health and transparency' },
    { label: 'Intelligence Dashboard', href: '/intelligence', desc: 'Unified view of AI modules' },
    { label: 'Network Intelligence', href: '/test-network-intelligence', desc: 'Railway network analysis' },
    { label: 'Halt Analysis', href: '/test-halt-analysis', desc: 'Advanced halt detection' },
    { label: 'Explainability', href: '/test-explainability', desc: 'Reasoning and confidence factors' },
    { label: 'Passenger Safety', href: '/test-passenger-safety', desc: 'Safety metrics and risk analysis' },
    { label: 'Cascade Detection', href: '/test-cascade-analysis', desc: 'Delay propagation analysis' },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-dark-bg/80 backdrop-blur-xl border-b border-accent-blue/20'
          : 'bg-transparent'
      }`}
    >
      {/* Gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-accent-blue to-transparent opacity-20" />

      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-cyan hover:opacity-80 transition-opacity"
          >
            RailSense
          </Link>

          {/* Center Navigation - Breadcrumbs */}
          <div className="hidden lg:flex items-center gap-2 text-sm flex-1 ml-8">
            {breadcrumbs.slice(0, 3).map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && <span className="text-text-secondary">/</span>}
                <Link
                  href={crumb.href}
                  className={`transition-colors ${
                    pathname === crumb.href
                      ? 'text-accent-blue font-semibold'
                      : 'text-text-secondary hover:text-accent-blue'
                  }`}
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Features Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFeaturesDropdown(!showFeaturesDropdown)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Intelligence</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showFeaturesDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showFeaturesDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-64 bg-dark-card/95 backdrop-blur-lg border border-accent-blue/30 rounded-lg shadow-xl py-2 z-50"
                >
                  {intelligenceFeatures.map((feature) => (
                    <Link
                      key={feature.href}
                      href={feature.href}
                      onClick={() => setShowFeaturesDropdown(false)}
                      className="flex flex-col gap-1 px-4 py-3 hover:bg-accent-blue/10 transition-colors border-b border-accent-blue/10 last:border-b-0"
                    >
                      <span className="text-sm font-semibold text-accent-blue">{feature.label}</span>
                      <span className="text-xs text-text-secondary">{feature.desc}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Search Button */}
            <Link
              href="/search"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 transition-colors text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search</span>
            </Link>

            {/* Auth Buttons / User Menu */}
            {!loading && (
              isAuthenticated && user ? (
                // User Menu (Logged In)
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors text-sm font-semibold"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <span className="hidden sm:inline">{user.name || user.email}</span>
                  </button>

                  {/* User Menu Dropdown */}
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-dark-card/95 backdrop-blur-lg border border-accent-green/30 rounded-lg shadow-xl py-2 z-50"
                    >
                      <Link
                        href="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex gap-2 px-4 py-3 hover:bg-accent-green/10 transition-colors border-b border-accent-green/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 16l4-4m0 0l4 4m-4-4V5" />
                        </svg>
                        <span className="text-sm text-accent-green">Dashboard</span>
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex gap-2 px-4 py-3 hover:bg-accent-green/10 transition-colors border-b border-accent-green/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm text-accent-green">Profile</span>
                      </Link>
                      <Link
                        href="/preferences"
                        onClick={() => setShowUserMenu(false)}
                        className="flex gap-2 px-4 py-3 hover:bg-accent-green/10 transition-colors border-b border-accent-green/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm text-accent-green">Settings</span>
                      </Link>
                      <Link
                        href="/saved-trains"
                        onClick={() => setShowUserMenu(false)}
                        className="flex gap-2 px-4 py-3 hover:bg-accent-green/10 transition-colors border-b border-accent-green/10"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                        </svg>
                        <span className="text-sm text-accent-green">Saved Trains</span>
                      </Link>
                      <Link
                        href="/notifications"
                        onClick={() => setShowUserMenu(false)}
                        className="flex gap-2 px-4 py-3 hover:bg-accent-green/10 transition-colors border-b border-accent-green/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span className="text-sm text-accent-green">Notifications</span>
                      </Link>
                      <button
                        onClick={async () => {
                          setShowUserMenu(false);
                          await logout();
                          router.push('/');
                        }}
                        className="w-full flex gap-2 px-4 py-3 hover:bg-red-500/10 transition-colors text-red-500 text-sm font-semibold"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                // Auth Buttons (Not Logged In)
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-accent-blue border border-accent-blue/50 hover:bg-accent-blue/10 transition-colors text-sm font-semibold"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue text-dark-bg hover:bg-accent-blue/90 transition-colors text-sm font-semibold"
                  >
                    Sign Up
                  </Link>
                </div>
              )
            )}

          </div>
        </div>
      </div>
    </motion.nav>
  );
};

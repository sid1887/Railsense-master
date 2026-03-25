'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import SubsidiaryServicesDropdown from './SubsidiaryServicesDropdown';
import './design-system.css';

interface TopNavigationBarProps {
  trainNumber?: string;
  trainName?: string;
  showHeatmap?: boolean;
  showDemo?: boolean;
  onHeatmapToggle?: (enabled: boolean) => void;
  onDemoToggle?: (enabled: boolean) => void;
  onTrainSearch?: (trainNumber: string) => void;
}

export default function TopNavigationBar({
  trainNumber = '14645',
  trainName = 'Hussain Sagar Express',

  onTrainSearch,
}: TopNavigationBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        // Try to parse query as train number (numbers only)
        const cleanQuery = searchQuery.replace(/\D/g, ''); // Extract only digits
        if (cleanQuery.length > 0) {
          setSearchResults([cleanQuery]);
        } else {
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSelect = (trainNum: string) => {
    onTrainSearch?.(trainNum);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const cleanQuery = searchQuery.replace(/\D/g, '');
      if (cleanQuery) {
        handleSearchSelect(cleanQuery);
      }
    }
  };

  return (
    <>
      {/* Fixed Top Navigation Bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          zIndex: 1000,
          backgroundColor: 'rgba(19, 24, 41, 0.8)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderBottom: '1px solid hsl(220, 14%, 18%)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '16px',
          paddingRight: '16px',
          gap: '24px',
        }}
      >
        {/* LEFT SECTION — Logo & Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', minWidth: '280px' }}>
          {/* Logo */}
          <div
            style={{
              fontSize: '18px',
              fontWeight: '700',
              fontFamily: 'Figtree, sans-serif',
              color: 'hsl(262, 83%, 58%)',
              whiteSpace: 'nowrap',
            }}
          >
            RailSense
          </div>

          {/* Breadcrumb */}
          <div
            style={{
              fontSize: '12px',
              color: 'hsl(215, 12%, 50%)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
            className="hide-mobile"
          >
            <Link
              href="/"
              style={{
                color: 'hsl(215, 12%, 50%)',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(190, 100%, 50%)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(215, 12%, 50%)')}
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href={`/train/${trainNumber}`}
              style={{
                color: 'hsl(215, 12%, 50%)',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(190, 100%, 50%)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(215, 12%, 50%)')}
            >
              Train {trainNumber}
            </Link>
            <span>/</span>
            <span style={{ color: 'hsl(210, 20%, 92%)' }}>Status</span>
          </div>
        </div>

        {/* CENTER SECTION — Search */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }} className="hide-mobile">
          <div
            style={{
              position: 'relative',
              width: '320px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '36px',
                backgroundColor: 'hsl(220, 16%, 14%)',
                border: searchOpen ? '1px solid hsl(262, 83%, 58%)' : '1px solid hsl(220, 14%, 18%)',
                borderRadius: '8px',
                paddingLeft: '12px',
                paddingRight: '12px',
                gap: '8px',
                transition: 'border-color 150ms ease',
              }}
            >
              <Search size={16} style={{ color: 'hsl(215, 12%, 50%)' }} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search train number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => {
                  // Delay blur to allow click on dropdown items
                  setTimeout(() => setSearchOpen(false), 200);
                }}
                onKeyPress={handleKeyPress}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: 'hsl(210, 20%, 92%)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Search Dropdown */}
            <AnimatePresence>
            {searchOpen && searchQuery.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: '40px',
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(19, 24, 41, 0.95)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid hsl(220, 14%, 18%)',
                  borderRadius: '8px',
                  marginTop: '4px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                }}
              >
                {searchResults.length > 0 ? (
                  searchResults.map((num) => (
                    <div
                      key={num}
                      onClick={() => handleSearchSelect(num)}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid hsl(220, 14%, 18%)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        transition: 'background-color 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>Train {num}</div>
                      <div style={{ fontSize: '11px', color: 'hsl(215, 12%, 50%)' }}>
                        Press Enter or click to search
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '10px 12px', color: 'hsl(215, 12%, 50%)', fontSize: '13px' }}>
                    <div>Enter train number</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>
                      Example: 12955, 14645, 16731
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT SECTION — Intelligence Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <SubsidiaryServicesDropdown trainNumber={trainNumber || '14645'} displayLabel="Intelligence" />
        </div>

      </div>

      {/* Spacer for fixed nav */}
      <div style={{ height: '56px' }} />
    </>
  );
}

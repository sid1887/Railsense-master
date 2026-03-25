'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SubsidiaryServicesDropdownProps {
  trainNumber: string;
  displayLabel?: string;
}

export default function SubsidiaryServicesDropdown({
  trainNumber,
  displayLabel = 'Intelligence',
}: SubsidiaryServicesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const services = [
    {
      name: 'Halt Analysis',
      href: `/test-halt-analysis?trainNumber=${trainNumber}`,
      icon: '⏸️',
      color: 'rgba(252, 163, 17, 0.1)',
      borderColor: 'rgba(252, 163, 17, 0.3)',
      textColor: 'hsl(38, 92%, 55%)',
    },
    {
      name: 'Cascade Analysis',
      href: `/test-cascade-analysis?trainNumber=${trainNumber}`,
      icon: '📈',
      color: 'rgba(220, 38, 38, 0.1)',
      borderColor: 'rgba(220, 38, 38, 0.3)',
      textColor: 'hsl(0, 82%, 56%)',
    },
    {
      name: 'Network Intelligence',
      href: `/test-network-intelligence?trainNumber=${trainNumber}`,
      icon: '🌐',
      color: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      textColor: 'hsl(217, 91%, 60%)',
    },
    {
      name: 'Passenger Safety',
      href: `/test-passenger-safety?trainNumber=${trainNumber}`,
      icon: '👥',
      color: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      textColor: 'hsl(142, 71%, 45%)',
    },
    {
      name: 'Explainability',
      href: `/test-explainability?trainNumber=${trainNumber}`,
      icon: '🧠',
      color: 'rgba(168, 85, 247, 0.1)',
      borderColor: 'rgba(168, 85, 247, 0.3)',
      textColor: 'hsl(259, 84%, 60%)',
    },
    {
      name: 'Data Quality',
      href: `/data-quality?trainNumber=${trainNumber}`,
      icon: '📊',
      color: 'rgba(6, 182, 212, 0.1)',
      borderColor: 'rgba(6, 182, 212, 0.3)',
      textColor: 'hsl(188, 94%, 46%)',
    },
  ];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '6px',
          color: 'hsl(217, 91%, 60%)',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        }}
      >
        {displayLabel || '⚡ Intelligence'}
        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '8px',
            backgroundColor: 'hsl(220, 20%, 10%)',
            border: '1px solid hsl(220, 14%, 18%)',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            minWidth: '220px',
            overflow: 'hidden',
          }}
        >
          {services.map((service) => (
            <a
              key={service.name}
              href={service.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: service.textColor,
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.15s',
                backgroundColor: 'transparent',
                borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>{service.icon}</span>
              <span>{service.name}</span>
            </a>
          ))}
          <div
            style={{
              padding: '8px 16px',
              fontSize: '11px',
              color: 'hsl(210, 20%, 50%)',
              borderTop: '1px solid rgba(59, 130, 246, 0.1)',
            }}
          >
            Train: <strong>{trainNumber}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

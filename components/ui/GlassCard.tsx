'use client';

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  neon?: boolean;
}

export function GlassCard({
  children,
  className = '',
  hover = true,
  neon = false,
}: GlassCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        border border-slate-700/50
        bg-slate-900/65
        backdrop-blur-md
        shadow-lg shadow-black/30
        transition-all duration-300
        ${hover ? 'hover:shadow-xl hover:shadow-indigo-500/25 hover:-translate-y-1 hover:border-slate-600/70' : ''}
        ${neon ? 'border-indigo-500/60 shadow-indigo-500/30 bg-slate-900/70' : ''}
        ${className}
      `}
    >
      {neon && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-transparent to-purple-600/10 pointer-events-none" />
      )}
      {children}
    </div>
  );
}

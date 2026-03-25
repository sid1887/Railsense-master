'use client';

import React from 'react';

interface AnimatedSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function AnimatedSectionHeader({
  title,
  subtitle,
  icon,
}: AnimatedSectionHeaderProps) {
  return (
    <div className="mb-8 animate-fadeInUp">
      <div className="flex items-center gap-3 mb-2">
        {icon && <div className="text-3xl animate-pulse">{icon}</div>}
        <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          {title}
        </h2>
      </div>
      {subtitle && (
        <p className="text-gray-600 text-lg mt-2 animate-fadeInUp animation-delay-100">
          {subtitle}
        </p>
      )}
    </div>
  );
}

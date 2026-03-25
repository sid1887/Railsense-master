'use client';

import React from 'react';

interface ModernButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
  [key: string]: any;
}

export function ModernButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
  ...props
}: ModernButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';

  const variants = {
    primary: `
      bg-gradient-to-r from-indigo-600 to-indigo-500
      text-white
      hover:shadow-lg hover:shadow-indigo-500/50 hover:scale-105
      active:scale-95
    `,
    secondary: `
      bg-gradient-to-r from-purple-600 to-pink-500
      text-white
      hover:shadow-lg hover:shadow-pink-500/50 hover:scale-105
      active:scale-95
    `,
    outline: `
      border-2 border-indigo-500 text-indigo-600
      hover:bg-indigo-50 hover:scale-105
      active:scale-95
    `,
    glow: `
      bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500
      text-white
      shadow-lg shadow-indigo-500/50
      hover:shadow-2xl hover:shadow-indigo-500/70 hover:scale-105
      active:scale-95
    `,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

import React from 'react';

type RailLoaderSize = 'xs' | 'sm' | 'md' | 'lg';

interface RailLoaderProps {
  size?: RailLoaderSize;
  className?: string;
  label?: string;
}

const SIZE_CLASS: Record<RailLoaderSize, string> = {
  xs: 'rs-loader-xs',
  sm: 'rs-loader-sm',
  md: 'rs-loader-md',
  lg: 'rs-loader-lg',
};

export default function RailLoader({ size = 'md', className = '', label = 'Loading' }: RailLoaderProps) {
  return <span role="status" aria-label={label} className={`rs-loader ${SIZE_CLASS[size]} ${className}`.trim()} />;
}

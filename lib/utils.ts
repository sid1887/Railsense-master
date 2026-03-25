/**
 * Utility functions for RailSense
 * Common helpers for calculations, formatting, and data manipulation
 */

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format time from minutes into readable string
 * Example: 65 -> "1h 5m"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins > 0 ? mins + 'm' : ''}`.trim();
}

/**
 * Format time from ISO string or timestamp
 * Example: "14:30" or "2:30 PM"
 */
export function formatTime(time: string | number): string {
  if (typeof time === 'number') {
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return time;
}

/**
 * Get visual representation of uncertainty level
 * Returns color class for Tailwind CSS
 */
export function getUncertaintyColor(level: string): string {
  const colors: Record<string, string> = {
    LOW: 'text-green-400',
    MEDIUM: 'text-yellow-400',
    HIGH: 'text-alert-orange',
    CRITICAL: 'text-alert-red',
  };
  return colors[level] || colors.LOW;
}

/**
 * Get visual representation of congestion level
 * Returns color class for Tailwind CSS
 */
export function getCongestionColor(level: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-green-900/20 text-green-300 border-green-700',
    MEDIUM: 'bg-yellow-900/20 text-yellow-300 border-yellow-700',
    HIGH: 'bg-alert-orange/20 text-alert-orange border-alert-orange',
  };
  return colors[level] || colors.LOW;
}

/**
 * Convert speed to readable format
 * Example: 62 -> "62 km/h"
 */
export function formatSpeed(speed: number): string {
  if (speed === 0) return 'Stationary';
  return `${Math.round(speed)} km/h`;
}

/**
 * Get train status badge color
 */
export function getStatusColor(speed: number, delay: number): string {
  if (speed === 0 && delay > 5) return 'badge-danger';
  if (delay > 10) return 'badge-warning';
  return 'badge-success';
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get greeting based on time of day
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Parse train number from string (handles common formats)
 */
export function parseTrainNumber(input: string): string {
  return input.toUpperCase().replace(/[^\w]/g, '');
}

/**
 * Generate a unique ID for tracking
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Round number to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

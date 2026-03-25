/**
 * Weather Service
 * Fetches real-time weather data from OpenWeatherMap API
 * Includes temperature, conditions, wind, precipitation for train location
 */

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'b6054a812f7c020b3c0de08c40783728';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export interface WeatherData {
  temperature: number; // Celsius
  feels_like: number;
  condition: string; // Clear, Cloudy, Rainy, etc.
  humidity: number; // 0-100
  wind_speed: number; // m/s
  wind_direction: number; // degrees 0-360
  pressure: number; // hPa
  visibility: number; // meters
  precipitation: number; // mm/hour
  cloudiness: number; // 0-100%
  uvi: number; // UV index
  timestamp: number;
}

// Cache weather results to avoid excessive API calls
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_TTL_MS = 600000; // 10 minutes

/**
 * Get weather for train location
 * @param lat - latitude
 * @param lng - longitude
 * @returns Weather data or null if fetch fails
 */
export async function getWeatherAtLocation(
  lat: number,
  lng: number
): Promise<WeatherData | null> {
  // Check cache first
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // Call OpenWeatherMap API
    const url = new URL(OPENWEATHER_BASE_URL);
    url.searchParams.append('lat', lat.toString());
    url.searchParams.append('lon', lng.toString());
    url.searchParams.append('appid', OPENWEATHER_API_KEY);
    url.searchParams.append('units', 'metric'); // Celsius

    console.log(`[Weather] Fetching for ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(`[Weather] API returned ${response.status}`);
        return null;
      }

      const data = await response.json() as any;

      // Extract current weather from response (v2.5 API structure)
      if (!data.main) {
        console.warn('[Weather] No weather data in response');
        return null;
      }

      const weather: WeatherData = {
        temperature: Math.round(data.main.temp * 10) / 10,
        feels_like: Math.round(data.main.feels_like * 10) / 10,
        condition: getWeatherCondition(data.weather?.[0]?.main || 'Unknown'),
        humidity: data.main.humidity || 0,
        wind_speed: Math.round((data.wind?.speed || 0) * 10) / 10,
        wind_direction: data.wind?.deg || 0,
        pressure: data.main.pressure || 0,
        visibility: data.visibility || 10000,
        precipitation: data.rain?.['1h'] || 0,
        cloudiness: data.clouds?.all || 0,
        uvi: 0, // v2.5 doesn't include UVI in main endpoint
        timestamp: Date.now(),
      };

      // Cache it
      weatherCache.set(cacheKey, { data: weather, timestamp: Date.now() });

      console.log(`[Weather] ✓ Got weather: ${weather.temperature}°C, ${weather.condition}`);
      return weather;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error(`[Weather] Error fetching:`, error);
    return null;
  }
}

/**
 * Clear old cache entries
 */
export function clearWeatherCache() {
  const now = Date.now();
  for (const [key, { timestamp }] of weatherCache) {
    if (now - timestamp > CACHE_TTL_MS) {
      weatherCache.delete(key);
    }
  }
}

/**
 * Convert OpenWeatherMap condition to user-friendly string
 */
function getWeatherCondition(owmCondition: string): string {
  const conditionMap: Record<string, string> = {
    Clear: 'Clear skies',
    Clouds: 'Cloudy',
    Drizzle: 'Light rain',
    Rain: 'Rainy',
    Thunderstorm: 'Thunderstorm',
    Snow: 'Snowy',
    Mist: 'Misty',
    Smoke: 'Smoky',
    Haze: 'Hazy',
    Dust: 'Dusty',
    Fog: 'Foggy',
    Sand: 'Sandy',
    Ash: 'Ashy',
    Squall: 'Squall',
    Tornado: 'Tornado',
  };

  return conditionMap[owmCondition] || owmCondition;
}

/**
 * Determine if weather could affect train operations
 */
export function assessWeatherImpact(weather: WeatherData): {
  severity: 'none' | 'low' | 'medium' | 'high';
  affects: string[];
  reason: string;
} {
  const impacts: string[] = [];
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';

  // Heavy rain
  if (weather.precipitation > 25) {
    impacts.push('visibility');
    impacts.push('braking');
    severity = 'high';
  } else if (weather.precipitation > 10) {
    impacts.push('visibility');
    severity = 'medium';
  }

  // Strong wind
  if (weather.wind_speed > 15) {
    impacts.push('stability');
    impacts.push('speed');
    severity = severity === 'none' ? 'medium' : severity;
  }

  // Thunderstorm
  if (weather.condition === 'Thunderstorm') {
    impacts.push('electrical');
    impacts.push('signal');
    severity = 'high';
  }

  // Snow/low visibility
  if (weather.visibility < 500) {
    impacts.push('visibility');
    severity = severity === 'none' ? 'low' : severity;
  }

  // Extreme heat
  if (weather.temperature > 45) {
    impacts.push('rails');
    impacts.push('infrastructure');
  }

  // Extreme cold
  if (weather.temperature < -10) {
    impacts.push('switches');
    impacts.push('brakes');
  }

  const reason =
    severity === 'high'
      ? `Hazardous conditions: ${impacts.join(', ')}`
      : severity === 'medium'
        ? `Weather may affect: ${impacts.join(', ')}`
        : severity === 'low'
          ? 'Minor weather impact'
          : 'No significant weather impact';

  return {
    severity,
    affects: impacts,
    reason,
  };
}

/**
 * Check if weather conditions are hazardous
 */
export function isHazardousWeather(weather: WeatherData): boolean {
  return (
    weather.precipitation > 15 ||
    weather.wind_speed > 12 ||
    weather.condition === 'Thunderstorm' ||
    weather.visibility < 1000 ||
    weather.temperature > 45 ||
    weather.temperature < -5
  );
}

/**
 * Get weather for entire route (list of waypoints)
 */
export async function getWeatherForRoute(waypoints: Array<{ lat: number; lng: number }>) {
  const weatherData = await Promise.all(
    waypoints.map((point) => getWeatherAtLocation(point.lat, point.lng))
  );
  return weatherData.filter((w) => w !== null);
}

/**
 * Export singleton service object for class-based imports
 */
export const weatherService = {
  getWeatherAtLocation,
  getWeatherForRoute,
  assessWeatherImpact,
  isHazardousWeather,
  clearWeatherCache,
};

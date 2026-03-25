/**
 * Weather Integration Service
 * Fetches real weather data from OpenWeatherMap API
 * Used to calculate weather impact on train delays and halt reasons
 */

export interface WeatherData {
  stationCode: string;
  temperature: number; // Celsius
  humidity: number; // 0-100%
  windSpeed: number; // km/h
  precipitation: number; // mm
  visibility: number; // km
  condition: 'clear' | 'cloudy' | 'rainy' | 'foggy' | 'stormy';
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

interface OpenWeatherResponse {
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  clouds: {
    all: number;
  };
  rain?: {
    '1h': number;
  };
  visibility: number;
  weather: Array<{
    main: string;
    description: string;
  }>;
}

class WeatherIntegration {
  private API_KEY = process.env.OPENWEATHER_API_KEY || 'demo';
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  // Station code to coordinates mapping
  private stationCoordinates: Record<string, { lat: number; lon: number }> = {
    SC: { lat: 17.3667, lon: 78.467 }, // Secunderabad
    HYB: { lat: 17.3714, lon: 78.4729 }, // Hyderabad
    NG: { lat: 21.1458, lon: 79.0882 }, // Nagpur
    MMCT: { lat: 18.9676, lon: 72.8194 }, // Mumbai
    NDLS: { lat: 28.5431, lon: 77.2506 }, // New Delhi
    BZA: { lat: 16.2159, lon: 80.6313 }, // Vijayawada
    SBC: { lat: 12.9716, lon: 77.5946 }, // Bangalore
    KZJ: { lat: 17.6869, lon: 78.6298 }, // Kazipet
    JBP: { lat: 23.1815, lon: 79.9864 }, // Jabalpur
    HWH: { lat: 22.5726, lon: 88.3639 }, // Howrah
    GHY: { lat: 26.1445, lon: 91.7362 }, // Guwahati
  };

  /**
   * Get weather for a station
   */
  async getWeather(stationCode: string): Promise<WeatherData | null> {
    // Check cache
    const cached = this.cache.get(stationCode);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const coords = this.stationCoordinates[stationCode];
      if (!coords) {
        console.warn(`[Weather] No coordinates for station ${stationCode}`);
        return null;
      }

      const weather = await this.fetchFromOpenWeather(coords.lat, coords.lon);
      if (weather) {
        this.cache.set(stationCode, { data: weather, timestamp: Date.now() });
      }
      return weather;
    } catch (error) {
      console.error('[Weather] Fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch from OpenWeatherMap API
   */
  private async fetchFromOpenWeather(
    latitude: number,
    longitude: number
  ): Promise<WeatherData | null> {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${this.API_KEY}&units=metric`;

      const response = await fetch(url, { timeout: 5000 } as any);
      if (!response.ok) {
        console.warn('[Weather] API returned', response.status);
        return null;
      }

      const data: OpenWeatherResponse = await response.json();

      return {
        stationCode: 'UNKNOWN',
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
        precipitation: data.rain?.['1h'] || 0,
        visibility: Math.round(data.visibility / 1000), // meters to km
        condition: this.parseCondition(data.weather[0].main),
        severity: this.calculateSeverity(data),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[Weather] OpenWeather fetch failed:', error);
      return null;
    }
  }

  /**
   * Parse weather condition
   */
  private parseCondition(condition: string): 'clear' | 'cloudy' | 'rainy' | 'foggy' | 'stormy' {
    const lower = condition.toLowerCase();
    if (lower.includes('rain')) return 'rainy';
    if (lower.includes('fog') || lower.includes('mist')) return 'foggy';
    if (lower.includes('thunder') || lower.includes('storm')) return 'stormy';
    if (lower.includes('cloud')) return 'cloudy';
    return 'clear';
  }

  /**
   * Calculate weather severity
   */
  private calculateSeverity(data: OpenWeatherResponse): 'low' | 'medium' | 'high' {
    let score = 0;

    // Precipitation
    if (data.rain?.['1h']) {
      score += data.rain['1h'] > 10 ? 3 : 2;
    }

    // Wind
    if (data.wind.speed > 15) score += 2;

    // Visibility
    if (data.visibility < 1000) score += 2;

    // Cloud coverage
    if (data.clouds.all > 80) score += 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Get weather impact on train delays
   */
  getWeatherImpactDelay(weather: WeatherData | null): number {
    if (!weather) return 0;

    let delay = 0;

    // Heavy rain: +5-10min
    if (weather.precipitation > 10) {
      delay += Math.min(weather.precipitation, 50) / 5; // Max 10min
    }

    // Low visibility (fog): +3-8min
    if (weather.visibility < 1) {
      delay += 8;
    } else if (weather.visibility < 2) {
      delay += 5;
    }

    // High wind: +2-4min
    if (weather.windSpeed > 50) {
      delay += 4;
    } else if (weather.windSpeed > 30) {
      delay += 2;
    }

    return Math.round(delay);
  }

  /**
   * Check if weather is hazardous for trains
   */
  isHazardousWeather(weather: WeatherData | null): boolean {
    if (!weather) return false;
    return weather.severity === 'high' && weather.precipitation > 20;
  }

  /**
   * Generate weather description for users
   */
  getWeatherDescription(weather: WeatherData | null): string {
    if (!weather) return 'Weather data unavailable';

    const parts = [
      `${weather.temperature}°C`,
      `${weather.condition}`,
      `Wind: ${weather.windSpeed}km/h`,
    ];

    if (weather.precipitation > 0) {
      parts.push(`Rain: ${weather.precipitation}mm`);
    }

    return parts.join(' • ');
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

const weatherIntegration = new WeatherIntegration();
export default weatherIntegration;

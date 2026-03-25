/**
 * API Route: /api/weather
 * PHASE 8: Weather data endpoints
 * Provides real-time weather for locations and train routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherService } from '@/services/weatherService';
import { buildApiResponse } from '@/services/apiResponseWrapper';

export async function GET(request: NextRequest) {
  try {
    const lat = request.nextUrl.searchParams.get('lat');
    const lng = request.nextUrl.searchParams.get('lng');
    const type = request.nextUrl.searchParams.get('type'); // 'location' or 'impact'
    const trainNumber = request.nextUrl.searchParams.get('trainNumber');

    // Get weather for a specific location
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          buildApiResponse(
            null,
            { sources: [] },
            false,
            'Invalid latitude or longitude'
          ),
          { status: 400 }
        );
      }

      const weather = await weatherService.getWeatherAtLocation(latitude, longitude);

      if (!weather) {
        return NextResponse.json(
          buildApiResponse(
            null,
            {
              overall: 0,
              location: 50,
              delay: 0,
              halt: 0,
              crowdLevel: 0,
              sources: [{ name: 'openweathermap', qualityScore: 0, lastUpdated: Date.now(), isCached: false, cacheTTLSeconds: 0 }],
            },
            false,
            'Failed to fetch weather data for this location'
          ),
          { status: 503 }
        );
      }

      if (type === 'impact' && trainNumber) {
        // Calculate impact on train
        const impact = weatherService.assessWeatherImpact(weather);
        return NextResponse.json(
          buildApiResponse(
            {
              location: {
                lat: latitude,
                lng: longitude,
              },
              weather,
              impact,
              isHazardous: weatherService.isHazardousWeather(weather),
              trainNumber,
            },
            {
              overall: 85,
              location: 95,
              delay: 75,
              halt: 70,
              crowdLevel: 60,
              sources: [
                {
                  name: 'openweathermap',
                  qualityScore: 95,
                  lastUpdated: weather.timestamp,
                  isCached: true,
                  cacheTTLSeconds: 600,
                },
              ],
            },
            true
          ),
          {
            headers: {
              'Cache-Control': 'public, max-age=600', // 10 minutes
            },
          }
        );
      }

      return NextResponse.json(
        buildApiResponse(
          {
            location: {
              lat: latitude,
              lng: longitude,
            },
            weather,
          },
          {
            overall: 80,
            location: 95,
            delay: 0,
            halt: 0,
            crowdLevel: 0,
            sources: [
              {
                name: 'openweathermap',
                qualityScore: 95,
                lastUpdated: weather.timestamp,
                isCached: true,
                cacheTTLSeconds: 600,
              },
            ],
          },
          true
        ),
        {
          headers: {
            'Cache-Control': 'public, max-age=600', // 10 minutes
          },
        }
      );
    }

    return NextResponse.json(
      buildApiResponse(
        null,
        {
          overall: 0,
          location: 0,
          delay: 0,
          halt: 0,
          crowdLevel: 0,
          sources: [],
        },
        false,
        'Missing required parameters: lat, lng'
      ),
      { status: 400 }
    );
  } catch (error) {
    console.error('[weather API] Error:', error);
    return NextResponse.json(
      buildApiResponse(
        null,
        {
          overall: 0,
          location: 0,
          delay: 0,
          halt: 0,
          crowdLevel: 0,
          sources: [],
        },
        false,
        'Failed to fetch weather data'
      ),
      { status: 500 }
    );
  }
}

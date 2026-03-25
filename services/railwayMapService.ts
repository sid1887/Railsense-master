/**
 * OpenRailwayMap Service
 * Gets railway infrastructure and verifies train locations
 */

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 5000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

interface RailwaySection {
  isSingleTrack: boolean;
  nextJunction: string | null;
  signalDistance: number;
  maxSpeed: number;
}

/**
 * Check if coordinates are on actual railway track
 * Using OpenRailwayMap tiles and data
 */
export async function verifyTrainOnTrack(
  latitude: number,
  longitude: number,
  tolerance: number = 0.01 // ~1km
): Promise<boolean> {
  try {
    // Query OpenRailwayMap for track presence
    // Using Overpass API for railway data
    const query = `
      [bbox:${latitude - tolerance},${longitude - tolerance},${latitude + tolerance},${longitude + tolerance}];
      (
        way["railway"~"rail|light_rail|narrow_gauge|monorail"];
      );
      out geom;
    `;

    const response = await fetchWithTimeout(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 5000,
      }
    );

    if (response.ok) {
      const data = await response.json();
      // If ways exist, train is on track
      return (data.elements && data.elements.length > 0) || false;
    }

    return true; // Assume on track if can't verify
  } catch (err) {
    console.warn('[OpenRailwayMap] Verification failed, assuming on track');
    return true; // Fallback to true
  }
}

/**
 * Get railway section info (single/double track, speed limits)
 */
export async function getSectionInfo(
  latitude: number,
  longitude: number
): Promise<RailwaySection> {
  try {
    // Query for maxspeed and track info
    const query = `
      [bbox:${latitude - 0.01},${longitude - 0.01},${latitude + 0.01},${longitude + 0.01}];
      (
        way["railway"="rail"]["maxspeed"];
        way["railway"="rail"]["lanes"];
      );
      out tags;
    `;

    const response = await fetchWithTimeout(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        timeout: 5000,
      }
    );

    if (response.ok) {
      const data = await response.json();
      const ways = data.elements || [];

      // Parse section info
      let isSingleTrack = true;
      let maxSpeed = 120; // Default Indian railway speed

      if (ways.length > 0) {
        const way = ways[0].tags || {};
        if (way.lanes === '2' || way.lanes === '4') {
          isSingleTrack = false;
        }
        if (way.maxspeed) {
          maxSpeed = parseInt(way.maxspeed);
        }
      }

      return {
        isSingleTrack,
        nextJunction: null,
        signalDistance: 0,
        maxSpeed,
      };
    }

    return {
      isSingleTrack: false,
      nextJunction: null,
      signalDistance: 0,
      maxSpeed: 120,
    };
  } catch (err) {
    console.warn('[OpenRailwayMap] Section info fetch failed');
    return {
      isSingleTrack: false,
      nextJunction: null,
      signalDistance: 0,
      maxSpeed: 120,
    };
  }
}

/**
 * Get nearby stations from OpenRailwayMap
 */
export async function getNearbyStations(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<Array<{ name: string; lat: number; lng: number }>> {
  try {
    const radiusDegrees = radiusKm / 111; // 1 degree ~ 111km

    const query = `
      [bbox:${latitude - radiusDegrees},${longitude - radiusDegrees},${latitude + radiusDegrees},${longitude + radiusDegrees}];
      (
        node["railway"="station"];
        node["railway"="halt"];
      );
      out;
    `;

    const response = await fetchWithTimeout(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        timeout: 5000,
      }
    );

    if (response.ok) {
      const data = await response.json();
      return (
        data.elements?.map((el: any) => ({
          name: el.tags?.name || 'Unknown',
          lat: el.lat,
          lng: el.lon,
        })) || []
      );
    }

    return [];
  } catch (err) {
    console.warn('[OpenRailwayMap] Station fetch failed');
    return [];
  }
}

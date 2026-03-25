/**
 * Map Track Snapping Service
 * Snaps train coordinates to actual railway tracks
 * Improves map accuracy by ensuring trains appear on track polygons
 */

export interface TrackSegment {
  id: string;
  name: string;
  startStation: { code: string; name: string };
  endStation: { code: string; name: string };
  coordinates: Array<{ latitude: number; longitude: number }>;
  section: string;
}

export interface SnappedPosition {
  original: { latitude: number; longitude: number };
  snapped: { latitude: number; longitude: number };
  distance: number; // km from original to snapped position
  trackSegment: TrackSegment;
}

class MapTrackSnapping {
  // Track database with major Indian Railways routes
  // In production, this would load from OpenRailwayMap or Indian Railways GIS database
  private tracks: Map<string, TrackSegment> = new Map([
    // Northern Routes
    ['TRK_001', {
      id: 'TRK_001',
      name: 'Delhi-Howrah Main Line',
      startStation: { code: 'NDLS', name: 'New Delhi' },
      endStation: { code: 'HWH', name: 'Howrah' },
      coordinates: [
        { latitude: 28.5431, longitude: 77.2506 }, // Delhi
        { latitude: 28.2090, longitude: 79.0245 }, // Kanpur
        { latitude: 25.4358, longitude: 81.8463 }, // Allahabad
        { latitude: 24.7555, longitude: 84.8988 }, // Dmoh
        { latitude: 23.1815, longitude: 86.4304 }, // Ranchi
        { latitude: 22.5726, longitude: 88.3639 }, // Howrah
      ],
      section: 'North Central Railway',
    }],
    ['TRK_002', {
      id: 'TRK_002',
      name: 'Delhi-Amritsar Main Line',
      startStation: { code: 'NDLS', name: 'New Delhi' },
      endStation: { code: 'ASR', name: 'Amritsar' },
      coordinates: [
        { latitude: 28.5431, longitude: 77.2506 }, // Delhi
        { latitude: 30.8778, longitude: 75.8500 }, // Ambala
        { latitude: 31.6340, longitude: 74.8711 }, // Jalandhar
        { latitude: 31.6340, longitude: 74.8711 }, // Amritsar
      ],
      section: 'Northern Railway',
    }],
    // Central Routes
    ['TRK_003', {
      id: 'TRK_003',
      name: 'Mumbai-Nagpur Main Line',
      startStation: { code: 'MMCT', name: 'Mumbai Central' },
      endStation: { code: 'NG', name: 'Nagpur Junction' },
      coordinates: [
        { latitude: 18.9676, longitude: 72.8194 }, // Mumbai
        { latitude: 19.7515, longitude: 75.6313 }, // Aurangabad
        { latitude: 20.9124, longitude: 77.9777 }, // Bhopal area
        { latitude: 21.1458, longitude: 79.0882 }, // Nagpur
      ],
      section: 'Central Railway',
    }],
    // Southern Routes
    ['TRK_004', {
      id: 'TRK_004',
      name: 'Chennai-Bangalore Main Line',
      startStation: { code: 'MAS', name: 'Chennai Central' },
      endStation: { code: 'SBC', name: 'Bangalore City' },
      coordinates: [
        { latitude: 13.0827, longitude: 80.2707 }, // Chennai
        { latitude: 12.9716, longitude: 77.5946 }, // Bangalore
      ],
      section: 'Southern Railway',
    }],
    ['TRK_005', {
      id: 'TRK_005',
      name: 'Hyderabad-Bangalore Main Line',
      startStation: { code: 'SC', name: 'Secunderabad' },
      endStation: { code: 'SBC', name: 'Bangalore City' },
      coordinates: [
        { latitude: 17.3667, longitude: 78.467 }, // Secunderabad
        { latitude: 16.5000, longitude: 78.5000 },
        { latitude: 14.3000, longitude: 77.7000 },
        { latitude: 12.9716, longitude: 77.5946 }, // Bangalore
      ],
      section: 'South Central Railway',
    }],
    // Eastern Routes
    ['TRK_006', {
      id: 'TRK_006',
      name: 'Howrah-Guwahati Main Line',
      startStation: { code: 'HWH', name: 'Howrah' },
      endStation: { code: 'GHY', name: 'Guwahati' },
      coordinates: [
        { latitude: 22.5726, longitude: 88.3639 }, // Howrah
        { latitude: 23.6978, longitude: 88.3185 }, // Barddhaman
        { latitude: 25.2700, longitude: 88.3684 }, // Malda Town
        { latitude: 26.1445, longitude: 91.7362 }, // Guwahati
      ],
      section: 'North East Frontier Railway',
    }],
    // Western Routes
    ['TRK_007', {
      id: 'TRK_007',
      name: 'Mumbai-Goa Main Line',
      startStation: { code: 'MMCT', name: 'Mumbai Central' },
      endStation: { code: 'MAO', name: 'Madgaon' },
      coordinates: [
        { latitude: 18.9676, longitude: 72.8194 }, // Mumbai
        { latitude: 18.5204, longitude: 73.8567 }, // Ratnagiri
        { latitude: 15.4909, longitude: 73.8278 }, // Goa
      ],
      section: 'South Central Railway',
    }],
    // South-North corridor
    ['TRK_008', {
      id: 'TRK_008',
      name: 'Chennai-Delhi Main Line',
      startStation: { code: 'MAS', name: 'Chennai Central' },
      endStation: { code: 'NDLS', name: 'New Delhi' },
      coordinates: [
        { latitude: 13.0827, longitude: 80.2707 }, // Chennai
        { latitude: 15.4909, longitude: 78.5744 }, // Nellore
        { latitude: 17.3667, longitude: 78.467 }, // Secunderabad
        { latitude: 20.5937, longitude: 78.9629 }, // Bhopal
        { latitude: 28.5431, longitude: 77.2506 }, // Delhi
      ],
      section: 'South Central Railway',
    }],
  ]);

  /**
   * Snap train position to nearest track
   */
  snapToNearestTrack(latitude: number, longitude: number): SnappedPosition | null {
    let closestTrack: TrackSegment | null = null;
    let closestDistance = Infinity;
    let closestPoint = { latitude, longitude };

    // Find nearest track
    for (const track of this.tracks.values()) {
      for (let i = 0; i < track.coordinates.length - 1; i++) {
        const segmentStart = track.coordinates[i];
        const segmentEnd = track.coordinates[i + 1];

        const snappedPoint = this.projectPointOntoSegment(
          latitude,
          longitude,
          segmentStart.latitude,
          segmentStart.longitude,
          segmentEnd.latitude,
          segmentEnd.longitude
        );

        const distance = this.calculateDistance(
          latitude,
          longitude,
          snappedPoint.latitude,
          snappedPoint.longitude
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestTrack = track;
          closestPoint = snappedPoint;
        }
      }
    }

    if (!closestTrack) return null;

    // Only snap if within 2km of track
    if (closestDistance > 2) return null;

    return {
      original: { latitude, longitude },
      snapped: closestPoint,
      distance: closestDistance,
      trackSegment: closestTrack,
    };
  }

  /**
   * Project point onto line segment
   */
  private projectPointOntoSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): { latitude: number; longitude: number } {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return { latitude: x1, longitude: y1 };

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return { latitude: projX, longitude: projY };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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
   * Get all track segments for map display
   */
  getAllTracks(): TrackSegment[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Get tracks for a route
   */
  getTracksForRoute(stationCodeStart: string, stationCodeEnd: string): TrackSegment[] {
    return Array.from(this.tracks.values()).filter(
      track =>
        (track.startStation.code === stationCodeStart &&
          track.endStation.code === stationCodeEnd) ||
        (track.startStation.code === stationCodeEnd &&
          track.endStation.code === stationCodeStart)
    );
  }

  /**
   * Get track by segment ID
   */
  getTrackById(trackId: string): TrackSegment | null {
    return this.tracks.get(trackId) || null;
  }

  /**
   * Add new track (for updates)
   */
  addTrack(track: TrackSegment): void {
    this.tracks.set(track.id, track);
  }

  /**
   * Get the nearest track segment for a coordinate
   * More detailed than snapToNearestTrack - returns segment info
   */
  getNearestTrackSegment(latitude: number, longitude: number): {
    track: TrackSegment;
    segmentIndex: number;
    distance: number;
  } | null {
    let closestSegment = null;
    let closestDistance = Infinity;
    let closestIndex = -1;

    for (const track of this.tracks.values()) {
      for (let i = 0; i < track.coordinates.length - 1; i++) {
        const segmentStart = track.coordinates[i];
        const segmentEnd = track.coordinates[i + 1];

        const snappedPoint = this.projectPointOntoSegment(
          latitude,
          longitude,
          segmentStart.latitude,
          segmentStart.longitude,
          segmentEnd.latitude,
          segmentEnd.longitude
        );

        const distance = this.calculateDistance(
          latitude,
          longitude,
          snappedPoint.latitude,
          snappedPoint.longitude
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestSegment = track;
          closestIndex = i;
        }
      }
    }

    if (!closestSegment) return null;

    return {
      track: closestSegment,
      segmentIndex: closestIndex,
      distance: closestDistance,
    };
  }

  /**
   * Snap an entire route/path of coordinates to the track network
   * Useful for visualizing train route on map
   */
  snapRoute(coordinates: Array<{ latitude: number; longitude: number }>): {
    original: Array<{ latitude: number; longitude: number }>;
    snapped: Array<{ latitude: number; longitude: number }>;
    totalDistance: number;
    successRate: number;
  } {
    const snapped: Array<{ latitude: number; longitude: number }> = [];
    let successCount = 0;
    let totalDistance = 0;

    for (const coord of coordinates) {
      const snappedPos = this.snapToNearestTrack(coord.latitude, coord.longitude);
      if (snappedPos) {
        snapped.push(snappedPos.snapped);
        successCount++;
        totalDistance += snappedPos.distance;
      } else {
        snapped.push(coord); // Keep original if snapping fails
      }
    }

    return {
      original: coordinates,
      snapped,
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      successRate: coordinates.length > 0 ? successCount / coordinates.length : 0,
    };
  }

  /**
   * Get all section codes in the network
   */
  getAllSections(): string[] {
    const sections = new Set<string>();
    for (const track of this.tracks.values()) {
      sections.add(track.section);
    }
    return Array.from(sections).sort();
  }

  /**
   * Get tracks for a specific section/zone
   */
  getTracksForSection(section: string): TrackSegment[] {
    return Array.from(this.tracks.values()).filter(
      track => track.section === section
    );
  }

  /**
   * Calculate distance between two coordinates
   * Public version of private method for external use
   */
  public distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return this.calculateDistance(lat1, lon1, lat2, lon2);
  }

  /**
   * Get track coverage summary for stats
   */
  getNetworkSummary(): {
    totalTracks: number;
    totalSections: number;
    sections: string[];
    tracksBySection: Record<string, number>;
  } {
    const sections = this.getAllSections();
    const tracksBySection: Record<string, number> = {};

    for (const section of sections) {
      tracksBySection[section] = this.getTracksForSection(section).length;
    }

    return {
      totalTracks: this.tracks.size,
      totalSections: sections.length,
      sections,
      tracksBySection,
    };
  }
}

const mapTrackSnapping = new MapTrackSnapping();
export default mapTrackSnapping;

/**
 * Railway Database Population Script
 * Fetches real timetable data from Indian Railways and populates the catalog
 *
 * Usage: npx ts-node scripts/populateRailwayDatabase.ts
 */

import { getTimetableDataset } from '@/services/timetableScraper';
import { initializeRealTrainsCatalog } from '@/services/realTrainsCatalog';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'railway-database.json');

interface DatabaseSchema {
  trains: TrainRecord[];
  stations: StationRecord[];
  trainRoutes: TrainRouteRecord[];
  metadata: {
    totalTrains: number;
    totalStations: number;
    totalRouteStops: number;
    fetchedAt: string;
    sourceURL: string;
  };
}

interface TrainRecord {
  id: string;
  trainNumber: string;
  trainName: string;
  sourceStation: string;
  destinationStation: string;
  type: string;
  status: string;
}

interface StationRecord {
  id: string;
  stationCode: string;
  stationName: string;
}

interface TrainRouteRecord {
  id: string;
  trainNumber: string;
  stationName: string;
  stationCode: string;
  arrivalTime: string;
  departureTime: string;
  distance: number;
  sequenceNumber: number;
}

async function populateDatabase() {
  console.log('🚂 Starting Railway Database Population...\n');

  try {
    // Fetch real timetable data
    console.log('📍 Fetching timetable data from Indian Railways...');
    const dataset = await getTimetableDataset();
    console.log(`✓ Fetched ${Object.keys(dataset.trains).length} trains\n`);

    // Initialize catalog
    console.log('🔄 Initializing real trains catalog...');
    await initializeRealTrainsCatalog();
    console.log('✓ Catalog initialized\n');

    // Transform data into database schema
    console.log('🔧 Transforming data to database schema...');
    const trains: TrainRecord[] = [];
    const stationsMap = new Set<string>();
    const trainRoutes: TrainRouteRecord[] = [];

    let routeId = 1;

    for (const [trainNumber, train] of Object.entries(dataset.trains)) {
      // Add train record
      trains.push({
        id: trainNumber,
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        sourceStation: train.source,
        destinationStation: train.destination,
        type: 'Express',
        status: 'Active'
      });

      // Add stations to map
      for (const stop of train.route) {
        stationsMap.add(stop.station);
      }

      // Add route stops
      train.route.forEach((stop, idx) => {
        trainRoutes.push({
          id: `${trainNumber}-${idx}`,
          trainNumber: train.trainNumber,
          stationName: stop.station,
          stationCode: stop.station.split('(')[1]?.replace(')', '') || '',
          arrivalTime: stop.arrival,
          departureTime: stop.departure,
          distance: idx * 100, // Placeholder
          sequenceNumber: idx
        });
      });
    }

    // Create station records
    const stations: StationRecord[] = Array.from(stationsMap)
      .sort()
      .map((stationName) => ({
        id: stationName.replace(/\s+/g, '_').toLowerCase(),
        stationCode: stationName.split('(')[1]?.replace(')', '') || '',
        stationName
      }));

    // Build database schema
    const database: DatabaseSchema = {
      trains,
      stations,
      trainRoutes,
      metadata: {
        totalTrains: trains.length,
        totalStations: stations.length,
        totalRouteStops: trainRoutes.length,
        fetchedAt: new Date().toISOString(),
        sourceURL: 'https://indianrailways.gov.in/railwayboard/view_section.jsp'
      }
    };

    console.log(`✓ Data transformation complete`);
    console.log(`  - ${trains.length} trains`);
    console.log(`  - ${stations.length} unique stations`);
    console.log(`  - ${trainRoutes.length} route stops\n`);

    // Create data directory
    await mkdir(path.dirname(DATA_FILE), { recursive: true });

    // Save to file
    console.log(`💾 Saving database to ${DATA_FILE}...`);
    await writeFile(DATA_FILE, JSON.stringify(database, null, 2));
    console.log('✓ Database saved successfully\n');

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Railway Database Population Complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n✓ Total trains populated: ${trains.length}`);
    console.log(`✓ Total stations indexed: ${stations.length}`);
    console.log(`✓ Total route stops: ${trainRoutes.length}`);
    console.log(`✓ Database saved to: ${DATA_FILE}`);
    console.log(`✓ Last updated: ${database.metadata.fetchedAt}`);
    console.log('\nAvailable APIs:');
    console.log('  - GET /api/train/:trainNumber');
    console.log('  - GET /api/train/:trainNumber/route');
    console.log('  - GET /api/stations\n');

  } catch (error) {
    console.error('❌ Error populating database:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  populateDatabase().catch(() => process.exit(1));
}

export { populateDatabase };
export type { DatabaseSchema };

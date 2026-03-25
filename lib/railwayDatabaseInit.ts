/**
 * Railway Data Initialization
 * Loads real timetable data from scraper on application startup
 */

import { initializeRealTrainsCatalog, getCatalogSize } from '@/services/realTrainsCatalog';

let isInitialized = false;

/**
 * Initialize the railway database with real data
 * This should be called once on app startup
 */
export async function initializeRailwayDatabase() {
  if (isInitialized) {
    console.log(`ℹ️  Railway database already initialized (${getCatalogSize()} trains loaded)`);
    return true;
  }

  try {
    console.log('🚂 Initializing Railway Database...');
    const success = await initializeRealTrainsCatalog();

    if (success) {
      isInitialized = true;
      console.log(`✅ Railway Database initialized with ${getCatalogSize()} trains`);
      return true;
    } else {
      console.warn('⚠️  Railway Database initialization failed - proceeding with empty catalog');
      return false;
    }
  } catch (error) {
    console.error('❌ Railway Database initialization error:', error);
    return false;
  }
}

/**
 * Check if database is initialized
 */
export function isRailwayDatabaseInitialized(): boolean {
  return isInitialized;
}

/**
 * Get current catalog size
 */
export function getRailwayDatabaseSize(): number {
  return getCatalogSize();
}

export default initializeRailwayDatabase;

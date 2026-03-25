/**
 * Background Railway Crawler
 *
 * Automatically builds the train database by:
 * 1. Maintaining a list of known train numbers
 * 2. Periodically fetching trains not yet in database
 * 3. Storing results to database
 * 4. Running slowly to avoid overload
 *
 * Start with: startBackgroundCrawler()
 * Stop with: stopBackgroundCrawler()
 */

import { searchTrain, getAllTrainsInDatabase } from '@/services/trainSearchOrchestrator';

// Known Indian Railways train numbers to crawl
// This is a comprehensive list of major trains across India
const KNOWN_TRAINS = [
  // Rajdhani Express trains
  '12302', '12304', '12308', '12314', '12316', '12318', '12320', '12322',
  '12324', '12326', '12328', '12330', '12334', '12336', '12338', '12340',

  // Shatabdi Express trains
  '12001', '12003', '12005', '12007', '12009', '12011', '12013', '12015',
  '12017', '12019', '12021', '12023', '12025', '12027', '12029', '12031',

  // Major Express trains
  '11001', '11003', '11005', '11015', '11017', '11019', '11021', '11027',
  '11043', '11045', '11047', '11049', '11051', '11053', '11055', '11057',

  // South Indian trains
  '12621', '12622', '12623', '12624', '12625', '12626', '12627', '12628',
  '12629', '12630', '12631', '12632', '12633', '12634', '12635', '12636',

  // Special trains
  '12955', '12956', '12957', '12958', '12959', '12960', '12961', '12962',
  '12963', '12964', '12965', '12966', '12967', '12968', '12969', '12970',

  // Express trains
  '13005', '13007', '13009', '13011', '13013', '13015', '13017', '13019',
  '13021', '13023', '13025', '13027', '13029', '13031', '13033', '13035',

  // More variety
  '14005', '14007', '14009', '14011', '14013', '14015', '14017', '14019',
  '14021', '14023', '14025', '14645', '14647', '14649', '14651', '14653',

  // Fast trains
  '15001', '15003', '15005', '15007', '15009', '15011', '15013', '15015',
  '15645', '15647', '15649', '15651', '15905', '15906', '15907', '15908',

  // Premium trains
  '16001', '16003', '16005', '16007', '16009', '16011', '16013', '16015',
  '16093', '16095', '16504', '16506', '16587', '16589', '16731', '16733',

  // DMU/Intercity trains
  '17001', '17003', '17005', '17007', '17009', '17011', '17310', '17312',
  '17314', '17316', '17318', '17320', '17322', '17324', '17326', '17328',

  // Additional coverage
  '18001', '18003', '18005', '18007', '18009', '18011', '18111', '18113',
  '18115', '18117', '18119', '18121', '18123', '18125', '18127', '18129',

  '19001', '19003', '19005', '19007', '19009', '19011', '19013', '19015',

  '20001', '20003', '20005', '20007', '20009', '20011', '20059', '20061',
  '20063', '20065', '20067', '20069', '20071', '20073', '20075', '20077',

  '22101', '22103', '22105', '22107', '22109', '22111', '22113', '22115',
];

interface CrawlerConfig {
  enabled: boolean;
  running: boolean;
  trainsPerInterval: number; // How many trains to fetch per interval
  intervalMs: number; // How often to run (in milliseconds)
  lastRun?: Date;
  processed: number;
  failed: number;
  crawledTrains: Set<string>;
}

const config: CrawlerConfig = {
  enabled: false,
  running: false,
  trainsPerInterval: 5, // Fetch 5 trains every interval
  intervalMs: 30 * 1000, // Every 30 seconds
  processed: 0,
  failed: 0,
  crawledTrains: new Set(),
};

let crawlerInterval: NodeJS.Timeout | null = null;

/**
 * Start the background crawler
 */
export function startBackgroundCrawler(
  trainsPerInterval = 5,
  intervalMs = 30 * 1000
) {
  if (config.running) {
    console.warn('[Crawler] Already running');
    return;
  }

  config.enabled = true;
  config.running = true;
  config.trainsPerInterval = trainsPerInterval;
  config.intervalMs = intervalMs;

  console.log('[Crawler] Starting background railway crawler');
  console.log(`[Crawler] Fetching ${trainsPerInterval} trains every ${intervalMs}ms`);
  console.log(`[Crawler] Total trains to crawl: ${KNOWN_TRAINS.length}`);

  // Run immediately, then periodically
  crawlBatch();

  crawlerInterval = setInterval(crawlBatch, intervalMs);
}

/**
 * Stop the background crawler
 */
export function stopBackgroundCrawler() {
  if (crawlerInterval) {
    clearInterval(crawlerInterval);
    crawlerInterval = null;
  }

  config.running = false;
  console.log('[Crawler] Stopped');
  console.log(`[Crawler] Stats: ${config.processed} processed, ${config.failed} failed`);
}

/**
 * Get crawler status
 */
export function getCrawlerStatus() {
  return {
    enabled: config.enabled,
    running: config.running,
    processed: config.processed,
    failed: config.failed,
    crawledTrains: Array.from(config.crawledTrains),
    remaining: KNOWN_TRAINS.filter((t) => !config.crawledTrains.has(t)).length,
    totalTrains: KNOWN_TRAINS.length,
    lastRun: config.lastRun,
  };
}

/**
 * Crawl a batch of trains
 */
async function crawlBatch() {
  if (!config.running) return;

  const remaining = KNOWN_TRAINS.filter((t) => !config.crawledTrains.has(t));
  if (remaining.length === 0) {
    console.log('[Crawler] All trains crawled! Restarting cycle...');
    config.crawledTrains.clear();
  }

  const batch = remaining.slice(0, config.trainsPerInterval);
  console.log(
    `[Crawler] Crawling batch of ${batch.length} trains (${remaining.length} remaining)`
  );

  for (const trainNumber of batch) {
    try {
      // Fetch train with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );

      await Promise.race([searchTrain(trainNumber), timeoutPromise]);

      config.crawledTrains.add(trainNumber);
      config.processed++;

      console.log(`[Crawler] ✓ Train ${trainNumber} crawled`);
    } catch (error: any) {
      config.failed++;
      config.crawledTrains.add(trainNumber); // Mark as attempted anyway
      console.log(`[Crawler] ✗ Train ${trainNumber} failed: ${error.message}`);
    }

    // Small delay between requests to avoid overwhelming the system
    await delay(500);
  }

  config.lastRun = new Date();

  // Log progress
  const progress = Math.round(
    (config.crawledTrains.size / KNOWN_TRAINS.length) * 100
  );
  console.log(
    `[Crawler] Progress: ${config.crawledTrains.size}/${KNOWN_TRAINS.length} (${progress}%)`
  );
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get list of uncrawled trains
 */
export function getUncrawledTrains() {
  return KNOWN_TRAINS.filter((t) => !config.crawledTrains.has(t));
}

/**
 * Force crawl a specific train
 */
export async function forceCrawlTrain(trainNumber: string) {
  try {
    const result = await searchTrain(trainNumber, true);
    config.crawledTrains.add(trainNumber);
    config.processed++;
    return result;
  } catch (error) {
    config.failed++;
    throw error;
  }
}

// Auto-start on module load (optional - can be controlled via API)
// Uncomment to enable auto-start
// startBackgroundCrawler(3, 60 * 1000); // 3 trains every minute

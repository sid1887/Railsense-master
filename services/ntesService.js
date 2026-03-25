// services/ntesService.js - Enhanced with retry logic, timeouts, and quality logging
// Fetches NTES running status using Playwright with robust error handling
// Exports: async function getTrainStatus(trainNumber) -> normalized object or null

const { chromium } = require('playwright');
const NodeCache = require('node-cache');
const snapshotDatabase = require('./snapshotDatabase').default || require('./snapshotDatabase');

const cache = new NodeCache({ stdTTL: 30 }); // 30s cache TTL
const MAX_RETRIES = 3;
const TIMEOUT_MS = 25000; // 25 second timeout per attempt

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry(fn, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 500; // 500ms, 1s, 2s
        console.log(`[NTES Retry] Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Scrape NTES with enhanced error handling and data quality tracking
 */
async function scrapeNTES(trainNumber) {
  const cacheKey = `ntes:${trainNumber}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log(`[NTES Cache] Hit for train ${trainNumber}`);
    // Log cache hit
    try {
      await snapshotDatabase.logDataQuality({
        trainNumber,
        provider: 'NTES',
        isSuccessful: true,
        dataQualityScore: cached.quality_score || 70,
        isSynthetic: false,
        cacheHit: true,
      });
    } catch (e) {
      // Silently fail on logging errors
    }
    return cached;
  }

  const startTime = Date.now();
  let browser = null;

  try {
    return await withRetry(async () => {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
      });

      const page = await browser.newPage();
      const timeoutHandle = setTimeout(() => {
        page.close().catch(() => {});
      }, TIMEOUT_MS);

      try {
        const url = `https://enquiry.indianrail.gov.in/mntes/`;
        console.log(`[NTES] Fetching train ${trainNumber}...`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Find and fill train number input
        const inputSelectors = [
          'input[name*="train"]',
          'input[placeholder*="train"]',
          'input[aria-label*="train"]',
          'input[id*="train"]',
          'input[class*="train"]',
        ];

        let inputFound = false;
        for (const selector of inputSelectors) {
          try {
            const inputs = await page.locator(selector).all();
            if (inputs.length > 0) {
              await inputs[0].fill(trainNumber);
              console.log(`[NTES] Filled train number in: ${selector}`);
              inputFound = true;
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }

        if (!inputFound) {
          throw new Error('Could not find train input field');
        }

        // Click search or press Enter
        try {
          await page.keyboard.press('Enter');
          console.log('[NTES] Pressed Enter');
        } catch (e) {
          const buttons = await page.locator('button').all();
          let clicked = false;
          for (const btn of buttons) {
            try {
              const btnText = await btn.innerText();
              if (btnText.toLowerCase().includes('search') || btnText.toLowerCase().includes('enquire')) {
                await btn.click();
                console.log('[NTES] Clicked search button');
                clicked = true;
                break;
              }
            } catch (e) {}
          }
          if (!clicked) {
            throw new Error('Could not trigger search');
          }
        }

        // Wait for results
        await page.waitForTimeout(3500);

        // Try to extract data
        const pageContent = await page.content();
        const scriptTexts = await page.$$eval('script', scripts =>
          scripts.map(s => s.textContent || '')
        );

        // Look for JSON in script tags
        for (const txt of scriptTexts) {
          if (!txt) continue;
          if (txt.includes('train') || txt.includes('delay') || txt.includes('status')) {
            const matches = txt.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
            if (matches) {
              for (const match of matches) {
                try {
                  const parsed = JSON.parse(match);
                  if (parsed && (parsed.train || parsed.train_number || parsed.train_no || parsed.trainNo)) {
                    const result = {
                      train_number: parsed.train_no || parsed.train || parsed.train_number || parsed.trainNo,
                      train_name: parsed.name || parsed.train_name || parsed.trainName || '',
                      delay_minutes: parsed.delay || parsed.delay_minutes || 0,
                      status: parsed.status || 'Unknown',
                      quality_score: 70, // NTES scraping considered moderate quality
                    };
                    cache.set(cacheKey, result);
                    clearTimeout(timeoutHandle);

                    // Log success
                    try {
                      await snapshotDatabase.logDataQuality({
                        trainNumber,
                        provider: 'NTES',
                        isSuccessful: true,
                        dataQualityScore: 70,
                        isSynthetic: false,
                        responseTime: Date.now() - startTime,
                      });
                    } catch (e) {}

                    console.log(`[NTES] Extracted: ${trainNumber}, delay=${result.delay_minutes}min`);
                    return result;
                  }
                } catch (e) {}
              }
            }
          }
        }

        // Fallback: extract from visible text
        const text = await page.innerText('body').catch(() => '');
        const delayMatch = text.match(/Delay[:\s]+(\d+)\s*min/i) || text.match(/延遲[:\s]+(\d+)/i);
        const delay = delayMatch ? parseInt(delayMatch[1], 10) : 0;

        let trainName = '';
        try {
          const tnEl = await page.locator(`text=${trainNumber}`).first();
          if (tnEl) {
            const parentText = await tnEl.evaluate(el => el.parentElement?.textContent || el.textContent);
            trainName = (parentText || '').replace(trainNumber, '').trim().split('\n')[0];
          }
        } catch (e) {}

        const result = {
          train_number: trainNumber,
          train_name: trainName || null,
          delay_minutes: delay,
          status: delay > 0 ? 'Delayed' : (delay === 0 ? 'On Time' : 'Running'),
          quality_score: 70,
        };

        cache.set(cacheKey, result);
        clearTimeout(timeoutHandle);

        // Log success
        try {
          await snapshotDatabase.logDataQuality({
            trainNumber,
            provider: 'NTES',
            isSuccessful: true,
            dataQualityScore: 70,
            isSynthetic: false,
            responseTime: Date.now() - startTime,
          });
        } catch (e) {}

        console.log(`[NTES] Scraped: ${trainNumber}, delay=${result.delay_minutes}min`);
        return result;

      } finally {
        clearTimeout(timeoutHandle);
        await page.close().catch(() => {});
      }
    });

  } catch (error) {
    console.warn(`[NTES] Failed after ${MAX_RETRIES} attempts:`, error.message);

    // Log failure
    try {
      await snapshotDatabase.logDataQuality({
        trainNumber,
        provider: 'NTES',
        isSuccessful: false,
        dataQualityScore: 0,
        isSynthetic: false,
        responseTime: Date.now() - startTime,
        errorMessage: error.message || 'Unknown error',
      });
    } catch (e) {}

    return null;

  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

module.exports = {
  getTrainStatus: scrapeNTES
};

const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Log all requests
  const apiRequests = [];
  const apiResponses = [];

  page.on('request', request => {
    const url = request.url();
    const method = request.method();
    const resourceType = request.resourceType();

    // Log all API/XHR/Fetch requests
    if (url.includes('api') || url.includes('search') || resourceType === 'xhr' || resourceType === 'fetch') {
      const reqData = {
        type: 'REQUEST',
        url,
        method,
        resourceType,
        timestamp: new Date().toISOString(),
        headers: request.headers()
      };
      apiRequests.push(reqData);
      console.log(`🔵 ${method} ${url}`);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    const status = response.status();

    if (url.includes('api') || url.includes('search') || response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
      try {
        const body = await response.text();
        const respData = {
          type: 'RESPONSE',
          url,
          statusCode: status,
          resourceType: response.request().resourceType(),
          timestamp: new Date().toISOString(),
          contentLength: body.length,
          preview: body.length > 200 ? body.substring(0, 200) : body
        };
        apiResponses.push(respData);

        // Check if response contains lat/lng/speed
        if (body.includes('lat') || body.includes('lng') || body.includes('speed') || body.includes('coordinate')) {
          console.log(`🟢 GPS DATA FOUND: ${status} ${url}`);
          console.log(`   Content: ${body.substring(0, 300)}`);
        } else {
          console.log(`🟢 ${status} ${url}`);
        }
      } catch (e) {
        console.log(`🟢 ${status} ${url} (body not readable)`);
      }
    }
  });

  try {
    console.log('🚀 Navigating to RailYatri...');
    await page.goto('https://www.railyatri.in/live-train-status', { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(3000);

    console.log('🔍 Finding search input...');
    const input = await page.locator('input[type="text"]').first();

    console.log('⌨️  Typing train number...');
    await input.fill('12728');
    await page.waitForTimeout(500);

    console.log('🔍 Clicking search button...');
    const searchBtn = page.locator('button').filter({ hasText: /Search|search|Submit|submit/ }).first();
    try {
      await searchBtn.click();
    } catch {
      console.log('⚠️  No obvious search button, pressing Enter...');
      await page.keyboard.press('Enter');
    }

    console.log('⏳ Waiting for results...');
    await page.waitForTimeout(3000);

    console.log('👆 Looking for train result to click...');
    // Find and click the first train result
    const trainResult = page.locator('div, a').filter({ hasText: /12728|Godavari/ }).first();
    const isVisible = await trainResult.isVisible().catch(() => false);

    if (isVisible) {
      console.log('🖱️  Clicking train result...');
      await trainResult.click();

      console.log('⏳ Waiting for train details page...');
      await page.waitForTimeout(5000);
    } else {
      console.log('⚠️  Train result not visible, checking page source...');
    }

    console.log('⏳ Final wait for all requests...');
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('❌ Error during navigation:', error.message);
  }

  // Save all logs
  console.log('\n📊 Saving logs...');

  // Save requests
  fs.writeFileSync('logs/gps_requests.txt', apiRequests.map(r => JSON.stringify(r)).join('\n'));
  console.log(`✅ Saved ${apiRequests.length} requests to logs/gps_requests.txt`);

  // Save responses
  fs.writeFileSync('logs/gps_responses.txt', apiResponses.map(r => JSON.stringify(r)).join('\n'));
  console.log(`✅ Saved ${apiResponses.length} responses to logs/gps_responses.txt`);

  // Find GPS data
  const gpsDataResponses = apiResponses.filter(r =>
    r.preview.includes('lat') || r.preview.includes('lng') || r.preview.includes('speed')
  );

  if (gpsDataResponses.length > 0) {
    console.log('\n🎯 GPS DATA ENDPOINTS FOUND:');
    gpsDataResponses.forEach(r => {
      console.log(`   ${r.url}`);
      console.log(`   Preview: ${r.preview}`);
    });
  } else {
    console.log('\n⚠️  No GPS coordinates found in responses');
  }

  await browser.close();
  console.log('\n✨ Discovery complete!');
})();

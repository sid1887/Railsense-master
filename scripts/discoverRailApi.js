const { chromium } = require("playwright");
const fs = require("fs");

(async () => {

  // ensure logs folder exists
  if (!fs.existsSync("./logs")) {
    fs.mkdirSync("./logs");
  }

  const browser = await chromium.launch({
    headless: false
  });

  const page = await browser.newPage();

  console.log("🚆 Starting RailYatri API discovery...");

  const requestLog = [];
  const responseLog = [];

  // Capture ALL requests with detailed logging
  page.on("request", request => {

    const entry = {
      type: "REQUEST",
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      timestamp: new Date().toISOString()
    };

    requestLog.push(entry);

    // Log API calls and XHR/Fetch separately
    if (request.url().includes("api") || request.url().includes("ajax") ||
        request.resourceType() === "xhr" || request.resourceType() === "fetch") {
      console.log(`🔵 XHR/API Request: ${request.method()} ${request.url()}`);
    }

    fs.appendFileSync(
      "./logs/requests.txt",
      JSON.stringify(entry) + "\n"
    );

  });

  // Capture responses
  page.on("response", async response => {

    try {

      const url = response.url();
      const body = await response.text();

      // Log API responses
      if (url.includes("api") || url.includes("ajax") || response.request().resourceType() === "xhr") {
        console.log(`🟢 Response: ${response.status()} ${url.substring(0, 80)}`);
      }

      const entry = {
        type: "RESPONSE",
        url: url,
        statusCode: response.status(),
        resourceType: response.request().resourceType(),
        timestamp: new Date().toISOString(),
        preview: body.substring(0, 200)
      };

      responseLog.push(entry);

      fs.appendFileSync(
        "./logs/responses.txt",
        JSON.stringify(entry) + "\n"
      );

      // capture JSON responses separately
      try {

        const json = JSON.parse(body);

        fs.appendFileSync(
          "./logs/jsonResponses.txt",
          JSON.stringify({
            url: url,
            status: response.status(),
            resourceType: response.request().resourceType(),
            data: json
          }, null, 2) + "\n\n"
        );

        console.log("✅ JSON response captured from:", url.substring(0, 80));

      } catch {}

    } catch {}

  });

  // Load the page
  await page.goto("https://www.railyatri.in/live-train-status", { waitUntil: "domcontentloaded" });

  console.log("Page loaded, waiting for input field...");

  // Wait a bit for JS to render
  await page.waitForTimeout(3000);

  try {
    // Try to find the train search input - it should be visible
    const trainInput = await page.locator("input[type='text']").filter({ hasText: '' }).first();

    await trainInput.waitFor({ timeout: 5000 });
    console.log("Found search input");

    await trainInput.click({ timeout: 5000 });
    await trainInput.fill("12728");

    console.log("Entered train number");

    await page.keyboard.press("Enter");

    console.log("Triggered search");

    // wait for API calls and results
    console.log("Waiting for APIs to respond (20 seconds)...");
    await page.waitForTimeout(20000);
  } catch (err) {
    console.log("Error interacting with input:", err.message);
    console.log("Continuing to capture any API calls...");
    await page.waitForTimeout(5000);
  }

  // Save structured logs
  fs.writeFileSync(
    "./logs/allRequests.json",
    JSON.stringify(requestLog, null, 2)
  );

  fs.writeFileSync(
    "./logs/allResponses.json",
    JSON.stringify(responseLog, null, 2)
  );

  console.log("📂 Logs saved in /logs folder");

  await browser.close();

})();

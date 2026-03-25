# STAGE 15: Deployment & Presentation Packaging for RailSense

## Quick Local Demo (Hackathon Setup)

For demos and presentations, the **recommended approach** is to run locally on your laptop and expose via ngrok for live judging.

### Option 1: Local Demo (Laptop Only)

**Best for:** Demo with judges present at your project table

```bash
# Terminal 1: Start backend services
cd /c/Railsense  # or your repo path
npm run dev

# Terminal 2: (Optional) Start snapshot worker for realistic data
node -r ts-node/register scripts/snapshotWorker.ts

# Open http://localhost:3000 in browser
# Judges visit http://localhost:3000 on your laptop
```

**Pros:** Instant, no external dependencies
**Cons:** Judges must be physically present

---

### Option 2: ngrok Tunnel (Remote Demo)

**Best for:** Virtual presentation, remote judging

```bash
# Installation (one-time)
# Windows: Download from https://ngrok.com/download
# or brew install ngrok (macOS)
# or apt install ngrok (Linux)

# Terminal 1: Start dev server
npm run dev

# Terminal 2: Expose via ngrok
ngrok http 3000

# Copy the HTTPS URL (looks like: https://abc123.ngrok.io)
# Share with judges: https://abc123.ngrok.io

# Judges visit that URL in their browser
```

**Pros:** Remote access, cloud demo feel
**Cons:** Requires ngrok account (free tier has 2-hour limit)

---

### Option 3: npm run demo (Automated Script)

Create a unified demo command:

```bash
# Add to package.json "scripts":
"demo": "concurrently \"npm run dev\" \"node -r ts-node/register scripts/snapshotWorker.ts\"",
"demo:ngrok": "concurrently \"npm run dev\" \"ngrok http 3000\""

# Then run:
npm run demo
# Or for ngrok:
npm run demo:ngrok
```

---

## Production Deployment Options

### Option A: Vercel (Next.js Native)

**Simplest for Next.js projects**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy from repo
vercel

# 4. Set environment variables in Vercel dashboard:
NEXT_PUBLIC_DEMO_MODE=false
RAILYATRI_API_BASE=https://www.railyatri.in
```

**Cost:** Free tier available (limited to 10 deployments/month)
**Setup Time:** 5 minutes
**Limitations:** Serverless runtime, no persistent file system for logs/DB

### Option B: Docker + Cloud VM (Railway/Render/Fly)

**Better for:** Full control, persistent storage

#### Create Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Next.js app
RUN npm run build

# Create logs directory
RUN mkdir -p logs

EXPOSE 3000

CMD ["npm", "start"]
```

#### Deploy to Railway.app (easiest)

```bash
# 1. Create account at https://railway.app
# 2. Connect GitHub repo
# 3. Deploy automatically on push
# 4. Set env vars in Railway dashboard
```

**Cost:** ~$5/month for hobby tier
**Setup Time:** 10 minutes
**Benefit:** Persistent storage, managed deployment

---

## Environment Variables for Production

Create `.env.production`:

```bash
# Railway/Vercel will load from dashboard, not file
# Manually set in cloud console:

NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com/api

# For external APIs (if integrated):
RAILYATRI_API_BASE=https://www.railyatri.in
OPENWEATHER_API_KEY=your_key_here
NEWS_API_KEY=your_key_here (optional)

# Caching
CACHE_TTL_SECONDS=300

# Logging
LOG_LEVEL=info
```

---

## Pre-Deployment Checklist

Before pushing to production:

```bash
# 1. Type check
npm run type-check

# 2. Build locally
npm run build

# 3. Verify no console errors
npm run dev
# (browse http://localhost:3000, check DevTools)

# 4. Run test plan checklist (see TEST_PLAN.md)

# 5. Commit all changes
git add .
git commit -m "chore: pre-deployment checkpoint"
```

---

## Deployment Troubleshooting

### Build fails on Vercel/Railway

**Error:** `Cannot find module '@/...'`

**Fix:** Ensure `tsconfig.json` has correct path mappings:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Database/Logs not persisting

**Issue:** SQLite database or logs disappear after app restart (serverless)

**Solution:** Use cloud database instead:
- Supabase (PostgreSQL)
- MongoDB Atlas (free tier)
- Firebase Firestore

Or use persistent volume in Docker deployment.

### API timeout in production

**Symptom:** API returns 504 Gateway Timeout

**Cause:** RailYatri endpoint slow or blocked

**Fix:**
- Increase timeout in `axios.defaults.timeout`
- Add caching layer (Redis)
- Use fallback to mock data aggressively

---

## GitHub Integration (CI/CD)

### Enable GitHub Actions for Auto-Deploy

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build

      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: vercel --prod
```

---

## Performance Optimization for Production

### 1. Enable Image Optimization

```javascript
// next.config.js
module.exports = {
  images: {
    unoptimized: false, // Use Next.js Image optimization
    domain: ['tile.openstreetmap.org', 'maps.googleapis.com'],
  },
};
```

### 2. Add Redis Caching Layer (Optional)

```typescript
// services/cache.ts
import Redis from 'redis';

const redis = Redis.createClient({
  url: process.env.REDIS_URL,
});

export async function getOrFetch(key: string, fetcher: () => Promise<any>) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await fetcher();
  await redis.setex(key, 300, JSON.stringify(data)); // 5 min TTL
  return data;
}
```

### 3. Enable Compression

```javascript
// next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,
};
```

---

## Monitoring & Logging in Production

### Option 1: Sentry (Error Tracking)

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Option 2: LogRocket (Session Replay)

```bash
npm install logrocket
```

```typescript
// Log user sessions and errors
import LogRocket from 'logrocket';

if (typeof window !== 'undefined') {
  LogRocket.init('railsense-app');
}
```

---

## Demo Presentation Flow (10 mins)

### Setup (2 mins before judges arrive)

```bash
# Terminal 1
npm run dev

# Terminal 2 (if using ngrok)
ngrok http 3000

# Show judges the URL to visit
```

### Live Demo Script (8 mins)

```
[0:00] Opening Screen
- "RailSense: Intelligent Train Halt Insight System"
- Click through home page quickly

[1:00] Live Search
- Search for train "12702"
- "Real-time data from Indian Railway APIs"
- Show search results loading

[2:00] Detail Page - Data Flow
- Click on train
- Explain what we're seeing:
  - "Train position: live GPS from RailYatri API"
  - "Speed: 65 km/h, Delay: 5 minutes"

[3:00] Real-Time Map
- "Leaflet map with live position marker"
- Zoom in/out to show responsiveness
- "Updates every 5 seconds via live polling"

[4:00] Intelligent Components
- Point to HaltStatusCard: "Detecting unexpected halts"
- Point to TrafficIndicator: "5 nearby trains in area"
- Point to CompletionGauge: "Uncertainty index: 45%"

[5:00] Route Timeline & Analytics
- Scroll down: "Station-by-station progress"
- Show RouteTimeline with completion dots
- Show CongestionHeatmap: "Heat map of congestion zones"

[6:00] Technical Stack
- "Built with Next.js 14, React 18, TypeScript"
- "Tailwind CSS + Framer Motion animations"
- "Leaflet for mapping, Haversine for distance"

[7:00] Backend Services
- "6 core services:
  1. Real-time data fetching (RailYatri)
  2. Halt detection algorithm
  3. Traffic analysis using Haversine distance
  4. Prediction engine
  5. Uncertainty scoring
  6. News context fetching"

[8:00] Innovation Highlight
- "Key insights:
  - Multi-source fallback (real data → scraper → mock)
  - Location history tracking for true halt detection
  - Nearby train finding with Haversine
  - Passenger-friendly recommendations
  - No API keys needed - uses public endpoints"

[9:00] Q&A Ready
- Questions about algorithms
- Feature demos (if time)

[10:00] Close
- Final URL to try after event
```

---

## Post-Event Next Steps

1. **Gather Feedback**
   - Ask judges about most impressive feature
   - Note any UI/UX feedback
   - Collect email addresses for updates

2. **Iterate Based on Feedback**
   - Prioritize missing features
   - Fix reported bugs
   - Improve accuracy of algorithms

3. **Document Learnings**
   - What worked well
   - What could be better
   - ML pipeline ideas

4. **Consider Full Deployment**
   - If you plan to use in production
   - Setup persistent database (not SQLite)
   - Add user authentication
   - Implement mobile app

---

## Cost Breakdown (Monthly)

| Service | Cost | Purpose |
|---------|------|---------|
| Vercel (Next.js hosting) | $0-$/mo | Frontend + API |
| Railway (Docker) | $5/mo | Full stack alternative |
| Supabase (DB) | $0+ | Persistent storage |
| SendGrid (Email) | $0+ | Notifications |
| **Total** | **~$5/mo** | Full production setup |

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run type-check     # TypeScript validation
npm run build          # Production build

# Demo/Presentation
npm run demo           # Start dev + worker
npm run demo:ngrok     # Start dev + ngrok tunnel

# Production
npm start              # Start production server
npm run prod           # Build + start (for testing locally)

# Debugging
npm run type-check     # Find TypeScript errors
npm run lint           # Check code style
```

---

## Key Takeaways

✅ **For Hackathon Demo:** Use `npm run dev` + ngrok or local laptop
✅ **For Quick Deploy:** Use Vercel (auto-deployment from GitHub)
✅ **For Production:** Use Railway + Supabase for persistence
✅ **For Monitoring:** Add Sentry for error tracking
✅ **Keep:** All logs and metrics for post-event analysis

Good luck with your presentation! 🚀

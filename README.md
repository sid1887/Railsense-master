# RailSense - Intelligent Train Halt Insight System

A modern web application that analyzes live train movement data and provides contextual insights when trains stop unexpectedly.

## 🎯 Features

- **Live Train Tracking**: Real-time train position on interactive map
- **Halt Detection**: Identifies unexpected train stops and duration
- **Smart Predictions**: AI-powered wait time estimation
- **Uncertainty Index**: Risk assessment based on multiple factors
- **Traffic Analysis**: Detects nearby train congestion
- **Passenger Insights**: Human-readable contextual explanations

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Framer Motion (animations)
- Leaflet.js (maps)

**Backend:**
- Next.js API Routes
- Node.js
- Axios

**Data:**
- Mock train data (JSON)
- OpenWeatherMap API integration
- OpenRailwayMap data

## 📁 Project Structure

```
railsense/
├── app/                      # Next.js App Router
│   ├── page.tsx             # Home page with search
│   ├── layout.tsx           # Root layout
│   ├── globals.css          # Global styles
│   ├── train/
│   │   └── [trainNumber]/
│   │       └── page.tsx     # Train detail page
│   └── api/                 # API routes (coming next)
├── components/              # React components
│   └── TrainSearch.tsx      # Search component
├── services/                # Business logic
├── lib/                     # Utilities
│   └── utils.ts            # Helper functions
├── types/                   # TypeScript types
│   └── train.ts
├── public/                  # Static assets
│   └── mockTrainData.json
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Open browser:**
   ```
   http://localhost:3000
   ```

## 📝 Demo Mode

The application includes mock data for easy demonstration:

```json
// public/mockTrainData.json
{
  "trains": [
    {
      "trainNumber": "12702",
      "trainName": "Kazipet-Warangal Express",
      "source": "Kazipet Junction",
      "destination": "Warangal Station",
      ...
    }
  ]
}
```

Try searching for: **12702**, **17015**, or **11039**

## 🎨 Design System

**Color Palette:**
- Background: `#0a0e27` (dark-bg)
- Cards: `#1a1f3a` (dark-card)
- Accent: `#00d4ff` (accent-blue)
- Alert: `#ff8c42` / `#ff3b3b` (orange/red)

**Typography:**
- Headings: Bold, 2xl-6xl
- Body: Regular, text-base
- Secondary: text-sm, gray tone

## 📋 Components (In Development)

### Phase 3 Components:
- [ ] `TrainSearch.tsx` - ✅ Complete
- [ ] `LiveTrainMap.tsx` - Shows train location
- [ ] `HaltStatusCard.tsx` - Current halt info
- [ ] `UncertaintyGauge.tsx` - Risk visualization
- [ ] `TrafficIndicator.tsx` - Congestion display
- [ ] `RouteTimeline.tsx` - Station timeline
- [ ] `InsightPanel.tsx` - Passenger insights
- [ ] `CongestionHeatmap.tsx` - Traffic heatmap

## 🔧 Services (In Development)

### Phase 2 Services:
- [ ] `trainDataService.ts` - Fetch train data (mock/API)
- [ ] `haltDetection.ts` - Detect unexpected halts
- [ ] `trafficAnalyzer.ts` - Analyze traffic patterns
- [ ] `predictionEngine.ts` - Calculate wait times
- [ ] `insightGenerator.ts` - Generate insights

## 🔌 API Endpoints (Planned)

- `GET /api/train?trainNumber=12702` - Get train data
- `GET /api/train-details?trainNumber=12702` - Complete train insights
- `GET /api/insights?trainNumber=12702` - Passenger insights
- `GET /api/nearby-trains?latitude=17.38&longitude=78.52` - Trains within radius

## 🧪 Testing

Currently using simulated data. To test:

1. Search for train: **12702**
2. View detailed information page
3. Components will integrate progressively

## 📚 Key Algorithms

### Halt Detection
```typescript
if (speed === 0 && !isAtStation && duration > threshold) {
  return { halted: true, duration, location }
}
```

### Uncertainty Index
```
score = (halt_duration * 0.4) +
        (traffic_density * 0.35) +
        (weather_risk * 0.25)
```

### Wait Time Prediction
```
prediction = base_section_wait +
             (traffic_factor * nearby_trains) +
             (weather_factor * conditions)
```

## 🎓 For Innovation Competition

- **Live Demo**: Uses mock data for fallback reliability
- **Clean Code**: Modular, well-commented architecture
- **Modern UI**: Dashboard-style interface with smooth animations
- **Scalable**: Easy to integrate real APIs
- **Presentation Ready**: Visual focus on clarity and impact

## 📖 Documentation

Each file includes inline comments explaining:
- Component purpose
- Props and state
- Key algorithms
- Integration points

## 🔐 Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

## 📦 Build & Deploy

**Build for production:**
```bash
npm run build
npm start
```

**For detailed deployment guide** (recommended):
See [DEPLOYMENT_NPM.md](./DEPLOYMENT_NPM.md)

**Deploy to Vercel:**
```bash
vercel
```

**Docker** (optional, currently dormant):
Docker configuration files are available but npm-based deployment is recommended for now.

## 🤝 Contributing

This is a prototype project. Feel free to:
- Add real API integrations
- Enhance visualizations
- Optimize performance
- Extend features

## 📄 License

MIT License - Free to use for educational and commercial purposes

---

**Created for:** College Innovation Competition
**Status:** Prototype Phase 1 Complete ✅
**Next Phase:** Core Services Development

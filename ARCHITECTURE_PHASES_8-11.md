# Architecture: Phases 8-11 Integration

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React)                        │
├─────────────────────────────────────────────────────────┤
│  - Train Details Page                                   │
│  - News Feed Component                                  │
│  - Weather Info Card                                    │
│  - Login/Auth Pages                                     │
│  - Admin Dashboard                                      │
└────────────────┬────────────────────────────────────────┘
                 │ API Requests (JSON/REST)
┌────────────────▼────────────────────────────────────────┐
│              API Layer (Next.js Routes)                  │
├─────────────────────────────────────────────────────────┤
│  /api/auth              → AuthenticationService          │
│  /api/railway-news      → RailwayNewsService            │
│  /api/weather           → WeatherService                │
│  /api/database          → DatabaseService               │
└────────────────┬────────────────────────────────────────┘
                 │ Internal Service Calls
┌────────────────▼────────────────────────────────────────┐
│         Services Layer (Business Logic)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ AuthService      │  │ WeatherService   │            │
│  │ ────────────────▶│  │ ─────────────────│            │
│  │ · Login/Logout  │  │ · OpenWeatherMap │            │
│  │ · JWT tokens    │  │ · 10-min Cache   │            │
│  │ · RBAC matrix   │  │ · Impact calc    │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ NewsService      │  │ DatabaseService  │            │
│  │ ────────────────▶│  │ ─────────────────│            │
│  │ · 5 RSS feeds   │  │ · Trains data    │            │
│  │ · Categorization│  │ · Analytics log  │            │
│  │ · 30-min Cache  │  │ · Incidents log  │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
└────────────────┬────────────────────────────────────────┘
                 │ External API Calls (for news/weather)
┌────────────────▼────────────────────────────────────────┐
│            External Data Sources                         │
├─────────────────────────────────────────────────────────┤
│  · OpenWeatherMap API                                   │
│  · Google News RSS Feeds (5 feeds)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Service Dependencies

### AuthenticationService
- **Depends On**: Nothing (standalone)
- **Used By**:
  - API endpoints for login/verify/logout
  - Frontend for auth flow
- **Exports**: `authService` singleton
- **Storage**: In-memory (users Map, tokens Map)

### WeatherService
- **Depends On**: `fetch()` API (external OpenWeatherMap API)
- **Used By**:
  - `/api/weather` endpoint
  - Train detail pages (planned)
  - Delay prediction (future)
- **Exports**: `weatherService` singleton
- **Storage**: In-memory cache (10-minute TTL)
- **Fallback**: Deterministic mock if API fails

### RailwayNewsService
- **Depends On**: `fetch()` API (external Google News RSS feeds)
- **Used By**:
  - `/api/railway-news` endpoint
  - News feed components (planned)
  - Critical alert system (planned)
- **Exports**: `railwayNewsService` singleton
- **Storage**: In-memory cache (30-minute TTL)
- **Fallback**: Empty array if feeds unavailable

### DatabaseService
- **Depends On**: `fs` module (Node.js filesystem)
- **Used By**:
  - `/api/database` endpoint
  - Analytics logging (future)
  - Preference persistence (future)
  - Incident tracking (future)
- **Exports**: `databaseService` singleton
- **Storage**: File-based JSON (`.data/database.json`)
- **Collections**:
  - `trains`: Current train metadata
  - `analytics`: Historical delay/halt data
  - `incidents`: Recorded issues
  - `user_preferences`: User settings

---

## Data Flow Examples

### Example 1: User Login → View Personalized News

```
User logs in with credentials
    ↓
POST /api/auth {action: "login", email, password}
    ↓
authService.loginUser() validates credentials
    ↓
Creates JWT token (24-hour TTL)
    ↓
Returns token in response (set as httpOnly cookie)
    ↓
Frontend stores token, makes authenticated request
    ↓
GET /api/railway-news (token in header/cookie)
    ↓
railwayNewsService.getLatestNews()
    ↓
Fetches from 5 Google News RSS feeds
    ↓
Categorizes by role/preference (future)
    ↓
Returns filtered news
    ↓
Frontend displays news feed
```

### Example 2: Check Train Delay Due to Weather

```
Frontend requests train details for 12955
    ↓
GET /api/train-analytics?trainNumber=12955
    ↓
Analytics API returns: current delay = 15 min
    ↓
Frontend checks weather at current train location
    ↓
GET /api/weather?lat=28.5355&lng=77.3910&type=impact
    ↓
weatherService.getWeatherAtLocation() calls OpenWeatherMap
    ↓
Returns weather data: Heavy rain, 20mm/h precipitation
    ↓
assessWeatherImpact() calculates: +8-15 min delay expected
    ↓
Total predicted delay: 15 + 12 = 27 minutes
    ↓
Frontend shows: "Delay due to heavy rain" with prediction
```

### Example 3: Admin Records Incident & Views Dashboard

```
Admin logs in as admin@railsense.local
    ↓
POST /api/auth {action: "login", email, password}
    ↓
authService verifies role = "admin"
    ↓
Frontend checks permissions: admin can record_incident ✓
    ↓
Admin reports: Train 12955 maintenance delay
    ↓
POST /api/database {
  collection: "incidents",
  action: "record",
  data: {trainNumber: "12955", type: "maintenance", severity: "high"}
}
    ↓
databaseService.recordIncident() creates incident record
    ↓
Auto-persists to .data/database.json
    ↓
Admin views incidents dashboard
    ↓
GET /api/database?collection=incidents&unresolved=true
    ↓
databaseService returns all unresolved incidents
    ↓
Frontend displays admin dashboard with incident list
```

---

## Caching Strategy

### WeatherService (10 minutes)
```
Request for lat=28.5355, lng=77.3910
  ↓
Check cache: weatherCache.get("28.54,77.39")
  ↓
If cached && timestamp < 10 min ago → return cached data
  ↓
Else → fetch from OpenWeatherMap API
  ↓
Store in cache with new timestamp
  ↓
Setup auto-cleanup every 15 minutes
```

### RailwayNewsService (30 minutes)
```
Request for latest news
  ↓
Check cache: newsCache.length > 0 && timestamp < 30 min ago
  ↓
If cached → return newsCache
  ↓
Else → Fetch from all 5 RSS feeds in parallel
  ↓
Parse XML, categorize, deduplicate by title
  ↓
Store in newsCache with new timestamp
  ↓
Return top 50 articles
```

### API HTTP Caching
```
GET /api/railway-news
Response Headers:
  Cache-Control: public, max-age=1800  (30 minutes)

GET /api/weather
Response Headers:
  Cache-Control: public, max-age=600   (10 minutes)
```

---

## Error Handling & Fallbacks

### WeatherService
- **API Failure** → Return null → Frontend shows "Weather unavailable"
- **Invalid Coordinates** → Return null → Frontend handles gracefully
- **Timeout** → 15-second timeout, returns null
- **Fallback** → None currently (could add mock data)

### RailwayNewsService
- **RSS Feed Unavailable** → Skip that feed, try others
- **XML Parse Error** → Skip article, continue parsing
- **No Articles** → Return empty array
- **Fallback** → Returns empty news list

### AuthenticationService
- **Invalid Credentials** → Return null
- **Token Expired** → verifyToken() returns null
- **No Token** → Redirect to login (frontend)

### DatabaseService
- **JSON Parse Error** → Log error, use empty collections
- **Write Error** → Log error, continue in-memory
- **Disk Full** → Recent writes may fail (escalate to user)

---

## Role-Based Access Control

### Permission Matrix

```
Endpoint          | Passenger | Staff | Analyst | Admin |
------------------|-----------|-------|---------|-------|
/api/auth         | ✓         | ✓     | ✓       | ✓     |
/api/railway-news | ✓         | ✓     | ✓       | ✓     |
/api/weather      | ✓         | ✓     | ✓       | ✓     |
/api/database     | Limited   | Full  | Full    | Full  |
                  | (own data)| (all) | (all)   | (all) |
```

### Planned RBAC Enforcement
```
Frontend:
  - Hide "Record Incident" button from passengers
  - Hide "Admin Dashboard" from non-admins
  - Show only own train data to passengers

Backend:
  - POST /api/database/incidents requires staff+ role
  - GET /api/database with admin filter requires analyst+ role
  - DELETE operations require admin role
```

---

## Performance Metrics

### Service Response Times
- **AuthService** (~5ms):
  - Login: 1-3ms
  - Verify token: 1ms
  - Permission check: 1ms

- **DatabaseService** (~10ms):
  - Read: 2-5ms
  - Write: 5-10ms (includes disk I/O)
  - Stats: 1-2ms

- **WeatherService** (~100-500ms):
  - Cache hit: 1-5ms
  - API call: 300-500ms (network dependent)
  - Impact calculation: 2-5ms

- **RailwayNewsService** (~1000-3000ms):
  - Cache hit: 5-20ms
  - RSS parse: 500-1000ms
  - Categorization: 100-200ms

### Memory Usage
- **In-memory data**:
  - Weather cache: ~5KB per location (typically 5-10 locations) = 50-100KB
  - News cache: ~500KB (top 50 articles × 10KB avg)
  - Auth tokens: ~1KB per token (typically 5-10 concurrent) = 5-10KB
  - User preferences: ~1KB × number of users

**Estimate**: ~600KB for average usage, scales linearly with data

---

## Scalability Considerations

### Current Limitations
- **Database**: File-based JSON (not suitable for >10,000 records)
- **Auth**: In-memory tokens (restart clears all sessions)
- **News**: No persistence (cache lost on restart)
- **Weather**: 10-minute cache (might be stale)

### Scaling Solutions
1. **Replace JSON with SQLite/PostgreSQL**
   - File → SQLite for local dev
   - SQLite → PostgreSQL for production

2. **Move sessions to Redis**
   - In-memory → Redis cluster
   - Shared across multiple server instances

3. **Archive old data**
   - Keep analytics if >1000 records
   - Historical analysis with time-series DB

4. **Cache layer**
   - Add Redis for multi-server cache sharing
   - Broadcast cache invalidations

---

## Security Considerations

### Current Implementation
- ✅ Passwords accepted (demo purposes)
- ✅ JWT tokens with expiration
- ✅ Role-based access control
- ⚠️ No password hashing (MD5/bcrypt needed)
- ⚠️ No SSL/TLS protection
- ⚠️ No rate limiting
- ⚠️ No request validation/sanitization

### Recommended Improvements
1. **Authentication**:
   - Replace simple password check with bcrypt
   - Add password requirements (min 8 chars, special chars)
   - Implement MFA (2FA)

2. **Network Security**:
   - Enable HTTPS in production
   - Implement CORS properly
   - Add request signing

3. **Rate Limiting**:
   - Limit logins: 5 attempts per 15 minutes
   - Limit news API: 100 req/hour per IP
   - Limit weather API: 50 req/hour per user

4. **Data Protection**:
   - Encrypt passwords in database
   - Hash tokens in session store
   - Don't expose full user data in API response

---

## Future Integration Points

### With Existing Phases (1-7)
- **Phase 6B (Position)**: Feed position to weather service
- **Phase 7 (Quality)**: Add weather/news/auth quality scores
- **Phase 5 (Dashboard)**: Display weather, news, auth in dashboard

### Planned Frontend Features
- News feed sidebar on train details
- Weather card on route maps
- User preferences for notification types
- Admin dashboard for system monitoring

### Planned Backend Features
- Automated incident detection (from news/weather)
- Delay prediction using ML (weather + historical)
- News alerts for critical conditions
- User preferences API

---

## Deployment Checklist

- [ ] Replace hardcoded demo users with real user database
- [ ] Implement bcrypt for password hashing
- [ ] Enable HTTPS/SSL certificates
- [ ] Setup environment variables for API keys
- [ ] Configure CORS for frontend domain
- [ ] Setup database migrations (JSON → PostgreSQL)
- [ ] Add request validation middleware
- [ ] Setup rate limiting (Redis)
- [ ] Configure logging and monitoring
- [ ] Setup automated backups for .data/database.json
- [ ] Test all endpoints with load testing
- [ ] Security audit and penetration testing

# Quick API Testing Guide - Phases 8-11

## Server Status
- **Dev Server**: http://localhost:3001
- **Current Status**: ✅ Running
- **Build Status**: ✅ Compiled successfully

---

## Phase 11: Authentication API

### Demo Users (Get Credentials)
```bash
curl -X POST http://localhost:3001/api/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"demo-users"}'
```

**Response**: Returns 4 demo user accounts with roles

### Login
```bash
curl -X POST http://localhost:3001/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action":"login",
    "email":"admin@railsense.local",
    "password":"any-password"
  }'
```

**Response**: Returns JWT token and user info

### Verify Token
```bash
curl -X POST http://localhost:3001/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action":"verify",
    "token":"<your-jwt-token>"
  }'
```

**Response**: Confirms token validity

### Logout
```bash
curl -X POST http://localhost:3001/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action":"logout",
    "token":"<your-jwt-token>"
  }'
```

**Response**: Confirms logout

### Get Current User
```bash
curl http://localhost:3001/api/auth?action=me \
  -H "Cookie: railsense_auth=<jwt-token>"
```

---

## Phase 9: Railway News API

### Get Latest News
```bash
curl "http://localhost:3001/api/railway-news"
```

### Filter by Category
```bash
curl "http://localhost:3001/api/railway-news?category=delay"
curl "http://localhost:3001/api/railway-news?category=accident"
curl "http://localhost:3001/api/railway-news?category=incident"
curl "http://localhost:3001/api/railway-news?category=safety"
curl "http://localhost:3001/api/railway-news?category=maintenance"
```

### Get News for Specific Train
```bash
curl "http://localhost:3001/api/railway-news?trainNumber=12955"
```

### Get Only Critical News
```bash
curl "http://localhost:3001/api/railway-news?critical=true"
```

### Combine Filters
```bash
curl "http://localhost:3001/api/railway-news?category=delay&critical=true"
curl "http://localhost:3001/api/railway-news?trainNumber=12955&critical=true"
```

---

## Phase 8: Weather API

### Get Weather for Location
```bash
curl "http://localhost:3001/api/weather?lat=28.5355&lng=77.3910"
```

**Parameters**:
- `lat` - Latitude (required)
- `lng` - Longitude (required)
- `type` - `location` (default) or `impact`
- `trainNumber` - Train number (use with type=impact)

### Check Weather Impact on Train
```bash
curl "http://localhost:3001/api/weather?lat=28.5355&lng=77.3910&type=impact&trainNumber=12955"
```

---

## Phase 10: Database API

### View Database Stats
```bash
curl "http://localhost:3001/api/database?collection=stats"
```

### Get All Trains
```bash
curl "http://localhost:3001/api/database?collection=trains"
```

### Get Specific Train
```bash
curl "http://localhost:3001/api/database?collection=trains&trainNumber=12955"
```

### Get Analytics (Recent 100)
```bash
curl "http://localhost:3001/api/database?collection=analytics&limit=100"
```

### Get Analytics for Specific Train
```bash
curl "http://localhost:3001/api/database?collection=analytics&trainNumber=12955&limit=50"
```

### Get Analytics by Date Range
```bash
curl "http://localhost:3001/api/database?collection=analytics&startTime=1700000000000&endTime=1700100000000"
```

### Get Incidents (Unresolved)
```bash
curl "http://localhost:3001/api/database?collection=incidents&unresolved=true"
```

### Get Incidents for Train
```bash
curl "http://localhost:3001/api/database?collection=incidents&trainNumber=12955"
```

### Get User Preferences
```bash
curl "http://localhost:3001/api/database?collection=preferences&userId=user123"
```

---

## Demo User Credentials

| Email | Password | Role |
|-------|----------|------|
| passenger@railsense.local | any | passenger |
| staff@railsense.local | any | staff |
| analyst@railsense.local | any | analyst |
| admin@railsense.local | any | admin |

**Note**: For demo mode, any password is accepted for known users.

---

## Testing Workflow

1. **Get demo users**:
   ```bash
   POST /api/auth with {"action":"demo-users"}
   ```

2. **Login as admin**:
   ```bash
   POST /api/auth with {"action":"login","email":"admin@railsense.local","password":"any"}
   ```

3. **Check news**:
   ```bash
   GET /api/railway-news
   ```

4. **Check weather**:
   ```bash
   GET /api/weather?lat=28.5355&lng=77.3910
   ```

5. **View database stats**:
   ```bash
   GET /api/database?collection=stats
   ```

6. **Verify token**:
   ```bash
   POST /api/auth with {"action":"verify","token":"<token-from-step-2>"}
   ```

---

## Common Response Structure

```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
  },
  "confidence": {
    "overall": 85,
    "location": 95,
    "delay": 75,
    "halt": 70,
    "crowdLevel": 60,
    "sources": [
      {
        "name": "openweathermap | google-news-rss | local-auth | database",
        "qualityScore": (0-100),
        "lastUpdated": (unix timestamp),
        "isCached": true/false,
        "cacheTTLSeconds": (number)
      }
    ]
  },
  "timestamp": (unix timestamp),
  "version": "1.0",
  "error": "Optional error message"
}
```

---

## Tips for Testing

1. **Use Postman or REST Client** for easier testing with headers
2. **Check browser console** for real-time API errors
3. **Monitor `npm run dev`** output for server logs
4. **Test with different roles** to verify RBAC permissions
5. **Try combining filters** (category + critical, trainNumber + type, etc.)

---

## Troubleshooting

**Weather API Returns null?**
- Check if OpenWeatherMap API key is set in environment
- Coordinates might be out of bounds
- Server might be rate-limited

**News API Returns Empty?**
- Google News RSS feeds might be blocking requests
- Check server logs for fetch errors
- Cache might need to expire (30 minutes)

**Auth Token Invalid?**
- Token expired (24-hour TTL)
- Token format corrupted
- Login again to get fresh token

**Database Error?**
- Check `.data/database.json` file exists
- Ensure write permissions in project directory
- View server logs for specific error messages

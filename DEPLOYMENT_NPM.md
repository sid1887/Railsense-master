# Railsense - Simple NPM Deployment Guide

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

---

## Production Deployment (NPM)

### 1. Build the Application

```bash
# Clean install of dependencies
npm ci

# Build for production
npm run build

# This creates `.next` folder with optimized build
```

### 2. Start Production Server

```bash
# Run the production server
npm start
```

Server will run on `http://localhost:3000` by default.

---

## Environment Setup

### Copy Environment File

```bash
# Copy template to production config
cp .env.production.example .env.production

# Edit with your settings
nano .env.production
```

### Key Environment Variables

```env
NODE_ENV=production
NEXTPUBLIC_API_URL=http://localhost:3000
OPENWEATHER_API_KEY=your_api_key_here
```

---

## Monitoring & Health Checks

### Health Check Endpoint

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-12T10:30:00.000Z",
  "uptime": 1234.5,
  "environment": "production",
  "version": "2.0.0"
}
```

### Test Train Analytics API

```bash
curl "http://localhost:3000/api/train-analytics?trainNumber=12955"
```

---

## Production Deployment on Linux/Mac/Windows

### Option 1: PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Build and start with PM2
npm run build
pm2 start "npm start" --name railsense

# View logs
pm2 logs railsense

# Stop
pm2 stop railsense
```

### Option 2: System Service (Linux)

Create `/etc/systemd/system/railsense.service`:

```ini
[Unit]
Description=Railsense Train Analytics
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/railsense
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable railsense
sudo systemctl start railsense
sudo systemctl status railsense
```

### Option 3: Nginx Reverse Proxy

Configure Nginx to proxy to Node.js:

```nginx
upstream railsense {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://railsense;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Development Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Module Not Found

```bash
# Clean install
rm -rf node_modules
npm install
npm run build
```

### Memory Issues

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

---

## Deployment Checklist

- [ ] Environment variables configured in `.env.production`
- [ ] Dependencies installed: `npm install`
- [ ] Build successful: `npm run build`
- [ ] Health check passing: `curl http://localhost:3000/api/health`
- [ ] Train API responding: `curl http://localhost:3000/api/train-analytics?trainNumber=12955`
- [ ] Client can access frontend
- [ ] Maps loading correctly
- [ ] Analytics charts rendering

---

## Performance Tips

1. **Use CDN** for static assets `/public`
2. **Enable caching** in production
3. **Monitor memory usage** with `npm run dev` vs `npm start`
4. **Use PM2 for auto-restart** on crashes
5. **Set up log rotation** for production logs

---

## Getting Help

- Check logs: `npm run dev 2>&1 | head -100`
- API health: `curl http://localhost:3000/api/health`
- Type errors: `npm run type-check`

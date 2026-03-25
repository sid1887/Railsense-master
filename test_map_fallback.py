#!/usr/bin/env python3
"""Test if map fallback UI is showing properly"""

import urllib.request
import time
import json

# Wait for server
time.sleep(4)

train = '02547'

try:
    # Test the train page
    resp = urllib.request.urlopen(f'http://localhost:3000/train/{train}', timeout=10)
    html = resp.read().decode()

    print('═' * 60)
    print('MAP FALLBACK UI TEST')
    print('═' * 60)
    print()

    # Check for key indicators
    has_route_data = 'JOYRIDE SPECIAL' in html or 'Route' in html
    has_coordinates = '18.98' in html or 'coordinates' in html.lower()
    has_stops = 'stops' in html.lower()
    has_fallback = 'Leaflet Unavailable' in html or 'Interactive Map Unavailable' in html or 'Loading map' in html

    print(f'  Train Name in HTML: {has_route_data}')
    print(f'  Coordinates in HTML: {has_coordinates}')
    print(f'  Stops in HTML: {has_stops}')
    print(f'  Fallback UI indicator: {has_fallback}')

    # Check API endpoints
    print()
    print('API ENDPOINTS:')
    print('─' * 60)

    # Test train API
    api_resp = urllib.request.urlopen(f'http://localhost:3000/api/train/{train}')
    api_data = json.loads(api_resp.read().decode())
    print(f'  ✓ /api/train/{train}')
    print(f'    ├─ Train: {api_data.get("trainName")}')
    print(f'    ├─ Route: {api_data.get("source")} → {api_data.get("destination")}')
    print(f'    └─ Stops: {len(api_data.get("route", []))}')

    # Test mapview API
    map_resp = urllib.request.urlopen(f'http://localhost:3000/api/mapview?trainNumber={train}')
    map_data = json.loads(map_resp.read().decode())
    if map_data.get('success'):
        coords = map_data.get('data', {}).get('route', {}).get('coordinates', [])
        print(f'  ✓ /api/mapview?trainNumber={train}')
        print(f'    ├─ Polyline points: {len(coords)}')
        pos = map_data.get('data', {}).get('trainPosition')
        print(f'    └─ Live position: {pos}')

    print()
    print('═' * 60)
    print('RESULT: Map should now display one of:')
    print('  1. Interactive Leaflet map (if Leaflet loads)')
    print('  2. Fallback UI with coordinates list')
    print('  3. Spinner while loading')
    print()
    print('If still stuck on spinner, open DevTools (F12) and check:')
    print('  Console → Look for [MapContent] messages')
    print('═' * 60)

except Exception as e:
    print(f'Error: {e}')

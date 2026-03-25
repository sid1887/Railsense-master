#!/usr/bin/env python3
"""
Final comprehensive test of all systems after fixes
"""

import urllib.request
import json
import time

time.sleep(4)

print('=' * 70)
print('FINAL SYSTEM VERIFICATION - All Fixes Applied')
print('=' * 70)
print()

train = '02547'

# Test 1: Train API
print('[1] TRAIN DATA API')
print('─' * 70)
try:
    resp = urllib.request.urlopen(f'http://localhost:3000/api/train/{train}')
    data = json.loads(resp.read().decode())
    print(f'✓ /api/train/{train} → 200 OK')
    print(f'  Train: {data.get("trainName")}')
    print(f'  Route: {data.get("source")} → {data.get("destination")}')
    print(f'  Stops: {len(data.get("route", []))} with coordinates')
    print(f'  Delay: {data.get("delayMinutes")} minutes')
except Exception as e:
    print(f'✗ Error: {e}')

print()

# Test 2: MapView API
print('[2] MAP RENDERING API')
print('─' * 70)
try:
    resp = urllib.request.urlopen(f'http://localhost:3000/api/mapview?trainNumber={train}')
    data = json.loads(resp.read().decode())
    if data.get('success'):
        coords = data.get('data', {}).get('route', {}).get('coordinates', [])
        pos = data.get('data', {}).get('trainPosition')
        print(f'✓ /api/mapview?trainNumber={train} → 200 OK')
        print(f'  Polyline: {len(coords)} points')
        print(f'  Live GPS: ({pos.get("lat"):.4f}, {pos.get("lng"):.4f})')
        print(f'  Delay: {pos.get("delay")} min')
except Exception as e:
    print(f'✗ Error: {e}')

print()

# Test 3: Prediction API (NEW FIX)
print('[3] ETA PREDICTION API (FIXED)')
print('─' * 70)
try:
    resp = urllib.request.urlopen(f'http://localhost:3000/api/predict?train={train}')
    data = json.loads(resp.read().decode())
    if resp.status == 200 and data.get('train_name'):
        print(f'✓ /api/predict?train={train} → 200 OK')
        print(f'  Train: {data.get("train_name")}')
        print(f'  Current Delay: {data.get("current_delay_min")} min')
        print(f'  Predicted Delay: {data.get("predicted_final_delay_min")} min')
        print(f'  Confidence: {data.get("confidence", 0):.0%}')
        print(f'  Method: {data.get("method")}')
    else:
        print(f'⚠️  Response status: {resp.status}')
        print(f'  Data: {data}')
except Exception as e:
    print(f'✗ Error: {e}')

print()
print('=' * 70)
print('🚀 BROWSER TEST INSTRUCTIONS')
print('=' * 70)
print()
print('Open your browser and go to:')
print(f'  http://localhost:3000/train/{train}')
print()
print('You should now see:')
print('  ✓ Train name loads (JOYRIDE SPECIAL)')
print('  ✓ Route displays (DARJEELING → TO DARJEELING)')
print('  ✓ 3 stops listed with times')
print('  ✓ Map component (interactive or fallback UI)')
print('  ✓ Current position shown')
print('  ✓ Delay info (-1 minute)')
print('  ✓ Prediction showing predicted delay')
print()
print('All systems should be operational.')
print('=' * 70)

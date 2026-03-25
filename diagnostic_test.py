#!/usr/bin/env python3
"""Diagnostic test - check which systems are actually working"""

import json
import urllib.request
import sys

def call_api(endpoint):
    """Call an API endpoint and return response"""
    try:
        url = f'http://localhost:3000{endpoint}'
        with urllib.request.urlopen(url, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode())
    except Exception as e:
        return 'ERROR', str(e)

def check_system():
    train = '01211'

    print('╔════════════════════════════════════════════════╗')
    print('║   DIAGNOSTIC TEST - System Status              ║')
    print('╚════════════════════════════════════════════════╝\n')

    # 1. Train API
    print('[1] Train API Endpoint')
    print('─' * 48)
    status, resp = call_api(f'/api/train/{train}')
    if status == 200:
        print(f'  ✓ Status: {status}')
        if isinstance(resp, dict):
            print(f'  ✓ Train Name: {resp.get("trainName")}')
            print(f'  ✓ Source: {resp.get("source")}')
            print(f'  ✓ Destination: {resp.get("destination")}')
            route_count = len(resp.get('route', []))
            print(f'  ✓ Route stops: {route_count}')

            # Check for coordinates in route
            coords_count = len([r for r in resp.get('route', []) if r.get('latitude')])
            print(f'  ✓ Stops with coordinates: {coords_count}/{route_count}')

            # Check for other fields
            has_location = 'location' in resp and resp['location'].get('lat')
            print(f'  {"✓" if has_location else "✗"} Current location: {resp.get("location")}')

            has_eta = 'eta' in resp
            print(f'  {"✓" if has_eta else "✗"} ETA data: {resp.get("eta")}')

            has_delay = 'delayMinutes' in resp
            print(f'  {"✓" if has_delay else "✗"} Delay: {resp.get("delayMinutes")}')
    else:
        print(f'  ✗ Status: {status}')
        print(f'  Error: {resp}')

    # 2. MapView API
    print('\n[2] MapView API Endpoint')
    print('─' * 48)
    status, resp = call_api(f'/api/mapview?trainNumber={train}')
    if status == 200:
        print(f'  ✓ Status: {status}')
        if isinstance(resp, dict) and resp.get('success'):
            route = resp.get('data', {}).get('route', {})
            print(f'  ✓ Train: {route.get("trainName")}')
            coords = route.get('coordinates', [])
            print(f'  ✓ Route coordinates: {len(coords)} points')
            stops = route.get('stops', [])
            print(f'  ✓ Named stops: {len(stops)}')

            pos = resp.get('data', {}).get('trainPosition')
            if pos:
                print(f'  ✓ Live position: {pos}')
            else:
                print(f'  ✗ No live position')
        else:
            print(f'  ✗ Unexpected response: {resp}')
    else:
        print(f'  ✗ Status: {status}')
        print(f'  Error: {resp}')

    # 3. Master Train Catalog
    print('\n[3] Master Train Catalog')
    print('─' * 48)
    status, resp = call_api('/api/master-train-catalog?limit=5')
    if status == 200:
        print(f'  ✓ Status: {status}')
        if isinstance(resp, dict):
            trains = resp.get('trains', [])
            print(f'  ✓ Returns trains: {len(trains)} in sample')
            if trains:
                print(f'  ✓ Sample: {trains[0].get("trainNumber")} - {trains[0].get("trainName")}')
    else:
        print(f'  ✗ Status: {status}')
        print(f'  Error: {resp}')

    # 4. Live Train Data
    print('\n[4] Live Train Data Service')
    print('─' * 48)
    status, resp = call_api(f'/api/live-train-data?trainNumber={train}')
    if status == 200:
        print(f'  ✓ Status: {status}')
        if isinstance(resp, dict):
            print(f'  ✓ Has latitude: {"latitude" in resp}')
            print(f'  ✓ Has longitude: {"longitude" in resp}')
            print(f'  ✓ Has delay: {"delayMinutes" in resp}')
    else:
        print(f'  ✗ Status: {status}')

    # 5. Check Frontend Page
    print('\n[5] Frontend Train Page')
    print('─' * 48)
    try:
        with urllib.request.urlopen(f'http://localhost:3000/train/{train}', timeout=5) as resp:
            html = resp.read().decode()
            if 'BD NK SPL' in html or train in html:
                print(f'  ✓ Status: 200')
                print(f'  ✓ Page renders')
                if 'Leaflet' in html or 'mapview' in html:
                    print(f'  ✓ Map component loaded')
                else:
                    print(f'  ✗ Map component not in HTML')
            else:
                print(f'  ✗ Train data not in page HTML')
    except Exception as e:
        print(f'  ✗ Cannot load page: {e}')

    # Summary
    print('\n╔════════════════════════════════════════════════╗')
    print('║   DIAGNOSIS COMPLETE                           ║')
    print('║   Check which systems above show ✓ or ✗        ║')
    print('╚════════════════════════════════════════════════╝\n')

    print('Next actions based on results:')
    print('  - If MapView ✓: Map API works, check frontend rendering')
    print('  - If MapView ✗: Check /api/mapview endpoint code')
    print('  - If Live Data ✗: Check liveTrainDataService')
    print('  - If Page ✗: Check component rendering\n')

if __name__ == '__main__':
    check_system()

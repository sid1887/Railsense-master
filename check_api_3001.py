#!/usr/bin/env python3
import urllib.request, json

try:
    resp = urllib.request.urlopen('http://localhost:3001/api/train/01211', timeout=5)
    data = json.loads(resp.read().decode())
    print('✓ API responded')
    print(f'  Train Name: {data.get("trainName")}')
    print(f'  Route stops: {len(data.get("route", []))}')
    print(f'  Has location: {bool(data.get("location"))}')
    print(f'  Status: {data.get("status")}')
except Exception as e:
    print(f'✗ API error: {e}')

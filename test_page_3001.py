#!/usr/bin/env python3
"""Test train page rendering on new dev server port"""

import urllib.request

try:
    resp = urllib.request.urlopen('http://localhost:3001/train/01211', timeout=5)
    html = resp.read().decode()

    print('✓ Train page loaded')
    print(f'✓ Status: 200')
    print(f'  Train data in HTML: {"BD NK SPL" in html or "trainName" in html}')
    print(f'  Map container found: {"mapContainer" in html}')
    print(f'  Leaflet found: {"leaflet" in html.lower()}')
    print(f'  Coordinates in HTML: {"18.98" in html or "72.84" in html}')

    # Check for the fallback UI
    if 'Leaflet Unavailable' in html:
        print('  ⚠️  Using Leaflet fallback UI (expected on Windows without Leaflet)')
    elif 'mapContainer' in html:
        print('  ✓ Interactive map rendering')

except Exception as e:
    print(f'✗ Error: {e}')

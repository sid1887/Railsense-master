#!/usr/bin/env python3
"""Check browser console for errors when loading train page"""

import json
import urllib.request
import re

def check_page_content():
    """Fetch and examine page content"""
    try:
        train = '01211'
        url = f'http://localhost:3000/train/{train}'
        with urllib.request.urlopen(url, timeout=5) as resp:
            html = resp.read().decode()

        print('╔════════════════════════════════════════════════╗')
        print('║   PAGE CONTENT ANALYSIS                        ║')
        print('╚════════════════════════════════════════════════╝\n')

        # Check for key components
        checks = [
            ('Train name in HTML', 'BD NK SPL' in html),
            ('Train number in HTML', '01211' in html or '012 11' in html),
            ('Leaflet script', 'leaflet' in html.lower()),
            ('Map container div', 'mapContainer' in html or 'leaflet-container' in html),
            ('MapContent component', 'MapContent' in html),
            ('TrainMapViewer component', 'TrainMapViewer' in html),
            ('React root element', '<div' in html and 'root' in html),
            ('Dynamic import', 'dynamic' in html.lower() or '__next' in html),
        ]

        for check_name, result in checks:
            print(f'  {"✓" if result else "✗"} {check_name}')

        # Check for error messages in HTML
        if 'Error' in html or 'error' in html:
            print('\n  ⚠️  Error messages found in HTML:')
            errors = re.findall(r'(?:Error|error):\s*([^<\n]+)', html)
            for error in set(errors[:5]):  # First 5 unique errors
                print(f'     - {error}')

        # Look for Next.js static files loaded
        if '__next' in html:
            print('\n  ✓ Next.js static files loaded')

        # Check data in page
        if 'BADNERA' in html:
            print('  ✓ Station data present')

        if '18.982' in html or '72.849' in html:
            print('  ✓ Coordinate data present')

        # Summary
        print('\n' + '─' * 48)
        print('KEY FINDINGS:')
        print('─' * 48)

        if 'mapContainer' not in html and 'leaflet-container' not in html:
            print('\n❌ PRIMARY ISSUE: Map div not rendered in HTML')
            print('   This means TrainMapViewer/MapContent not executing')
            print('\n   Likely causes:')
            print('   1. Dynamic import of MapContent failing silently')
            print('   2. TrainMapViewer not being included in render')
            print('   3. Component throwing error during render')

        if 'BD NK SPL' in html:
            print('\n✓ Train data loaded - API working')
        else:
            print('\n✗ Train data NOT in HTML')

        if 'leaflet' in html.lower():
            print('✓ Leaflet library referenced')
        else:
            print('⚠️  Leaflet NOT referenced in HTML')

        # Show HTML snippet around train data
        if 'BD NK SPL' in html:
            idx = html.find('BD NK SPL')
            snippet = html[max(0, idx-200):idx+200]
            print(f'\nTrain data context:\n{snippet[:100]}...')

    except Exception as e:
        print(f'Error fetching page: {e}')

if __name__ == '__main__':
    check_page_content()

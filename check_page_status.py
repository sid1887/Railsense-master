#!/usr/bin/env python3
import urllib.request

resp = urllib.request.urlopen('http://localhost:3001/train/01211')
html = resp.read().decode()

# Look for error indicators
has_error = 'Error' in html or 'error' in html
has_loading = 'Loading' in html or 'loading' in html

print(f"Train Page Status:")
print(f"  Has error message: {has_error}")
print(f"  Has loading state: {has_loading}")
print(f"  Train data in HTML: {' trainName' in html}")
print(f"  Map component: {'mapContainer' in html}")

# Look for error states in component
if 'Train Not Found' in html:
    print('  ERROR: Train not found state triggered')
elif 'Error Loading Train Data' in html:
    print('  ERROR: Train data loading failed')
elif 'Loading train data' in html:
    print('  STATE: Still loading data')
else:
    print('  STATUS: Successful page load')

# Check what's actually in the page
if 'BD NK SPL' in html:
    print('  ✓ Train name found in HTML')
else:
    print('  ✗ Train name NOT in HTML')

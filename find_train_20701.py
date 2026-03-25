import json

# Check if train 20701 is in any of our data files
kb = json.load(open('data/railway_knowledge_base.json'))
if '20701' in kb['trains']:
    print('Train 20701 found in KB')
else:
    print('Train 20701 NOT in KB (8,490 trains)')
    print('Checking data files for 20701...')

    # Quick check in schedules.json for train 20701
    print('\nChecking schedules.json (78 MB)...')
    with open('railway_data/schedules.json', 'r') as f:
        data = json.load(f)
        if '20701' in data:
            t = data['20701']
            print(f'✓ FOUND in schedules.json')
            print(f'  Train: {t.get("trainName", "Unknown")}')
            print(f'  Route: {t.get("source", "?")} -> {t.get("destination", "?")}')
            print(f'  Stops: {len(t.get("stops", []))}')
        else:
            print('✗ Train 20701 not in schedules.json')

            # List a few trains starting with 2 to see what's available
            trains_starting_with_2 = [k for k in list(data.keys())[:1000] if k.startswith('2')]
            print(f'\n  Sample trains starting with 2: {trains_starting_with_2[:5]}')

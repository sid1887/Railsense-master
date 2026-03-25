import json

kb = json.load(open('data/railway_knowledge_base.json'))
coords = kb['station_coordinates']

# Check if coordinates are being loaded
coords_with_lat_lng = {k: v for k, v in coords.items() if v.get('lat') and v.get('lng')}
print(f'Total stations: {len(coords)}')
print(f'Stations with coordinates: {len(coords_with_lat_lng)}')

# Show sample with coordinates
count = 0
for code, info in coords.items():
    if info.get('lat') and info.get('lng') and count < 5:
        print(f'{code}: {info["name"]} @ {info["lat"]}, {info["lng"]}')
        count += 1

# Check for zone/state info (indicator of GeoJSON loading)
with_zone = len([s for s in coords.values() if s.get('zone')])
print(f'\nStations with zone info (GeoJSON): {with_zone}')

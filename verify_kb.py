#!/usr/bin/env python3
import json
import os

kb_file = 'data/railway_knowledge_base.json'
if os.path.exists(kb_file):
    size_mb = os.path.getsize(kb_file) / (1024*1024)
    print(f'Knowledge base file size: {size_mb:.2f} MB')

    with open(kb_file, 'r') as f:
        db = json.load(f)

    trains_count = len(db.get('trains', {}))
    stations_count = len(db.get('station_coordinates', {}))
    stops_count = len(db.get('train_stops', {}))

    print(f'Trains in DB: {trains_count}')
    print(f'Stations in DB: {stations_count}')
    print(f'Train stops in DB: {stops_count}')

    # Show a sample train with stops
    trains = db.get('trains', {})
    if trains:
        sample_num = list(trains.keys())[0]
        sample = trains[sample_num]
        print(f'\nSample train ({sample_num}):')
        print(f'  Name: {sample.get("trainName")}')
        print(f'  Category: {sample.get("category")}')
        print(f'  Data Source: {sample.get("dataSource")}')
        stops = sample.get('stops', [])
        print(f'  Stops: {len(stops)}')
        if stops and isinstance(stops, list):
            print(f'  First stop: {stops[0]}')
else:
    print(f'File not found: {kb_file}')

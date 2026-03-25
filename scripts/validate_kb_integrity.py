#!/usr/bin/env python3
"""
Validate integrity of railway_knowledge_base.json.

Checks:
1) Train keys align with trainNumber values.
2) Route stop station codes resolve to station coordinates.
3) Route stops are ordered by sno and non-decreasing distance.
4) Each route yields at least 2 mapped coordinates for map rendering.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

KB_PATH = Path('data/railway_knowledge_base.json')
CODE_SUFFIX = re.compile(r'-\s*([A-Z0-9]{2,6})\s*$')
DISTANCE_RE = re.compile(r'([0-9]+(?:\.[0-9]+)?)')


def extract_code(station_name: str) -> str | None:
    if not station_name:
        return None
    match = CODE_SUFFIX.search(station_name.strip())
    if not match:
        return None
    return match.group(1)


def parse_distance_km(distance_text: str) -> float | None:
    if not distance_text:
        return None
    match = DISTANCE_RE.search(distance_text)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def has_coords(station: dict) -> bool:
    lat = station.get('lat')
    lng = station.get('lng')
    return isinstance(lat, (int, float)) and isinstance(lng, (int, float))


def validate() -> int:
    if not KB_PATH.exists():
        print(f'ERROR: Missing file: {KB_PATH}')
        return 2

    with KB_PATH.open('r', encoding='utf-8') as f:
        kb = json.load(f)

    trains: Dict[str, dict] = kb.get('trains', {})
    stations: Dict[str, dict] = kb.get('stations', {})

    key_mismatch = 0
    unresolved_codes = 0
    bad_sno_order = 0
    bad_distance_order = 0
    map_short_routes = 0

    sample_unresolved: List[Tuple[str, str, str]] = []

    for train_key, train in trains.items():
        train_number = str(train.get('trainNumber', '')).strip()
        if train_key != train_number:
            key_mismatch += 1

        stops = train.get('stops', []) or []

        prev_sno = -1
        prev_dist = -1.0
        mapped_coords = 0

        for stop in stops:
            station_name = str(stop.get('stationName', '')).strip()
            station_code = extract_code(station_name)

            if station_code and station_code in stations and has_coords(stations[station_code]):
                mapped_coords += 1
            else:
                unresolved_codes += 1
                if len(sample_unresolved) < 15:
                    sample_unresolved.append((train_number or train_key, station_name, station_code or 'N/A'))

            sno_raw = str(stop.get('sno', '')).strip()
            try:
                sno = int(sno_raw)
                if sno <= prev_sno:
                    bad_sno_order += 1
                prev_sno = sno
            except ValueError:
                bad_sno_order += 1

            dist = parse_distance_km(str(stop.get('distance', '')))
            if dist is not None:
                if dist < prev_dist:
                    bad_distance_order += 1
                prev_dist = max(prev_dist, dist)

        if mapped_coords < 2 and len(stops) >= 2:
            map_short_routes += 1

    print('Validation Summary')
    print('------------------')
    print(f'Trains total: {len(trains)}')
    print(f'Stations total: {len(stations)}')
    print(f'Train key mismatches: {key_mismatch}')
    print(f'Unresolved stop codes: {unresolved_codes}')
    print(f'Invalid/non-monotonic sno count: {bad_sno_order}')
    print(f'Non-monotonic distance count: {bad_distance_order}')
    print(f'Routes with <2 mapped coords: {map_short_routes}')

    if sample_unresolved:
        print('\nSample unresolved stops:')
        for train_no, station_name, code in sample_unresolved:
            print(f'- {train_no}: {station_name} (code={code})')

    failures = key_mismatch + bad_sno_order + bad_distance_order + map_short_routes
    if failures > 0:
        print('\nResult: FAILED')
        return 1

    print('\nResult: PASSED')
    return 0


if __name__ == '__main__':
    raise SystemExit(validate())

import json
from pathlib import Path

data_dir = Path("railway_data")
file_path = data_dir / "stations.json"

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Data type: {type(data)}")
if isinstance(data, dict):
    print(f"Dict keys: {list(data.keys())}")
    print(f"GeoJSON type field: {data.get('type')}")

    if data.get("type") == "FeatureCollection":
        features = data.get("features", [])
        print(f"Features found: {len(features)}")

        # Test loading first few
        count = 0
        for feature in features[:3]:
            props = feature.get("properties", {})
            geom = feature.get("geometry", {})
            code = props.get("code")
            coords = geom.get("coordinates", [])

            if len(coords) == 2:
                lng, lat = coords[0], coords[1]
                print(f"  {code}: {props.get('name')} @ ({lat}, {lng})")
                count += 1

        print(f"First 3 features parsed successfully")

#!/usr/bin/env python3
"""
Railway Knowledge Base Ingestion Pipeline
Loads all railway data sources and builds a normalized, deduplicated database.
This is the source of truth for the entire system.
"""

import json
import csv
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Set, Optional
from datetime import datetime
import traceback

class RailwayKnowledgeBuilder:
    def __init__(self, data_dir="C:\\Railsense\\railway_data"):
        self.data_dir = Path(data_dir)
        self.db = {
            "trains": {},  # train_number -> train info
            "stations": {},  # station_code -> station info
            "train_stops": {},  # train_number -> [stops in order]
            "station_coordinates": {},  # station_code -> {lat, lng}
            "train_categories": {},  # train_number -> category
            "route_tables": {},  # table_number -> route info
            "search_cache": {},
            "metadata": {
                "built_at": datetime.now().isoformat(),
                "sources_loaded": []
            }
        }
        self.stats = {
            "trains_loaded": 0,
            "stations_loaded": 0,
            "stops_loaded": 0,
            "duplicates_skipped": 0,
        }

    def log(self, level: str, msg: str):
        """Structured logging"""
        prefix = {
            "INFO": "[INFO]",
            "OK": "[OK]",
            "WARN": "[WARN]",
            "ERROR": "[ERROR]",
            "LOAD": "[LOAD]",
        }.get(level, f"[{level}]")
        print(f"{prefix} {msg}")

    # ============================================================================
    # LAYER 1: Load stations.json for geospatial data
    # ============================================================================
    def load_stations_json(self):
        """Load station coordinates from stations.json (GeoJSON format)"""
        try:
            file_path = self.data_dir / "stations.json"
            self.log("LOAD", f"Loading stations from {file_path.name}...")

            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            count = 0

            # GeoJSON FeatureCollection format
            if isinstance(data, dict) and data.get("type") == "FeatureCollection":
                features = data.get("features", [])

                for feature in features:
                    if not isinstance(feature, dict) or feature.get("type") != "Feature":
                        continue

                    props = feature.get("properties", {})
                    geom = feature.get("geometry")

                    if not isinstance(props, dict) or not isinstance(geom, dict):
                        continue

                    code = props.get("code")
                    name = props.get("name")

                    # GeoJSON stores coordinates as [longitude, latitude]
                    coords = geom.get("coordinates")
                    if not isinstance(coords, list) or len(coords) != 2:
                        continue

                    try:
                        lng, lat = float(coords[0]), float(coords[1])
                    except (TypeError, ValueError):
                        continue

                    if code and name and lat and lng:
                        self.db["station_coordinates"][str(code)] = {
                            "code": str(code),
                            "name": str(name),
                            "lat": lat,
                            "lng": lng,
                            "zone": props.get("zone", ""),
                            "state": props.get("state", "")
                        }
                        count += 1
            else:
                # Fallback for other formats
                stations = data if isinstance(data, list) else data.get("stations", [])

                for station in stations:
                    if isinstance(station, dict):
                        code = station.get("code") or station.get("station_code") or station.get("ID")
                        name = station.get("name") or station.get("station_name") or station.get("Station_Name")
                        lat = station.get("lat") or station.get("latitude") or station.get("Latitude")
                        lng = station.get("lng") or station.get("longitude") or station.get("Longitude")

                        if code and name and lat and lng:
                            self.db["station_coordinates"][str(code)] = {
                                "code": str(code),
                                "name": str(name),
                                "lat": float(lat),
                                "lng": float(lng)
                            }
                            count += 1

            self.stats["stations_loaded"] = count
            self.db["metadata"]["sources_loaded"].append("stations.json")
            self.log("OK", f"Loaded {count} stations")

        except Exception as e:
            self.log("ERROR", f"Failed to load stations.json: {str(e)[:100]}")

    # ============================================================================
    # LAYER 2: Load list_of_stations.json for station master list
    # ============================================================================
    def load_station_master_list(self):
        """Load station master list for normalization"""
        try:
            file_path = self.data_dir / "list_of_stations.json"
            self.log("LOAD", f"Loading station master list from {file_path.name}...")

            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            stations_list = data if isinstance(data, list) else data.get("stations", [])

            count = 0
            for station in stations_list:
                if isinstance(station, dict):
                    code = station.get("code") or station.get("station_code")
                    name = station.get("name") or station.get("station_name")

                    if code and name and str(code) not in self.db["station_coordinates"]:
                        self.db["station_coordinates"][str(code)] = {
                            "code": str(code),
                            "name": str(name),
                            "lat": 0,  # Will be updated from stations.json
                            "lng": 0
                        }
                        count += 1

            self.db["metadata"]["sources_loaded"].append("list_of_stations.json")
            self.log("OK", f"Loaded station master list ({count} new stations)")

        except Exception as e:
            self.log("ERROR", f"Failed to load station master list: {str(e)[:100]}")

    # ============================================================================
    # LAYER 3: Load trains.json for route geometry
    # ============================================================================
    def load_trains_json(self):
        """Load train route geometry"""
        try:
            file_path = self.data_dir / "trains.json"
            self.log("LOAD", f"Loading train routes from {file_path.name}...")

            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            trains_list = data if isinstance(data, list) else data.get("trains", [])

            count = 0
            for train in trains_list:
                if isinstance(train, dict):
                    # Try both camelCase and snake_case variants
                    train_num = str(train.get("trainNumber") or train.get("number") or train.get("train_number") or "")
                    train_name = train.get("trainName") or train.get("name") or train.get("train_name") or ""
                    route = train.get("trainRoute") or train.get("route") or train.get("stops") or []

                    if train_num and train_name:
                        if train_num not in self.db["trains"]:
                            self.db["trains"][train_num] = {
                                "trainNumber": train_num,
                                "trainName": train_name,
                                "source": str(train.get("source") or train.get("origin") or ""),
                                "destination": str(train.get("destination") or ""),
                                "route": route,
                                "dataSource": "trains.json"
                            }
                            count += 1

            self.db["metadata"]["sources_loaded"].append("trains.json")
            self.log("OK", f"Loaded {count} train routes")

        except Exception as e:
            self.log("ERROR", f"Failed to load trains.json: {str(e)[:100]}")

    # ============================================================================
    # LAYER 4: Load category datasets (PASS-TRAINS, EXP-TRAINS, SF-TRAINS)
    # ============================================================================
    def load_category_dataset(self, filename: str, category: str):
        """Load a category train dataset"""
        try:
            file_path = self.data_dir / filename
            self.log("LOAD", f"Loading {category} trains from {filename}...")

            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            trains_list = data if isinstance(data, list) else data.get("trains", [])

            count = 0
            for train in trains_list:
                if isinstance(train, dict):
                    # Try both camelCase and snake_case variants
                    train_num = str(train.get("trainNumber") or train.get("number") or train.get("train_number") or "")
                    train_name = train.get("trainName") or train.get("name") or train.get("train_name") or ""
                    stops = train.get("trainRoute") or train.get("stops") or train.get("route") or []

                    if train_num and train_name:
                        if train_num not in self.db["trains"]:
                            # New train, add it
                            self.db["trains"][train_num] = {
                                "trainNumber": train_num,
                                "trainName": train_name,
                                "category": category,
                                "source": str(train.get("source") or train.get("from") or train.get("route", "").split(" to ")[0] if isinstance(train.get("route"), str) else ""),
                                "destination": str(train.get("destination") or train.get("to") or train.get("route", "").split(" to ")[1] if isinstance(train.get("route"), str) else ""),
                                "stops": stops,
                                "runningDays": train.get("runningDays") or train.get("running_days") or "",
                                "dataSource": filename
                            }
                            count += 1

                            # Store stops if available
                            if stops:
                                if train_num not in self.db["train_stops"]:
                                    self.db["train_stops"][train_num] = stops
                                    self.stats["stops_loaded"] += len(stops)
                        else:
                            # Update category if not set
                            if "category" not in self.db["trains"][train_num]:
                                self.db["trains"][train_num]["category"] = category
                            self.stats["duplicates_skipped"] += 1

            self.db["metadata"]["sources_loaded"].append(filename)
            self.log("OK", f"Loaded {count} {category} trains ({len(trains_list)} total in file)")

        except Exception as e:
            self.log("ERROR", f"Failed to load {filename}: {str(e)[:100]}")

    # ============================================================================
    # LAYER 5: Load CSV indexes for normalization
    # ============================================================================
    def load_csv_index(self, filename: str, key_field: str, use_for: str):
        """Load CSV index file for lookups"""
        try:
            file_path = self.data_dir / filename
            if not file_path.exists():
                self.log("WARN", f"{filename} not found")
                return

            self.log("LOAD", f"Loading {use_for} from {filename}...")

            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                count = 0
                for row in reader:
                    if row and key_field in row:
                        key = str(row[key_field])
                        self.db["route_tables"][key] = row
                        count += 1

            self.log("OK", f"Loaded {count} {use_for} entries")

        except Exception as e:
            self.log("ERROR", f"Failed to load {filename}: {str(e)[:100]}")

    # ============================================================================
    # MAIN INGESTION PIPELINE
    # ============================================================================
    def build(self):
        """Execute the complete ingestion pipeline"""
        self.log("INFO", "="*60)
        self.log("INFO", "RAILWAY KNOWLEDGE BASE INGESTION PIPELINE")
        self.log("INFO", "="*60)

        # Layer 1: Geospatial data
        self.load_stations_json()
        self.load_station_master_list()

        # Layer 2: Route geometry
        self.load_trains_json()

        # Layer 3: Category datasets
        self.load_category_dataset("PASS-TRAINS.json", "PASSENGER")
        self.load_category_dataset("EXP-TRAINS.json", "EXPRESS")
        self.load_category_dataset("SF-TRAINS.json", "SPECIAL")

        # Layer 4: CSV indexes
        self.load_csv_index("Train_Name_Index.csv", "TrainNumber", "train lookup")
        self.load_csv_index("Station_Code_Index.csv", "StationCode", "station lookup")
        self.load_csv_index("TableNumberIndex.csv", "TableNumber", "table lookup")

        # Summary
        self.log("INFO", "="*60)
        self.log("INFO", "INGESTION COMPLETE")
        self.log("INFO", "="*60)
        self.log("OK", f"Trains: {len(self.db['trains'])}")
        self.log("OK", f"Stations: {len(self.db['station_coordinates'])}")
        self.log("OK", f"Train stops: {self.stats['stops_loaded']}")
        self.log("OK", f"Route tables: {len(self.db['route_tables'])}")
        self.log("INFO", f"Sources: {', '.join(self.db['metadata']['sources_loaded'])}")

        return self.db

    def save_database(self, output_path="C:\\Railsense\\data\\railway_knowledge_base.json"):
        """Save the knowledge base to disk"""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)

            self.log("LOAD", f"Saving knowledge base to {Path(output_path).name}...")

            # For large outputs, we need to be smart about serialization
            output = {
                "trains": self.db["trains"],
                "stations": self.db["station_coordinates"],
                "train_stops": self.db["train_stops"],
                "route_tables": self.db["route_tables"],
                "metadata": self.db["metadata"],
                "stats": {
                    "total_trains": len(self.db["trains"]),
                    "total_stations": len(self.db["station_coordinates"]),
                    "total_stops": self.stats["stops_loaded"],
                }
            }

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)

            file_size = Path(output_path).stat().st_size / (1024*1024)
            self.log("OK", f"Saved knowledge base ({file_size:.2f} MB)")

            return output_path

        except Exception as e:
            self.log("ERROR", f"Failed to save knowledge base: {str(e)}")
            return None


if __name__ == "__main__":
    builder = RailwayKnowledgeBuilder()

    try:
        db = builder.build()
        output_file = builder.save_database()

        if output_file:
            print(f"\n[SUCCESS] Railway knowledge base built successfully!")
            print(f"Location: {output_file}")
            print(f"\nYou can now use this as the source of truth for train searches.")

    except Exception as e:
        print(f"\n[CRITICAL ERROR] {str(e)}")
        traceback.print_exc()
        sys.exit(1)

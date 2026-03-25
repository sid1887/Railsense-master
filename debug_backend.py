#!/usr/bin/env python3
"""
Comprehensive Backend Testing & Debugging Suite
Tests all APIs, data sources, and identifies blocking issues
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
import sys
from pathlib import Path
import os

# Fix Windows encoding
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Test configuration
BASE_URL = "http://localhost:3000"
AVAILABLE_TRAINS = [
    "12002", "12005", "12015", "12031", "12049", "12137", "12141",
    "12231", "12273", "12301", "12311", "12421", "12556", "12625",
    "12655", "12659", "12706", "12723", "12777", "12789", "12809",
    "12811", "12911", "12955", "13005", "13145", "13345", "14645",
    "15906", "16093", "16504", "17310", "19005", "22101"
]
UNAVAILABLE_TRAINS = ["13123", "12622", "20701"]

results = {
    "timestamp": datetime.now().isoformat(),
    "tests": [],
    "summary": {}
}

def log_test(name: str, status: str, details: str = "", data: Dict = None):
    """Log test result"""
    test = {
        "name": name,
        "status": status,
        "details": details,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }
    results["tests"].append(test)

    status_color = {
        "PASS": Colors.GREEN,
        "FAIL": Colors.RED,
        "WARN": Colors.YELLOW,
        "INFO": Colors.BLUE
    }.get(status, Colors.CYAN)

    print(f"{status_color}[{status}]{Colors.ENDC} {name}")
    if details:
        print(f"  >> {details}")
    return test

def section(title: str):
    """Print section header"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}{Colors.ENDC}\n")

# ============================================================================
# SECTION 1: API Connectivity Tests
# ============================================================================
section("1. BASIC API CONNECTIVITY")

try:
    response = requests.get(f"{BASE_URL}/api/stations", timeout=5)
    if response.status_code == 200:
        stations = response.json()
        log_test("API Server", "PASS", f"Server responding normally. {len(stations) if isinstance(stations, list) else 'Data'} stations found", {"status_code": 200})
    else:
        log_test("API Server", "FAIL", f"Status code: {response.status_code}")
except Exception as e:
    log_test("API Server", "FAIL", f"Connection error: {str(e)}")
    sys.exit(1)

# ============================================================================
# SECTION 2: Data Source Tests
# ============================================================================
section("2. DATA SOURCE AVAILABILITY")

sources = {
    "/api/master-train-catalog": "Master Train Catalog",
    "/api/railway-routes": "Railway Routes",
    "/api/train-position": "Train Position Service",
}

for endpoint, name in sources.items():
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
        status = "PASS" if response.status_code == 200 else "WARN"
        log_test(name, status, f"Status: {response.status_code}")
    except Exception as e:
        log_test(name, "FAIL", str(e))

# ============================================================================
# SECTION 3: Testing Available Trains
# ============================================================================
section(f"3. TEST WITH AVAILABLE TRAINS (Testing {min(5, len(AVAILABLE_TRAINS))} samples)")

test_trains = AVAILABLE_TRAINS[:5]  # Test first 5 available trains
available_working = []
available_failed = []

for train_num in test_trains:
    print(f"\n{Colors.BOLD}Testing Train {train_num}:{Colors.ENDC}")

    # Test direct API
    try:
        response = requests.get(f"{BASE_URL}/api/train/{train_num}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            log_test(f"Train {train_num} - API Call", "PASS", f"Retrieved in {response.elapsed.total_seconds():.2f}s")

            # Check data completeness
            required_fields = ["trainNumber", "trainName", "source", "destination"]
            missing = [f for f in required_fields if f not in data]

            if not missing:
                log_test(f"Train {train_num} - Data Completeness", "PASS", "All required fields present", data)
                available_working.append(train_num)
            else:
                log_test(f"Train {train_num} - Data Completeness", "WARN", f"Missing: {missing}", data)
        else:
            log_test(f"Train {train_num} - API Call", "FAIL", f"Status code: {response.status_code}")
            available_failed.append(train_num)
    except Exception as e:
        log_test(f"Train {train_num} - API Call", "FAIL", str(e))
        available_failed.append(train_num)

# ============================================================================
# SECTION 4: Testing Unavailable Trains (Error Handling)
# ============================================================================
section(f"4. TEST ERROR HANDLING WITH UNAVAILABLE TRAINS")

for train_num in UNAVAILABLE_TRAINS[:3]:
    print(f"\n{Colors.BOLD}Testing Train {train_num} (Should Fail):{Colors.ENDC}")

    try:
        response = requests.get(f"{BASE_URL}/api/train/{train_num}", timeout=10)

        if response.status_code == 404:
            log_test(f"Train {train_num} - Expected 404", "PASS", "Correctly returns 404 for unavailable train")
        else:
            log_test(f"Train {train_num} - Unexpected Status", "WARN", f"Got {response.status_code} instead of 404")

            # Try to parse response
            try:
                data = response.json()
                log_test(f"Train {train_num} - Error Response", "INFO", f"Response: {data}")
            except:
                pass

    except Exception as e:
        log_test(f"Train {train_num} - API Call", "FAIL", str(e))

# ============================================================================
# SECTION 5: Live Data Fetch Performance
# ============================================================================
section("5. LIVE DATA FETCH PERFORMANCE")

if available_working:
    test_train = available_working[0]

    response_times = []
    for i in range(3):
        try:
            start = time.time()
            response = requests.get(f"{BASE_URL}/api/train/{test_train}", timeout=30)
            elapsed = time.time() - start
            response_times.append(elapsed)

            log_test(f"Train {test_train} - Request {i+1}", "PASS" if response.status_code == 200 else "FAIL",
                    f"Time: {elapsed:.2f}s")
        except Exception as e:
            log_test(f"Train {test_train} - Request {i+1}", "FAIL", str(e))

    if response_times:
        avg_time = sum(response_times) / len(response_times)
        log_test("Performance - Average Response Time", "INFO", f"{avg_time:.2f}s",
                {"avg": avg_time, "min": min(response_times), "max": max(response_times)})

# ============================================================================
# SECTION 6: Cache Testing
# ============================================================================
section("6. CACHE BEHAVIOR")

if available_working:
    test_train = available_working[0]

    print(f"Testing cache effectiveness for train {test_train}:\n")

    # First request (cold cache)
    start = time.time()
    response1 = requests.get(f"{BASE_URL}/api/train/{test_train}", timeout=30)
    time1 = time.time() - start

    # Second request (should be cached)
    start = time.time()
    response2 = requests.get(f"{BASE_URL}/api/train/{test_train}", timeout=30)
    time2 = time.time() - start

    log_test("Cache - Cold Request", "PASS", f"{time1:.2f}s")
    log_test("Cache - Warm Request", "PASS", f"{time2:.2f}s")

    if time2 < time1:
        speedup = time1 / time2
        log_test("Cache - Speedup", "PASS", f"{speedup:.1f}x faster on cached request")
    else:
        log_test("Cache - No Speedup", "WARN", "Cached request not faster")

# ============================================================================
# SECTION 7: Database Inspection
# ============================================================================
section("7. DATABASE INSPECTION")

db_path = Path("c:\\Railsense\\data\\trainDatabase.json")
if db_path.exists():
    try:
        with open(db_path, 'r') as f:
            db = json.load(f)

        train_count = len(db.get("trains", {}))
        log_test("Database File", "PASS", f"Found {train_count} trains in database")

        # List available trains in DB
        db_trains = list(db.get("trains", {}).keys())[:10]
        log_test("Sample DB Trains", "INFO", f"Trains: {', '.join(db_trains)}",
                {"total": train_count, "sample": db_trains})
    except Exception as e:
        log_test("Database File", "FAIL", str(e))
else:
    log_test("Database File", "WARN", "Database file not found at expected location")

# ============================================================================
# SECTION 8: Network Issues Check
# ============================================================================
section("8. NETWORK & EXTERNAL SOURCE CHECK")

external_sources = {
    "Indian Railways Official": "https://indianrailways.gov.in/railwayboard/",
    "RailYatri": "https://www.railyatri.in/",
    "NTES": "https://ntes.indianrailways.gov.in/",
}

for name, url in external_sources.items():
    try:
        response = requests.get(url, timeout=5)
        status = "PASS" if response.status_code < 500 else "FAIL"
        log_test(f"External Source - {name}", status, f"Status: {response.status_code}")
    except requests.exceptions.Timeout:
        log_test(f"External Source - {name}", "WARN", "Timeout - Service unreachable")
    except Exception as e:
        log_test(f"External Source - {name}", "FAIL", f"Error: {str(e)[:50]}")

# ============================================================================
# SECTION 9: Comprehensive Summary & Recommendations
# ============================================================================
section("9. SUMMARY & RECOMMENDATIONS")

pass_count = sum(1 for t in results["tests"] if t["status"] == "PASS")
fail_count = sum(1 for t in results["tests"] if t["status"] == "FAIL")
warn_count = sum(1 for t in results["tests"] if t["status"] == "WARN")
total_count = len(results["tests"])

results["summary"] = {
    "total_tests": total_count,
    "passed": pass_count,
    "failed": fail_count,
    "warnings": warn_count,
    "available_trains_working": len(available_working),
    "available_trains_failed": len(available_failed),
}

print(f"\n{Colors.BOLD}Test Results:{Colors.ENDC}")
print(f"  {Colors.GREEN}[PASS] Passed: {pass_count}{Colors.ENDC}")
print(f"  {Colors.RED}[FAIL] Failed: {fail_count}{Colors.ENDC}")
print(f"  {Colors.YELLOW}[WARN] Warnings: {warn_count}{Colors.ENDC}")
print(f"  Total: {total_count}")

print(f"\n{Colors.BOLD}Train Data Availability:{Colors.ENDC}")
print(f"  {Colors.GREEN}[OK] Working: {len(available_working)}/{len(test_trains)} available trains{Colors.ENDC}")
print(f"  {Colors.RED}[FAIL] Failed: {len(available_failed)}/{len(test_trains)} available trains{Colors.ENDC}")

print(f"\n{Colors.BOLD}Recommendations:{Colors.ENDC}")

if fail_count > pass_count:
    print(f"  {Colors.RED}[CRITICAL] Backend has more failures than passes!{Colors.ENDC}")
    print(f"    -> Check API server health")
    print(f"    -> Verify database connectivity")
    print(f"    -> Check external data source access")
else:
    print(f"  {Colors.GREEN}[OK] Backend appears functional{Colors.ENDC}")

if len(available_working) == 0:
    print(f"  {Colors.RED}[CRITICAL] Cannot fetch ANY train data!{Colors.ENDC}")
    print(f"    -> Scraper is failing")
    print(f"    -> Database queries returning empty")
    print(f"    -> Check train number format")
else:
    print(f"  {Colors.GREEN}[OK] Can fetch some train data{Colors.ENDC}")

if fail_count > 0:
    print(f"\n{Colors.BOLD}Failed Tests:{Colors.ENDC}")
    for test in results["tests"]:
        if test["status"] == "FAIL":
            print(f"  {Colors.RED}[FAIL] {test['name']}{Colors.ENDC}: {test['details']}")

# ============================================================================
# Save Results
# ============================================================================
results_file = Path("c:\\Railsense\\debug_results.json")
try:
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n{Colors.GREEN}✓ Results saved to {results_file}{Colors.ENDC}")
except Exception as e:
    print(f"\n{Colors.RED}✗ Failed to save results: {e}{Colors.ENDC}")

print(f"\n{Colors.BOLD}{Colors.CYAN}Debug session complete!{Colors.ENDC}\n")

#!/bin/bash

# RailSense NTES Integration Testing Script
# Quick commands to test the data collection system
# Usage: bash test-ntes-integration.sh

BASE_URL="http://localhost:3000"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== RailSense NTES Integration Test Suite ===${NC}\n"

# Test 1: Database Health Check
echo -e "${YELLOW}TEST 1: Database Health Check${NC}"
echo "Command: GET /api/system/db-health"
curl -s "$BASE_URL/api/system/db-health" | jq '.' 2>/dev/null || \
  echo -e "${RED}Error: Could not connect to server or parse response${NC}"
sleep 2

# Test 2: Collect Train Status for Train 12955
echo -e "\n${YELLOW}TEST 2: Collect Train Status (Train 12955)${NC}"
echo "Command: POST /api/data-collection/ntes/train-status"
curl -s -X POST "$BASE_URL/api/data-collection/ntes/train-status" \
  -H "Content-Type: application/json" \
  -d '{"trainNumber": "12955"}' | jq '.' 2>/dev/null || \
  echo -e "${RED}Error: Collection failed${NC}"
sleep 2

# Test 3: Collect Train Status for Train 13345
echo -e "\n${YELLOW}TEST 3: Collect Train Status (Train 13345)${NC}"
curl -s -X POST "$BASE_URL/api/data-collection/ntes/train-status" \
  -H "Content-Type: application/json" \
  -d '{"trainNumber": "13345"}' | jq '.' 2>/dev/null
sleep 2

# Test 4: Collect Train Route
echo -e "\n${YELLOW}TEST 4: Collect Train Route (Train 12955)${NC}"
echo "Command: POST /api/data-collection/ntes/train-routes"
curl -s -X POST "$BASE_URL/api/data-collection/ntes/train-routes" \
  -H "Content-Type: application/json" \
  -d '{"trainNumber": "12955"}' | jq '.' 2>/dev/null || \
  echo -e "${RED}Error: Route collection failed${NC}"
sleep 2

# Test 5: Collect Station Board
echo -e "\n${YELLOW}TEST 5: Collect Station Board (Virar - VR)${NC}"
echo "Command: POST /api/data-collection/ntes/station-boards"
curl -s -X POST "$BASE_URL/api/data-collection/ntes/station-boards" \
  -H "Content-Type: application/json" \
  -d '{"stationCode": "VR"}' | jq '.' 2>/dev/null || \
  echo -e "${RED}Error: Station board collection failed${NC}"
sleep 2

# Test 6: Check Collection Progress
echo -e "\n${YELLOW}TEST 6: Check Collection Progress${NC}"
echo "Command: GET /api/data-collection/ntes/status"
curl -s "$BASE_URL/api/data-collection/ntes/status" | jq '.' 2>/dev/null || \
  echo -e "${RED}Error: Status check failed${NC}"

echo -e "\n${GREEN}=== Tests Complete ===${NC}\n"
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify all responses show success: true"
echo "2. Check /api/data-collection/ntes/status for record counts"
echo "3. For more trains, modify TEST 3 with different trainNumbers"
echo "4. For more stations, modify TEST 5 with different stationCodes"
echo ""
echo -e "${YELLOW}Station Codes Available:${NC}"
echo "  MMCT - Mumbai Central"
echo "  VR   - Virar"
echo "  VST  - Vasai Road"
echo "  NG   - Nagpur Junction"
echo "  NDLS - New Delhi"
echo "  JBP  - Jhansi"
echo "  BPL  - Bhopal"
echo "  SBC  - Bangalore"

@echo off
REM RailSense NTES Integration Testing Script (Windows)
REM Quick commands to test the data collection system
REM Usage: test-ntes-integration.bat

set BASE_URL=http://localhost:3000
setlocal enabledelayedexpansion

echo ======================================
echo RailSense NTES Integration Test Suite
echo ======================================
echo.

REM Test 1: Database Health Check
echo [TEST 1] Database Health Check
echo Command: GET /api/system/db-health
curl -s "%BASE_URL%/api/system/db-health" | find /v "" >nul && (
  curl -s "%BASE_URL%/api/system/db-health" | powershell -Command "ConvertFrom-Json | ConvertTo-Json -Depth 10"
) || (
  echo Error: Could not connect to server
)
echo.
timeout /t 2 /nobreak >nul

REM Test 2: Collect Train Status (Train 12955)
echo [TEST 2] Collect Train Status (Train 12955)
echo Command: POST /api/data-collection/ntes/train-status
curl -s -X POST "%BASE_URL%/api/data-collection/ntes/train-status" ^
  -H "Content-Type: application/json" ^
  -d "{\"trainNumber\": \"12955\"}" | powershell -Command "ConvertFrom-Json | ConvertTo-Json -Depth 10"
echo.
timeout /t 2 /nobreak >nul

REM Test 3: Collect Train Status (Train 13345)
echo [TEST 3] Collect Train Status (Train 13345)
curl -s -X POST "%BASE_URL%/api/data-collection/ntes/train-status" ^
  -H "Content-Type: application/json" ^
  -d "{\"trainNumber\": \"13345\"}" | powershell -Command "ConvertFrom-Json | ConvertTo-Json -Depth 10"
echo.
timeout /t 2 /nobreak >nul

REM Test 4: Collect Train Route
echo [TEST 4] Collect Train Route (Train 12955)
echo Command: POST /api/data-collection/ntes/train-routes
curl -s -X POST "%BASE_URL%/api/data-collection/ntes/train-routes" ^
  -H "Content-Type: application/json" ^
  -d "{\"trainNumber\": \"12955\"}" | powershell -Command "ConvertFrom-Json | ConvertTo-Json -Depth 10"
echo.
timeout /t 2 /nobreak >nul

REM Test 5: Collect Station Board
echo [TEST 5] Collect Station Board (Virar - VR)
echo Command: POST /api/data-collection/ntes/station-boards
curl -s -X POST "%BASE_URL%/api/data-collection/ntes/station-boards" ^
  -H "Content-Type: application/json" ^
  -d "{\"stationCode\": \"VR\"}" | powershell -Command "ConvertFrom-Json | ConvertTo-Json -Depth 10"
echo.
timeout /t 2 /nobreak >nul

REM Test 6: Check Collection Progress
echo [TEST 6] Check Collection Progress
echo Command: GET /api/data-collection/ntes/status
curl -s "%BASE_URL%/api/data-collection/ntes/status" | powershell -Command "ConvertFrom-Json | ConvertTo-Json -Depth 10"
echo.

echo ======================================
echo Tests Complete
echo ======================================
echo.
echo Next Steps:
echo 1. Verify all responses show "success": true
echo 2. Check /api/data-collection/ntes/status for record counts
echo 3. For more trains, modify the curl commands with different trainNumbers
echo 4. For more stations, modify the station-boards test with different stationCodes
echo.
echo Station Codes Available:
echo   MMCT - Mumbai Central
echo   VR   - Virar
echo   VST  - Vasai Road
echo   NG   - Nagpur Junction
echo   NDLS - New Delhi
echo   JBP  - Jhansi
echo   BPL  - Bhopal
echo   SBC  - Bangalore
echo.
pause

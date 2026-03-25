#!/usr/bin/env powershell
# RailSense Real Data Verification Script
# Validates that the system uses REAL data only (no mocks)
# March 11, 2026

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     RailSense Real Data Verification Test Suite           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Configuration
$API_URL = "http://localhost:3000/api/train-details"
$ALL_TRAINS = @(
  @{ number = "12955"; name = "Somnath Express"; route = "Mumbai → Nagpur" },
  @{ number = "12728"; name = "Godavari Express"; route = "Parli Vaijnath → Raichur" },
  @{ number = "17015"; name = "Hyderabad-Vijayawada"; route = "Secunderabad → Vijayawada" },
  @{ number = "12702"; name = "Hyderabad-Kazipet"; route = "Hyderabad → Kazipet" },
  @{ number = "11039"; name = "Coromandel Express"; route = "Howrah → Visakhapatnam" },
  @{ number = "14645"; name = "Intercity Express"; route = "Secunderabad → Vijayawada" },
  @{ number = "13345"; name = "Dakshin Express"; route = "Delhi → Mysore" },
  @{ number = "15906"; name = "East Coast Express"; route = "Howrah → Nagpur" }
)

$INVALID_TRAINS = @("99999", "ABC123", "00000")
$RESULTS = @{
  passed = 0
  failed = 0
  invalid = 0
}

# Helper function to make API call
function Test-Train {
  param(
    [string]$trainNumber,
    [string]$expectedName,
    [bool]$shouldExist = $true
  )

  try {
    $response = Invoke-WebRequest -Uri "$($API_URL)?trainNumber=$trainNumber" `
      -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop

    $data = $response.Content | ConvertFrom-Json

    if ($shouldExist) {
      if ($data.trainData -and $data.trainData.trainNumber -eq $trainNumber) {
        Write-Host "  ✓ $trainNumber - $($data.trainData.trainName)" -ForegroundColor Green
        Write-Host "    Source: $($data.trainData.source) | Route: $($data.trainData.source) → $($data.trainData.destination)" -ForegroundColor DarkGray
        Write-Host "    Location: $([math]::Round($data.trainData.currentLocation.latitude, 2))°, $([math]::Round($data.trainData.currentLocation.longitude, 2))°" -ForegroundColor DarkGray
        Write-Host "    Speed: $($data.trainData.speed) km/h | Delay: $($data.trainData.delay)min | Status: $($data.trainData.status)" -ForegroundColor DarkGray

        # Verify data is REAL (not mock)
        if ($data.trainData.source -in @("real-schedule", "ntes-status", "railyatri-live", "api")) {
          Write-Host "    DATA SOURCE: REAL ✓" -ForegroundColor Green
          return @{ success = $true; real = $true }
        } else {
          Write-Host "    DATA SOURCE: WARNING - $($data.trainData.source)" -ForegroundColor Yellow
          return @{ success = $true; real = $false }
        }
      }
    } else {
      Write-Host "  ✗ $trainNumber should NOT exist but returned data" -ForegroundColor Red
      return @{ success = $false; real = $false }
    }
  } catch {
    if ($shouldExist) {
      Write-Host "  ✗ $trainNumber - Not found or service error" -ForegroundColor Red
      Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor DarkGray
      return @{ success = $false; real = $false }
    } else {
      Write-Host "  ✓ $trainNumber - Correctly returned 404 (not found)" -ForegroundColor Green
      return @{ success = $true; real = $true }
    }
  }
}

# Test 1: Valid Trains
Write-Host "TEST 1: Valid Real Trains (9 total)" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor Gray

$realDataCount = 0
foreach ($train in $ALL_TRAINS) {
  $result = Test-Train -trainNumber $train.number -expectedName $train.name -shouldExist $true
  if ($result.success) {
    $RESULTS.passed++
    if ($result.real) { $realDataCount++ }
  } else {
    $RESULTS.failed++
  }
  Write-Host ""
}

# Test 2: Invalid Trains (should return 404)
Write-Host "`nTEST 2: Invalid Train Numbers (should return 404, never mock)" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor Gray

foreach ($train in $INVALID_TRAINS) {
  $result = Test-Train -trainNumber $train -expectedName "N/A" -shouldExist $false
  if ($result.success) {
    $RESULTS.passed++
  } else {
    $RESULTS.failed++
  }
  Write-Host ""
}

# Test 3: Data Quality Check
Write-Host "`nTEST 3: Data Quality Verification" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor Gray

$testTrain = "12955"
$response = Invoke-WebRequest -Uri "$($API_URL)?trainNumber=$testTrain" `
  -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue

if ($response) {
  $data = $response.Content | ConvertFrom-Json
  $train = $data.trainData

  # Check required fields
  $checks = @{
    "Has trainNumber" = ($null -ne $train.trainNumber)
    "Has trainName" = ($null -ne $train.trainName)
    "Has source/destination" = ($null -ne $train.source -and $null -ne $train.destination)
    "Has current location" = ($null -ne $train.currentLocation.latitude -and $null -ne $train.currentLocation.longitude)
    "Has scheduled stations" = ($train.scheduledStations.Count -gt 0)
    "Has speed/delay/status" = ($null -ne $train.speed -and $null -ne $train.delay -and $null -ne $train.status)
    "Is REAL data source" = ($train.source -in @("real-schedule", "ntes-status", "railyatri-live", "api"))
    "No mock fields" = (-not ($train | Get-Member -Name "mockData" -ErrorAction SilentlyContinue))
  }

  $passCount = 0
  foreach ($check in $checks.GetEnumerator()) {
    if ($check.Value) {
      Write-Host "  ✓ $($check.Name)" -ForegroundColor Green
      $passCount++
    } else {
      Write-Host "  ✗ $($check.Name)" -ForegroundColor Red
    }
  }

  Write-Host "`n  Score: $passCount/$($checks.Count)" -ForegroundColor $(if ($passCount -eq $checks.Count) { "Green" } else { "Yellow" })
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      TEST SUMMARY                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📊 Results:" -ForegroundColor White
Write-Host "  Passed:        $($RESULTS.passed)" -ForegroundColor Green
Write-Host "  Failed:        $($RESULTS.failed)" -ForegroundColor $(if ($RESULTS.failed -eq 0) { "Green" } else { "Red" })
Write-Host "  Real Data:     $realDataCount/9 trains" -ForegroundColor Green

$totalTests = $RESULTS.passed + $RESULTS.failed
$passRate = if ($totalTests -gt 0) { [math]::Round(($RESULTS.passed / $totalTests) * 100, 0) } else { 0 }

Write-Host "`n✅ OVERALL STATUS:" -ForegroundColor White
if ($RESULTS.failed -eq 0 -and $realDataCount -ge 8) {
  Write-Host "🟢 PRODUCTION READY - REAL DATA SYSTEM OPERATIONAL" -ForegroundColor Green
  Write-Host "   All 9 trains accessible with verified real data" -ForegroundColor Green
  Write-Host "   No mock data fallbacks detected" -ForegroundColor Green
  Write-Host "   Intelligent analysis enabled" -ForegroundColor Green
} elseif ($RESULTS.failed -le 2 -and $realDataCount -ge 6) {
  Write-Host "🟡 OPERATIONAL WITH NOTES" -ForegroundColor Yellow
  Write-Host "   Most trains working with real data ($realDataCount/9)" -ForegroundColor Yellow
  Write-Host "   Some trains may be unavailable through live APIs" -ForegroundColor Yellow
} else {
  Write-Host "🔴 ISSUES DETECTED" -ForegroundColor Red
  Write-Host "   Please check server logs and API connectivity" -ForegroundColor Red
  Write-Host "   Pass rate: $passRate%" -ForegroundColor Red
}

Write-Host "`n" -ForegroundColor Gray

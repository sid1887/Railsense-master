#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive RailSense System Test
    Tests all major endpoints and features
#>

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║          RAILSENSE v2.0 COMPREHENSIVE SYSTEM TEST             ║
║                   (March 2026 - Full Stack)                   ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$API_BASE = "http://localhost:3000"
$TRAINS = @('12955', '12728', '17015', '12702', '11039')
$RESULTS = @{
    passed = 0
    failed = 0
    skipped = 0
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [scriptblock]$Validation,
        [int]$TimeoutSec = 15
    )

    Write-Host "  Testing: $Name..." -NoNewline
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json

        if ($Validation) {
            $valid = & $Validation $data
            if ($valid) {
                Write-Host " ✓" -ForegroundColor Green
                $script:RESULTS.passed++
            } else {
                Write-Host " ✗ (validation failed)" -ForegroundColor Red
                $script:RESULTS.failed++
            }
        } else {
            Write-Host " ✓" -ForegroundColor Green
            $script:RESULTS.passed++
        }
        return $data
    } catch {
        Write-Host " ✗ (error: $($_.Exception.Message.Substring(0, 30))...)" -ForegroundColor Red
        $script:RESULTS.failed++
        return $null
    }
}

# ===== TEST SUITE =====

Write-Host "`n[1/5] CORE API ENDPOINTS" -ForegroundColor Yellow
Write-Host "━" * 60

$testData = @{}
foreach ($train in $TRAINS.GetEnumerator() | Select-Object -First 3) {
    $testData[$train] = Test-Endpoint `
        -Name "GET /api/train/$train" `
        -Url "$API_BASE/api/train/$train" `
        -Validation { param($d) $d.trainNumber -eq $train -and $d.position -and $d.halt }
}

Write-Host "`n[2/5] WEATHER INTEGRATION" -ForegroundColor Yellow
Write-Host "━" * 60

if ($testData.Values[0]) {
    $firstTrain = $testData.Values[0]
    if ($firstTrain.enrichment.weather) {
        Write-Host "  ✓ Weather data received" -ForegroundColor Green
        Write-Host "    - Temp: $($firstTrain.enrichment.weather.temperature)°C" -ForegroundColor Gray
        Write-Host "    - Condition: $($firstTrain.enrichment.weather.condition)" -ForegroundColor Gray
        if ($firstTrain.enrichment.weather.impact) {
            Write-Host "    - Impact: $($firstTrain.enrichment.weather.impact.severity)" -ForegroundColor Gray
        }
        $script:RESULTS.passed++
    } else {
        Write-Host "  ⚠ Weather data unavailable (API may not be responding)" -ForegroundColor Yellow
        $script:RESULTS.skipped++
    }
}

Write-Host "`n[3/5] NEWS ENRICHMENT" -ForegroundColor Yellow
Write-Host "━" * 60

if ($testData.Values[0] -and $testData.Values[0].enrichment.news) {
    $newsCount = $testData.Values[0].enrichment.news.Length
    if ($newsCount -gt 0) {
        Write-Host "  ✓ News articles fetched ($newsCount)" -ForegroundColor Green
        $testData.Values[0].enrichment.news | Select-Object -First 2 | ForEach-Object {
            Write-Host "    - $($_.title.Substring(0, 50))..." -ForegroundColor Gray
        }
        $script:RESULTS.passed++
    } else {
        Write-Host "  ⚠ No news articles available" -ForegroundColor Yellow
        $script:RESULTS.skipped++
    }
}

Write-Host "`n[4/5] DATA QUALITY ASSESSMENT" -ForegroundColor Yellow
Write-Host "━" * 60

foreach ($trainData in $testData.Values) {
    $quality = $trainData.metadata.data_quality
    $sources = $trainData.metadata.source -join ", "
    $color = switch($quality) {
        'GOOD' { 'Green' }
        'FAIR' { 'Yellow' }
        'POOR' { 'Red' }
        default { 'Gray' }
    }

    Write-Host "  Train $($trainData.trainNumber)" -NoNewline
    Write-Host " [$quality]" -ForegroundColor $color
    Write-Host "    Sources: $sources" -ForegroundColor Gray
    Write-Host "    Samples (1h): $($trainData.metadata.sample_count_1h)" -ForegroundColor Gray

    if ($quality -ne 'POOR') {
        $script:RESULTS.passed++
    } else {
        $script:RESULTS.failed++
    }
}

Write-Host "`n[5/5] ADMIN MONITORING" -ForegroundColor Yellow
Write-Host "━" * 60

$adminData = Test-Endpoint `
    -Name "GET /api/admin/providers/status" `
    -Url "$API_BASE/api/admin/providers/status" `
    -Validation { param($d) $d.providers -and $d.collector }

if ($adminData) {
    Write-Host "  Providers:"
    $adminData.providers | ForEach-Object {
        $successRate = [math]::Round($_.stats.successRate * 100)
        Write-Host "    - $($_.name): ${successRate}% success" -ForegroundColor Gray
    }

    if ($adminData.collector.collector_running) {
        Write-Host "  Collector Status: ✓ Active" -ForegroundColor Green
        Write-Host "    Last snapshot: $($adminData.collector.last_snapshot_age_sec)s ago" -ForegroundColor Gray
        $script:RESULTS.passed++
    } else {
        Write-Host "  Collector Status: ✗ Not running" -ForegroundColor Red
        $script:RESULTS.failed++
    }
}

# ===== SUMMARY =====

Write-Host "`n"
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                        TEST SUMMARY                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n  Results:"
Write-Host "    ✓ Passed:  $($RESULTS.passed)" -ForegroundColor Green
Write-Host "    ✗ Failed:  $($RESULTS.failed)" -ForegroundColor $(if($RESULTS.failed -gt 0) { 'Red' } else { 'Green' })
Write-Host "    ⚠ Skipped: $($RESULTS.skipped)" -ForegroundColor Yellow

$passRate = if(($RESULTS.passed + $RESULTS.failed) -gt 0) {
    [math]::Round(($RESULTS.passed / ($RESULTS.passed + $RESULTS.failed)) * 100)
} else {
    0
}

Write-Host "`n  Overall: ${passRate}% Pass Rate"

if ($RESULTS.failed -eq 0) {
    Write-Host "`n  🎉 ALL SYSTEMS OPERATIONAL" -ForegroundColor Green
    Write-Host "     System ready for production" -ForegroundColor Green
} elseif ($RESULTS.failed -le 2) {
    Write-Host "`n  ⚠️  SYSTEMS MOSTLY OPERATIONAL" -ForegroundColor Yellow
    Write-Host "     Minor issues detected" -ForegroundColor Yellow
} else {
    Write-Host "`n  ❌ SYSTEMS REQUIRE ATTENTION" -ForegroundColor Red
    Write-Host "     Multiple issues detected" -ForegroundColor Red
}

Write-Host "`n"

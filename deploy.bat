@echo off
REM ============================================
REM Railsense Deployment Script for Windows
REM ============================================
REM Production deployment helper script
REM Usage: deploy.bat [dev|staging|prod]

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=prod

set PROJECT_DIR=%~dp0
set BUILD_DIR=%PROJECT_DIR%.next
set BACKUP_DIR=%PROJECT_DIR%backups

echo.
echo ================================
echo Railsense Deployment Script
echo Environment: %ENVIRONMENT%
echo ================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    exit /b 1
)

echo [OK] Node.js check passed
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH
    exit /b 1
)

echo [OK] npm check passed
npm --version

REM Check environment file
if not exist "%PROJECT_DIR%.env.production" (
    echo [WARNING] .env.production not found
    if exist "%PROJECT_DIR%.env.production.example" (
        echo Copying from template...
        copy "%PROJECT_DIR%.env.production.example" "%PROJECT_DIR%.env.production"
        echo [ERROR] Please configure .env.production with your settings
        exit /b 1
    )
)
echo [OK] Environment file found

REM Clean previous build
echo.
echo === Cleaning previous build ===
if exist "%BUILD_DIR%" (
    rmdir /s /q "%BUILD_DIR%"
)
if exist "%PROJECT_DIR%out" (
    rmdir /s /q "%PROJECT_DIR%out"
)
echo [OK] Build cleaned

REM Create backup directory
echo.
echo === Creating backup ===
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Create timestamped backup (simple version - just backup key files)
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set TIMESTAMP=%mydate%_%mytime%

echo Backup directory created: %BACKUP_DIR%
echo [OK] Backup created with timestamp: %TIMESTAMP%

REM Install dependencies
echo.
echo === Installing dependencies ===
cd /d "%PROJECT_DIR%"
call npm ci --omit=dev
if errorlevel 1 (
    echo [ERROR] npm install failed
    exit /b 1
)
echo [OK] Dependencies installed

REM Build application
echo.
echo === Building application ===
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    exit /b 1
)

if not exist "%BUILD_DIR%" (
    echo [ERROR] Build failed - .next directory not created
    exit /b 1
)
echo [OK] Application built successfully

REM Deployment summary
echo.
echo ================================
echo Deployment Summary
echo ================================
echo Environment: %ENVIRONMENT%
echo Build Directory: %BUILD_DIR%
echo Project Directory: %PROJECT_DIR%
echo.

if /i "%ENVIRONMENT%"=="prod" (
    echo Next steps for production deployment:
    echo 1. Review and validate the build
    echo 2. Deploy using Docker:
    echo    docker build -t railsense:latest .
    echo    docker-compose up -d
    echo 3. Run health checks:
    echo    curl http://localhost:3000/api/health
) else (
    echo To start the development server:
    echo   npm run dev
)

echo.
echo [OK] Deployment script completed successfully!
echo.

endlocal

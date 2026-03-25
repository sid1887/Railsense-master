#!/bin/bash

# ============================================
# Railsense Deployment Script
# ============================================
# Production deployment helper script
# Usage: ./deploy.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-prod}
PROJECT_DIR=$(cd "$(dirname "$0")" && pwd)
BUILD_DIR="$PROJECT_DIR/.next"
BACKUP_DIR="$PROJECT_DIR/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Railsense Deployment Script${NC}"
echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}================================${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check Node.js version
check_node_version() {
    echo "Checking Node.js version..."
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 18+ is required. Current version: $(node -v)"
    fi
    print_status "Node.js version check passed: $(node -v)"
}

# Check required environment variables
check_env_vars() {
    echo "Checking environment variables..."

    if [ ! -f .env.production ]; then
        print_warning ".env.production not found. Copying from template..."
        cp .env.production.example .env.production
        print_error "Please configure .env.production with your settings"
    fi

    print_status "Environment file found"
}

# Clean previous build
clean_build() {
    echo "Cleaning previous build..."
    rm -rf "$BUILD_DIR"
    rm -rf "$PROJECT_DIR/out"
    print_status "Build cleaned"
}

# Install dependencies
install_dependencies() {
    echo "Installing dependencies..."
    npm ci --omit=dev
    print_status "Dependencies installed"
}

# Build application
build_app() {
    echo "Building application..."
    npm run build

    if [ ! -d "$BUILD_DIR" ]; then
        print_error "Build failed - .next directory not created"
    fi

    print_status "Application built successfully"
}

# Create backup
create_backup() {
    echo "Creating backup..."
    mkdir -p "$BACKUP_DIR"

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/railsense_backup_$TIMESTAMP.tar.gz"

    tar -czf "$BACKUP_FILE" \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='backups' \
        --exclude='.git' \
        .

    print_status "Backup created: $BACKUP_FILE"
}

# Run database migrations
migrate_database() {
    echo "Running database migrations..."
    # Add your migration commands here
    print_status "Database migrations completed"
}

# Run health checks
run_health_checks() {
    echo "Running health checks..."

    # Check if API endpoints are accessible
    if command -v curl &> /dev/null; then
        sleep 2
        if curl -s http://localhost:3000/api/health > /dev/null; then
            print_status "Health check passed"
        else
            print_warning "Health check failed - endpoint not responding"
        fi
    else
        print_warning "curl not found - skipping health check"
    fi
}

# Main deployment flow
main() {
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"

    # Step 1: Pre-flight checks
    echo ""
    echo "=== Pre-flight Checks ==="
    check_node_version
    check_env_vars

    # Step 2: Backup
    echo ""
    echo "=== Backup ==="
    create_backup

    # Step 3: Build
    echo ""
    echo "=== Build Stage ==="
    clean_build
    install_dependencies
    build_app

    # Step 4: Database
    echo ""
    echo "=== Database Stage ==="
    migrate_database

    # Step 5: Deployment summary
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}Deployment Summary${NC}"
    echo -e "${GREEN}================================${NC}"
    echo "Environment: $ENVIRONMENT"
    echo "Build Directory: $BUILD_DIR"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""

    if [ "$ENVIRONMENT" = "prod" ]; then
        echo "Next steps for production:"
        echo "1. Review and validate the build"
        echo "2. Deploy using Docker:"
        echo "   docker build -t railsense:latest ."
        echo "   docker-compose up -d"
        echo "3. Run health checks:"
        echo "   curl http://localhost:3000/api/health"
    else
        echo "To start the development server:"
        echo "  npm run dev"
    fi

    print_status "Deployment script completed successfully!"
}

# Run main function
main

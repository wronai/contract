#!/bin/bash
# Test a single example
# Usage: ./test-example.sh <example-name>

set -e

EXAMPLE=${1:-"b2b-risk-monitoring"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLE_DIR="$PROJECT_ROOT/examples/$EXAMPLE"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

echo "Testing example: $EXAMPLE"
echo "Directory: $EXAMPLE_DIR"

if [ ! -d "$EXAMPLE_DIR" ]; then
    log_error "Example directory not found: $EXAMPLE_DIR"
    exit 1
fi

cd "$EXAMPLE_DIR"

# Check for docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    log_error "No docker-compose.yml found"
    exit 1
fi

# Start services
log_info "Starting services..."
docker compose up -d --build 2>&1

# Wait for startup
log_info "Waiting for services to start..."
sleep 15

# Show container status
docker compose ps

# Show logs
log_info "Recent logs:"
docker compose logs --tail=30 2>&1 | tail -50

# Cleanup
log_info "Stopping services..."
docker compose down

log_success "Test completed for $EXAMPLE"

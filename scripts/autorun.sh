#!/bin/bash

# ============================================================================
# Reclapp Auto-Runner
# Handles startup, testing, and auto-healing of Docker services
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TARGET_UP=$1
TARGET_DOWN=$2
TARGET_HEALTH=$3
SERVICE_NAME=$4

if [ -z "$TARGET_UP" ] || [ -z "$TARGET_DOWN" ] || [ -z "$TARGET_HEALTH" ]; then
    echo -e "${RED}Usage: $0 <make-target-up> <make-target-down> <make-target-health> [service-name]${NC}"
    exit 1
fi

SERVICE_NAME=${SERVICE_NAME:-"Service"}

log() {
    echo -e "${BLUE}[AutoRunner] $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

# 1. Attempt initial startup
log "Starting $SERVICE_NAME ($TARGET_UP)..."
if make $TARGET_UP; then
    success "$SERVICE_NAME started successfully."
else
    warn "First attempt to start $SERVICE_NAME failed."
    FAIL_REASON="startup"
fi

# 2. Check health if startup "seemed" successful (make exit code 0)
if [ -z "$FAIL_REASON" ]; then
    log "Verifying health ($TARGET_HEALTH)..."
    if make $TARGET_HEALTH; then
        success "$SERVICE_NAME is healthy and running!"
        exit 0
    else
        warn "Health check failed."
        FAIL_REASON="health"
    fi
fi

# 3. Auto-healing procedure
log "Initiating auto-healing procedure for $SERVICE_NAME..."

# Step 3a: Stop services
log "Stopping services ($TARGET_DOWN)..."
make $TARGET_DOWN

# Step 3b: Aggressive cleanup (optional port clearing could go here if Makefile didn't handle it)
# The Makefile's stop-dev / stop targets usually handle pkill, but let's be sure we wait a bit.
log "Waiting for resources to release..."
sleep 5

# Step 3c: Retry startup
log "Retrying startup ($TARGET_UP)..."
if make $TARGET_UP; then
    log "Startup retry successful. Checking health..."
    sleep 5 # Give it a moment to stabilize
    
    if make $TARGET_HEALTH; then
        success "Auto-healing successful! $SERVICE_NAME is running."
        exit 0
    else
        error "Health check failed after auto-healing."
        log "Showing logs..."
        # Heuristic: try to guess logs target from down target name or just generic
        # If TARGET_DOWN is example-b2b-down, logs is example-b2b-logs
        LOGS_TARGET=${TARGET_DOWN/-down/-logs}
        if grep -q "$LOGS_TARGET:" Makefile; then
             make $LOGS_TARGET & 
             PID=$!
             sleep 5
             kill $PID
        fi
        exit 1
    fi
else
    error "Startup failed after auto-healing."
    log "Checking for blocking processes..."
    make docker-check-ports || true
    exit 1
fi

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
PORT_PREFIXES=$5

if [ -z "$TARGET_UP" ] || [ -z "$TARGET_DOWN" ] || [ -z "$TARGET_HEALTH" ]; then
    echo -e "${RED}Usage: $0 <make-target-up> <make-target-down> <make-target-health> [service-name] [port-prefixes]${NC}"
    exit 1
fi

SERVICE_NAME=${SERVICE_NAME:-"Service"}

log() {
    echo -e "${BLUE}[AutoRunner] $1${NC}"
}

# ... (colors/logging functions omitted for brevity if unchanged, but context requires them)
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

# Construct portenv command with prefixes if provided
PORTENV_CMD="./scripts/portenv.py"
if [ -n "$PORT_PREFIXES" ]; then
    # Split comma-separated prefixes and add --prefix flag for each
    IFS=',' read -ra ADDR <<< "$PORT_PREFIXES"
    for prefix in "${ADDR[@]}"; do
        PORTENV_CMD="$PORTENV_CMD --prefix $prefix"
    done
fi

# 1. Pre-flight checks
log "Running pre-flight diagnostics..."
PORT_CHECK_CMD=""
if [ -f scripts/portenv.py ]; then
    PORT_CHECK_CMD="$PORTENV_CMD --mode free"
else
    PORT_CHECK_CMD="make docker-check-ports"
fi

if ! $PORT_CHECK_CMD; then
    warn "Port conflict detected. Initiating cleanup..."
    make $TARGET_DOWN
    log "Waiting for ports to clear..."
    sleep 5
    
    if ! $PORT_CHECK_CMD; then
        error "Ports are still blocked after cleanup. Manual intervention required."
        exit 1
    else
        success "Ports cleared. Proceeding..."
    fi
fi

# 2. Attempt initial startup
log "Starting $SERVICE_NAME ($TARGET_UP)..."
if make $TARGET_UP; then
    success "$SERVICE_NAME started successfully."
else
    warn "First attempt to start $SERVICE_NAME failed."
    FAIL_REASON="startup"
fi

# 3. Post-start verification and monitoring
if [ -z "$FAIL_REASON" ]; then
    log "Verifying health and ports..."
    
    # Check if ports are listening (using python script if available)
    if [ -f scripts/portenv.py ]; then
        log "Verifying ports are listening..."
        # We don't exit here if it fails, we let monitor check health, 
        # but it's good diagnostic info
        $PORTENV_CMD --mode used || warn "Some expected ports are not listening yet."
    fi

    # Run periodic monitor (health check loop)
    log "Starting periodic health monitor ($TARGET_HEALTH)..."
    if ./scripts/monitor.sh "$TARGET_HEALTH"; then
        success "$SERVICE_NAME is fully healthy and running!"
        exit 0
    else
        warn "Health monitor timed out."
        FAIL_REASON="health"
    fi
fi

# 4. Auto-healing procedure (if startup or health failed)
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

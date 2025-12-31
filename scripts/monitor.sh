#!/bin/bash

# ============================================================================
# Reclapp Service Monitor
# Checks service health periodically after startup
# ============================================================================

INTERVAL=5
TIMEOUT=30
ELAPSED=0
HEALTH_TARGET=$1

if [ -z "$HEALTH_TARGET" ]; then
    echo "Usage: $0 <health-check-target>"
    exit 1
fi

echo "Starting monitoring loop for target: $HEALTH_TARGET"
echo "Interval: ${INTERVAL}s, Timeout: ${TIMEOUT}s"

while [ $ELAPSED -lt $TIMEOUT ]; do
    echo "[Monitor] Checking health (${ELAPSED}s elapsed)..."
    
    if make $HEALTH_TARGET >/dev/null 2>&1; then
        echo "✓ Services are HEALTHY"
        exit 0
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo "✗ Timeout reached! Services did not become healthy within ${TIMEOUT}s."
exit 1

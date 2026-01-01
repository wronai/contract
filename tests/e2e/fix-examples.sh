#!/bin/bash
# Fix script for known issues in examples
# Run this before E2E tests to ensure all examples work correctly

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[FIXED]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "═══════════════════════════════════════════════════════════════"
echo "  RECLAPP Example Fixer"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Fix 1: IoT Monitoring - Mosquitto config
fix_iot_mosquitto() {
    local mosquitto_conf="$PROJECT_ROOT/examples/iot-monitoring/mosquitto/mosquitto.conf"
    local mosquitto_dir="$PROJECT_ROOT/examples/iot-monitoring/mosquitto"
    
    log_info "Fixing IoT Monitoring mosquitto config..."
    
    # Check if we need to fix ownership (from container)
    if [ -f "$mosquitto_conf" ]; then
        local owner=$(stat -c '%u' "$mosquitto_conf" 2>/dev/null || echo "unknown")
        if [ "$owner" = "1883" ]; then
            log_info "Mosquitto config owned by container user, attempting fix..."
            if sudo chown -R $USER:$USER "$mosquitto_dir" 2>/dev/null; then
                log_success "Fixed mosquitto directory ownership"
            else
                log_error "Cannot fix ownership - run: sudo chown -R \$USER:\$USER $mosquitto_dir"
                return 1
            fi
        fi
    fi
    
    # Write correct config
    cat > "$mosquitto_conf" << 'MOSQUITTO_EOF'
# Mosquitto MQTT Broker Configuration
# Reclapp IoT Monitoring Example

persistence true
persistence_location /mosquitto/data/

log_dest stdout
log_type all

listener 1883
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true

max_queued_messages 1000
max_inflight_messages 20
max_packet_size 1048576
retained_persistence true
MOSQUITTO_EOF
    
    log_success "IoT Monitoring mosquitto config fixed"
}

# Fix 2: Clean up any stale Docker volumes
cleanup_volumes() {
    log_info "Cleaning up stale Docker volumes..."
    
    local examples=("b2b-risk-monitoring" "iot-monitoring" "multi-agent")
    
    for example in "${examples[@]}"; do
        local example_dir="$PROJECT_ROOT/examples/$example"
        if [ -d "$example_dir" ] && [ -f "$example_dir/docker-compose.yml" ]; then
            cd "$example_dir"
            docker compose down -v 2>/dev/null || true
            cd - > /dev/null
        fi
    done
    
    log_success "Cleaned up Docker volumes"
}

# Main
main() {
    fix_iot_mosquitto || log_error "Failed to fix IoT mosquitto config"
    cleanup_volumes
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    log_success "All fixes applied. Ready for E2E tests."
    echo "═══════════════════════════════════════════════════════════════"
}

main "$@"

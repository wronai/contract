#!/bin/bash
# E2E Test Runner for All Examples
# Runs docker-compose up, checks health, runs tests, then cleans up

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
SKIPPED=0
declare -a FAILED_TESTS=()

# Configuration
TIMEOUT=${E2E_TIMEOUT:-120}
HEALTH_CHECK_INTERVAL=5
MAX_HEALTH_CHECKS=$((TIMEOUT / HEALTH_CHECK_INTERVAL))

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

print_header() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║          RECLAPP E2E TEST SUITE - All Examples                ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

# Check if port is available
check_port() {
    local port=$1
    if command -v ss &> /dev/null; then
        ss -ltn | grep -q ":${port} " && return 1 || return 0
    elif command -v lsof &> /dev/null; then
        lsof -i:${port} &> /dev/null && return 1 || return 0
    else
        return 0
    fi
}

# Wait for service to be healthy
wait_for_health() {
    local url=$1
    local name=$2
    local checks=0
    
    log_info "Waiting for $name at $url..."
    
    while [ $checks -lt $MAX_HEALTH_CHECKS ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            log_success "$name is healthy"
            return 0
        fi
        sleep $HEALTH_CHECK_INTERVAL
        checks=$((checks + 1))
        echo -n "."
    done
    
    echo ""
    log_error "$name failed to become healthy after ${TIMEOUT}s"
    return 1
}

# Run test for a single example
test_example() {
    local example_name=$1
    local example_dir=$2
    local api_port=${3:-8080}
    local frontend_port=${4:-3000}
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Testing: $example_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check if example directory exists
    if [ ! -d "$example_dir" ]; then
        log_warning "$example_name: Directory not found, skipping"
        SKIPPED=$((SKIPPED + 1))
        return 0
    fi
    
    # Check if docker-compose.yml exists
    if [ ! -f "$example_dir/docker-compose.yml" ]; then
        log_warning "$example_name: No docker-compose.yml, skipping"
        SKIPPED=$((SKIPPED + 1))
        return 0
    fi
    
    cd "$example_dir"
    
    # Check if ports are available
    if ! check_port $api_port; then
        log_error "$example_name: Port $api_port is already in use"
        FAILED=$((FAILED + 1))
        FAILED_TESTS+=("$example_name (port conflict)")
        cd - > /dev/null
        return 1
    fi
    
    # Start services
    log_info "Starting services..."
    if ! docker compose up -d --build 2>&1 | tail -5; then
        log_error "$example_name: Failed to start services"
        docker compose logs --tail=20 2>&1 || true
        docker compose down 2>&1 || true
        FAILED=$((FAILED + 1))
        FAILED_TESTS+=("$example_name (start failed)")
        cd - > /dev/null
        return 1
    fi
    
    # Wait for services
    sleep 5
    
    # Check API health
    local api_healthy=false
    if wait_for_health "http://localhost:${api_port}/health" "API"; then
        api_healthy=true
    elif wait_for_health "http://localhost:${api_port}/api/health" "API"; then
        api_healthy=true
    fi
    
    if [ "$api_healthy" = false ]; then
        log_error "$example_name: API health check failed"
        docker compose logs --tail=30 2>&1 || true
        docker compose down 2>&1 || true
        FAILED=$((FAILED + 1))
        FAILED_TESTS+=("$example_name (API unhealthy)")
        cd - > /dev/null
        return 1
    fi
    
    # Run example-specific tests
    local test_result=0
    run_example_tests "$example_name" "$api_port" "$frontend_port" || test_result=1
    
    # Cleanup
    log_info "Stopping services..."
    docker compose down 2>&1 | tail -3 || true
    
    if [ $test_result -eq 0 ]; then
        log_success "$example_name: All tests passed"
        PASSED=$((PASSED + 1))
    else
        log_error "$example_name: Tests failed"
        FAILED=$((FAILED + 1))
        FAILED_TESTS+=("$example_name")
    fi
    
    cd - > /dev/null
    return $test_result
}

# Example-specific tests
run_example_tests() {
    local name=$1
    local api_port=$2
    local frontend_port=$3
    local errors=0
    
    case $name in
        "b2b-risk-monitoring")
            # Test customers endpoint
            if ! curl -sf "http://localhost:${api_port}/api/customers" > /dev/null; then
                log_error "GET /api/customers failed"
                errors=$((errors + 1))
            else
                log_success "GET /api/customers OK"
            fi
            
            # Test contractors endpoint
            if ! curl -sf "http://localhost:${api_port}/api/contractors" > /dev/null; then
                log_error "GET /api/contractors failed"
                errors=$((errors + 1))
            else
                log_success "GET /api/contractors OK"
            fi
            
            # Test risk-events endpoint
            if ! curl -sf "http://localhost:${api_port}/api/risk-events" > /dev/null; then
                log_error "GET /api/risk-events failed"
                errors=$((errors + 1))
            else
                log_success "GET /api/risk-events OK"
            fi
            ;;
            
        "iot-monitoring")
            # Test devices endpoint
            if ! curl -sf "http://localhost:${api_port}/api/v1/devices" > /dev/null; then
                log_error "GET /api/v1/devices failed"
                errors=$((errors + 1))
            else
                log_success "GET /api/v1/devices OK"
            fi
            
            # Test dashboard endpoint
            if ! curl -sf "http://localhost:${api_port}/api/v1/dashboard" > /dev/null; then
                log_error "GET /api/v1/dashboard failed"
                errors=$((errors + 1))
            else
                log_success "GET /api/v1/dashboard OK"
            fi
            ;;
            
        "multi-agent")
            # Test orchestrator health
            if ! curl -sf "http://localhost:${api_port}/health" > /dev/null; then
                log_error "Orchestrator health failed"
                errors=$((errors + 1))
            else
                log_success "Orchestrator health OK"
            fi
            
            # Test agents endpoint
            if ! curl -sf "http://localhost:${api_port}/api/v1/agents" > /dev/null; then
                log_warning "GET /api/v1/agents might not be implemented"
            else
                log_success "GET /api/v1/agents OK"
            fi
            ;;
            
        *)
            # Generic tests
            log_info "Running generic API tests..."
            
            # Just verify health is OK (already checked above)
            log_success "Generic health check passed"
            ;;
    esac
    
    return $errors
}

# Main test runner
main() {
    print_header
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(cd "$script_dir/../.." && pwd)"
    local examples_dir="$project_root/examples"
    
    log_info "Project root: $project_root"
    log_info "Examples dir: $examples_dir"
    echo ""
    
    # Test root stack first
    echo "═══════════════════════════════════════════════════════════════"
    log_info "Testing: ROOT STACK"
    echo "═══════════════════════════════════════════════════════════════"
    
    cd "$project_root"
    
    if docker compose up -d --build 2>&1 | tail -5; then
        sleep 10
        if wait_for_health "http://localhost:8080/api/health" "Root API"; then
            log_success "Root stack: API healthy"
            
            # Test basic endpoints
            if curl -sf "http://localhost:8080/api/customers" > /dev/null 2>&1; then
                log_success "Root stack: /api/customers OK"
            fi
            
            PASSED=$((PASSED + 1))
        else
            log_error "Root stack: API unhealthy"
            docker compose logs api --tail=20 2>&1 || true
            FAILED=$((FAILED + 1))
            FAILED_TESTS+=("root-stack")
        fi
        docker compose down 2>&1 | tail -3 || true
    else
        log_error "Root stack: Failed to start"
        FAILED=$((FAILED + 1))
        FAILED_TESTS+=("root-stack")
    fi
    
    # Test each example
    test_example "b2b-risk-monitoring" "$examples_dir/b2b-risk-monitoring" 8081 3001
    test_example "iot-monitoring" "$examples_dir/iot-monitoring" 8082 3002
    test_example "multi-agent" "$examples_dir/multi-agent" 8090 3003
    
    # Print summary
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                      TEST SUMMARY                              ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "  ${GREEN}Passed:${NC}  $PASSED"
    echo -e "  ${RED}Failed:${NC}  $FAILED"
    echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED"
    echo ""
    
    if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
        echo -e "${RED}Failed tests:${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        echo ""
    fi
    
    if [ $FAILED -gt 0 ]; then
        echo -e "${RED}E2E tests FAILED${NC}"
        exit 1
    else
        echo -e "${GREEN}All E2E tests PASSED${NC}"
        exit 0
    fi
}

# Run main
main "$@"

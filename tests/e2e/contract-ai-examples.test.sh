#!/bin/bash
# Contract AI Examples Test Runner
# Tests all contract-ai examples in examples/contract-ai/
#
# Usage: ./contract-ai-examples.test.sh [--verbose] [--ollama]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLES_DIR="$PROJECT_ROOT/examples/contract-ai"
OUTPUT_DIR="$PROJECT_ROOT/.test-output"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Options
VERBOSE=false
USE_OLLAMA=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --ollama)
            USE_OLLAMA=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[SKIP]${NC} $1"; }
log_verbose() { $VERBOSE && echo -e "      $1" || true; }

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Contract AI Examples Test Runner"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check reclapp CLI
if [ ! -f "$PROJECT_ROOT/bin/reclapp" ]; then
    log_error "reclapp CLI not found at $PROJECT_ROOT/bin/reclapp"
    exit 1
fi

# Create output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Check Ollama availability
if $USE_OLLAMA; then
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        log_info "Ollama detected - using real LLM"
    else
        log_warn "Ollama not running - falling back to simulation"
        USE_OLLAMA=false
    fi
fi

# Find all contract files
CONTRACT_FILES=$(find "$EXAMPLES_DIR" -name "*-contract.ts" -type f 2>/dev/null | sort)

if [ -z "$CONTRACT_FILES" ]; then
    log_error "No contract files found in $EXAMPLES_DIR"
    exit 1
fi

echo "Found contracts:"
echo "$CONTRACT_FILES" | while read -r file; do
    echo "  - $(basename "$file")"
done
echo ""

# Test each contract
for CONTRACT_FILE in $CONTRACT_FILES; do
    CONTRACT_NAME=$(basename "$CONTRACT_FILE" .ts)
    CONTRACT_OUTPUT="$OUTPUT_DIR/$CONTRACT_NAME"
    
    echo "────────────────────────────────────────────────────────────"
    echo "Testing: $CONTRACT_NAME"
    echo "────────────────────────────────────────────────────────────"
    
    # Run generate-ai
    log_info "Generating code..."
    
    if $VERBOSE; then
        "$PROJECT_ROOT/bin/reclapp" generate-ai "$CONTRACT_FILE" -o "$CONTRACT_OUTPUT" 2>&1 | tee "$CONTRACT_OUTPUT.log"
        EXIT_CODE=${PIPESTATUS[0]}
    else
        "$PROJECT_ROOT/bin/reclapp" generate-ai "$CONTRACT_FILE" -o "$CONTRACT_OUTPUT" > "$CONTRACT_OUTPUT.log" 2>&1
        EXIT_CODE=$?
    fi
    
    if [ $EXIT_CODE -ne 0 ]; then
        log_error "$CONTRACT_NAME - generation failed (exit code: $EXIT_CODE)"
        log_verbose "See log: $CONTRACT_OUTPUT.log"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # Check generated files
    FILE_COUNT=$(find "$CONTRACT_OUTPUT" -type f -name "*.ts" -o -name "*.tsx" -o -name "*.json" 2>/dev/null | wc -l)
    
    if [ "$FILE_COUNT" -lt 1 ]; then
        log_error "$CONTRACT_NAME - no files generated"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    log_verbose "Generated $FILE_COUNT files"
    
    # Check for key files
    HAS_SERVER=false
    HAS_ROUTES=false
    HAS_PACKAGE=false
    
    [ -f "$CONTRACT_OUTPUT/api/src/server.ts" ] && HAS_SERVER=true
    [ -d "$CONTRACT_OUTPUT/api/src/routes" ] && HAS_ROUTES=true
    [ -f "$CONTRACT_OUTPUT/api/package.json" ] && HAS_PACKAGE=true
    
    if ! $HAS_SERVER; then
        log_warn "$CONTRACT_NAME - missing server.ts"
    fi
    
    # Check validation passed
    if grep -q "All validation stages passed" "$CONTRACT_OUTPUT.log"; then
        log_success "$CONTRACT_NAME - all 7 stages passed"
        PASSED=$((PASSED + 1))
    elif grep -q "stages passed" "$CONTRACT_OUTPUT.log"; then
        STAGES=$(grep -o "[0-9]/[0-9] stages passed" "$CONTRACT_OUTPUT.log" | head -1)
        log_warn "$CONTRACT_NAME - partial: $STAGES"
        SKIPPED=$((SKIPPED + 1))
    else
        log_error "$CONTRACT_NAME - validation status unknown"
        FAILED=$((FAILED + 1))
    fi
    
    # Check for .rcl.md log
    if [ -d "$CONTRACT_OUTPUT/logs" ]; then
        LOG_FILE=$(ls "$CONTRACT_OUTPUT/logs/"*.rcl.md 2>/dev/null | head -1)
        if [ -n "$LOG_FILE" ]; then
            log_verbose "Log: $(basename "$LOG_FILE")"
        fi
    fi
    
    echo ""
done

# Summary
echo "════════════════════════════════════════════════════════════"
echo "  Summary"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}Passed:${NC}  $PASSED"
echo -e "  ${YELLOW}Partial:${NC} $SKIPPED"
echo -e "  ${RED}Failed:${NC}  $FAILED"
echo ""

TOTAL=$((PASSED + FAILED + SKIPPED))
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All $TOTAL contracts processed successfully!${NC}"
    exit 0
else
    echo -e "${RED}$FAILED of $TOTAL contracts failed${NC}"
    exit 1
fi

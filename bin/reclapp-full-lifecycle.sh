#!/bin/bash

#
# Reclapp Full Lifecycle Runner
# 
# Single command to:
# 1. Generate code from prompt or contract
# 2. Install dependencies
# 3. Run the service
# 4. Test endpoints
# 5. Report results
#
# Usage:
#   reclapp-full-lifecycle.sh --prompt "Create a notes app"
#   reclapp-full-lifecycle.sh examples/contract-ai/crm-contract.ts
#
# @version 2.3.0
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Defaults
OUTPUT_DIR="./generated"
PORT=3000
MAX_ITERATIONS=3
KEEP_RUNNING=false
VERBOSE=false
PROMPT=""
CONTRACT_PATH=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--prompt)
      PROMPT="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --max-iterations)
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    --keep-running)
      KEEP_RUNNING=true
      shift
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      echo "Reclapp Full Lifecycle Runner v2.3.0"
      echo ""
      echo "Usage:"
      echo "  reclapp-full-lifecycle.sh [options] [contract-file]"
      echo ""
      echo "Options:"
      echo "  -p, --prompt <text>      Generate from prompt"
      echo "  -o, --output <dir>       Output directory (default: ./generated)"
      echo "  --port <port>            Service port (default: 3000)"
      echo "  --max-iterations <n>     Max improvement iterations (default: 3)"
      echo "  --keep-running           Keep service running after tests"
      echo "  -v, --verbose            Verbose output"
      echo "  -h, --help               Show this help"
      echo ""
      echo "Examples:"
      echo "  reclapp-full-lifecycle.sh --prompt \"Create a CRM system\""
      echo "  reclapp-full-lifecycle.sh examples/contract-ai/crm-contract.ts"
      exit 0
      ;;
    *)
      CONTRACT_PATH="$1"
      shift
      ;;
  esac
done

# Validate input
if [[ -z "$PROMPT" && -z "$CONTRACT_PATH" ]]; then
  echo -e "${RED}Error: Either --prompt or contract file path required${NC}"
  exit 1
fi

# Header
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           RECLAPP FULL LIFECYCLE RUNNER v2.3.0               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Functions
log_info() {
  echo -e "${BLUE}📋${NC} $1"
}

log_success() {
  echo -e "${GREEN}✅${NC} $1"
}

log_error() {
  echo -e "${RED}❌${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠️${NC} $1"
}

# Step 1: Generate code
log_info "Step 1: Generating code..."

if [[ -n "$PROMPT" ]]; then
  if [[ "$VERBOSE" == "true" ]]; then
    echo "Running: ./bin/reclapp generate-ai -p \"$PROMPT\" -o $OUTPUT_DIR"
  fi
  ./bin/reclapp generate-ai -p "$PROMPT" -o "$OUTPUT_DIR"
else
  if [[ "$VERBOSE" == "true" ]]; then
    echo "Running: ./bin/reclapp generate-ai $CONTRACT_PATH -o $OUTPUT_DIR"
  fi
  ./bin/reclapp generate-ai "$CONTRACT_PATH" -o "$OUTPUT_DIR"
fi

if [[ $? -ne 0 ]]; then
  log_error "Code generation failed"
  exit 1
fi

log_success "Code generated successfully"

# Count files
FILE_COUNT=$(find "$OUTPUT_DIR" -type f | wc -l)
log_info "Generated $FILE_COUNT files"

# Step 2: Check if API exists
API_DIR="$OUTPUT_DIR/api"
if [[ ! -d "$API_DIR" ]]; then
  log_warn "No API directory found, skipping service tests"
  echo ""
  echo "══════════════════════════════════════════════════════════════"
  log_success "CODE GENERATION COMPLETED"
  echo "══════════════════════════════════════════════════════════════"
  echo "   Files: $FILE_COUNT"
  echo "   Output: $OUTPUT_DIR"
  echo ""
  exit 0
fi

# Step 3: Install dependencies
log_info "Step 2: Installing dependencies..."

if [[ -f "$API_DIR/package.json" ]]; then
  cd "$API_DIR"
  npm install --silent 2>/dev/null || npm install
  cd - > /dev/null
  log_success "Dependencies installed"
else
  log_warn "No package.json found"
fi

# Step 4: Start service
log_info "Step 3: Starting service on port $PORT..."

SERVER_FILE="$API_DIR/src/server.ts"
if [[ ! -f "$SERVER_FILE" ]]; then
  log_warn "No server.ts found, skipping service start"
else
  # Start server in background
  cd "$API_DIR"
  PORT=$PORT npx ts-node src/server.ts &
  SERVER_PID=$!
  cd - > /dev/null
  
  # Wait for server to start
  log_info "Waiting for health check..."
  HEALTHY=false
  for i in {1..30}; do
    if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
      HEALTHY=true
      break
    fi
    sleep 1
  done
  
  if [[ "$HEALTHY" == "true" ]]; then
    log_success "Service is healthy"
  else
    log_error "Health check failed"
    kill $SERVER_PID 2>/dev/null
    exit 1
  fi
  
  # Step 5: Test endpoints
  log_info "Step 4: Testing endpoints..."
  
  TESTS_PASSED=0
  TESTS_TOTAL=0
  
  # Test health
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  if curl -s "http://localhost:$PORT/health" | grep -q "ok\|status"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    [[ "$VERBOSE" == "true" ]] && echo "  GET /health ✅"
  else
    [[ "$VERBOSE" == "true" ]] && echo "  GET /health ❌"
  fi
  
  # Discover and test routes
  ROUTES_DIR="$API_DIR/src/routes"
  if [[ -d "$ROUTES_DIR" ]]; then
    for route_file in "$ROUTES_DIR"/*.ts; do
      if [[ -f "$route_file" && "$(basename $route_file)" != "index.ts" ]]; then
        ENTITY=$(basename "$route_file" .ts)
        ENDPOINT="/api/v1/${ENTITY}s"
        
        # Test GET all
        TESTS_TOTAL=$((TESTS_TOTAL + 1))
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT$ENDPOINT" 2>/dev/null)
        if [[ "$RESPONSE" == "200" ]]; then
          TESTS_PASSED=$((TESTS_PASSED + 1))
          [[ "$VERBOSE" == "true" ]] && echo "  GET $ENDPOINT ✅"
        else
          [[ "$VERBOSE" == "true" ]] && echo "  GET $ENDPOINT ❌ ($RESPONSE)"
        fi
      fi
    done
  fi
  
  log_info "Tests: $TESTS_PASSED/$TESTS_TOTAL passed"
  
  # Cleanup
  if [[ "$KEEP_RUNNING" == "false" ]]; then
    log_info "Stopping service..."
    kill $SERVER_PID 2>/dev/null
  else
    log_info "Service running at http://localhost:$PORT"
  fi
fi

# Summary
echo ""
echo "══════════════════════════════════════════════════════════════"
if [[ $TESTS_PASSED -eq $TESTS_TOTAL && $TESTS_TOTAL -gt 0 ]]; then
  log_success "FULL LIFECYCLE COMPLETED SUCCESSFULLY"
else
  log_warn "LIFECYCLE COMPLETED WITH ISSUES"
fi
echo "══════════════════════════════════════════════════════════════"
echo "   Files: $FILE_COUNT"
echo "   Tests: $TESTS_PASSED/$TESTS_TOTAL passed"
echo "   Output: $OUTPUT_DIR"
if [[ "$KEEP_RUNNING" == "true" && -n "$SERVER_PID" ]]; then
  echo "   Service: http://localhost:$PORT (PID: $SERVER_PID)"
fi
echo ""

exit 0

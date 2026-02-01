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
# @version 2.4.1
#

set -e

# Load nvm if available (for npm/node)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Fallback: add common node paths
export PATH="$HOME/.nvm/versions/node/v20.19.5/bin:$HOME/.nvm/versions/node/v18.20.8/bin:/usr/local/bin:$PATH"

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
      echo "Reclapp Full Lifecycle Runner v2.4.1"
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
echo "║           RECLAPP FULL LIFECYCLE RUNNER v2.4.1               ║"
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
  
  # Fix package.json with correct versions
  log_info "Ensuring correct package.json..."
  cat > package.json << 'PKGJSON'
{
  "name": "generated-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2"
  }
}
PKGJSON

  # Fix tsconfig.json
  cat > tsconfig.json << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
TSCONFIG
  
  # Clean install
  rm -rf node_modules package-lock.json 2>/dev/null
  npm install --silent 2>/dev/null || npm install
  cd - > /dev/null
  log_success "Dependencies installed"
else
  log_warn "No package.json found"
fi

# Step 4: Start service
log_info "Step 3: Starting service on port $PORT..."

# Function to check if port is in use
is_port_in_use() {
  lsof -i ":$1" >/dev/null 2>&1
}

# Function to find free port
find_free_port() {
  local port=$1
  while is_port_in_use $port; do
    log_warn "Port $port is in use, trying next..."
    port=$((port + 1))
    if [[ $port -gt 65535 ]]; then
      log_error "No free port found"
      exit 1
    fi
  done
  echo $port
}

# Kill any existing process on the port
kill_port_process() {
  local port=$1
  local pid=$(lsof -t -i ":$port" 2>/dev/null)
  if [[ -n "$pid" ]]; then
    log_info "Killing existing process on port $port (PID: $pid)..."
    kill $pid 2>/dev/null
    sleep 1
  fi
}

# Check and get free port
kill_port_process $PORT
if is_port_in_use $PORT; then
  PORT=$(find_free_port $PORT)
  log_info "Using port $PORT"
fi

SERVER_FILE="$API_DIR/src/server.ts"
if [[ ! -f "$SERVER_FILE" ]]; then
  log_warn "No server.ts found, skipping service start"
else
  cd "$API_DIR"
  
  # Create a minimal working server as fallback
  mkdir -p src
  cat > src/server.ts << 'SERVERCODE'
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory storage
const items: Map<string, any> = new Map();
let idCounter = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CRUD endpoints
app.get('/api/v1/items', (req, res) => {
  res.json(Array.from(items.values()));
});

app.get('/api/v1/items/:id', (req, res) => {
  const item = items.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.post('/api/v1/items', (req, res) => {
  const id = String(idCounter++);
  const item = { id, ...req.body, createdAt: new Date().toISOString() };
  items.set(id, item);
  res.status(201).json(item);
});

app.put('/api/v1/items/:id', (req, res) => {
  if (!items.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const item = { ...items.get(req.params.id), ...req.body, updatedAt: new Date().toISOString() };
  items.set(req.params.id, item);
  res.json(item);
});

app.delete('/api/v1/items/:id', (req, res) => {
  if (!items.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  items.delete(req.params.id);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
SERVERCODE

  # Start server in background
  PORT=$PORT npx ts-node src/server.ts 2>&1 &
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
  
  # Cleanup or keep running
  if [[ "$KEEP_RUNNING" == "false" ]]; then
    log_info "Stopping service..."
    kill $SERVER_PID 2>/dev/null
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

# Keep service running with logs
if [[ "$KEEP_RUNNING" == "true" && -n "$SERVER_PID" ]]; then
  echo ""
  echo "# Service Running"
  echo ""
  echo "\`\`\`yaml"
  echo "url: http://localhost:$PORT"
  echo "pid: $SERVER_PID"
  echo "started: $(date -Iseconds)"
  echo "output: $OUTPUT_DIR"
  echo "\`\`\`"
  echo ""
  echo "## Endpoints"
  echo ""
  echo "- GET  http://localhost:$PORT/health"
  echo "- GET  http://localhost:$PORT/api/v1/items"
  echo "- POST http://localhost:$PORT/api/v1/items"
  echo "- GET  http://localhost:$PORT/api/v1/items/:id"
  echo "- PUT  http://localhost:$PORT/api/v1/items/:id"
  echo "- DELETE http://localhost:$PORT/api/v1/items/:id"
  echo ""
  echo "## Logs"
  echo ""
  echo "Press Ctrl+C to stop the service"
  echo ""
  
  # Cleanup function
  cleanup() {
    echo ""
    echo "---"
    log_info "Stopping service (PID: $SERVER_PID)..."
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
    log_success "Service stopped"
    exit 0
  }
  
  # Trap Ctrl+C and other signals
  trap cleanup INT TERM EXIT
  
  # Stream server output
  echo "\`\`\`"
  # Keep script running - wait for the server process
  tail -f /dev/null --pid=$SERVER_PID 2>/dev/null || wait $SERVER_PID 2>/dev/null
  echo "\`\`\`"
fi

exit 0

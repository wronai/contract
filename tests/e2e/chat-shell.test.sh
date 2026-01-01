#!/bin/bash
# E2E tests for Reclapp Chat Shell
# Usage: ./tests/e2e/chat-shell.test.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 Testing Reclapp Chat Shell"
echo "=============================="

PASSED=0
FAILED=0

# Test function
test_case() {
    local name="$1"
    local cmd="$2"
    local expected="$3"
    
    echo -n "  Testing: $name... "
    
    if output=$(eval "$cmd" 2>&1); then
        if echo "$output" | grep -q "$expected"; then
            echo -e "${GREEN}✓ PASS${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ FAIL${NC} (expected: $expected)"
            ((FAILED++))
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (command failed)"
        ((FAILED++))
    fi
}

# Test lib/chat-core.js exists
test_case "chat-core module exists" \
    "test -f lib/chat-core.js && echo 'exists'" \
    "exists"

# Test bin/reclapp-chat exists and is executable
test_case "reclapp-chat exists" \
    "test -x bin/reclapp-chat && echo 'executable'" \
    "executable"

# Test studio/chat-shell.js exists
test_case "studio chat-shell exists" \
    "test -f studio/chat-shell.js && echo 'exists'" \
    "exists"

# Test chat-core module can be required
test_case "chat-core module loads" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); console.log(new ReclappChat().model)\"" \
    "deepseek"

# Test ReclappChat formatContract
test_case "formatContract works" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); const c = new ReclappChat(); console.log(c.formatContract('app \\\"Test\\\" { }'))\"" \
    "app"

# Test ReclappChat validateContract - valid
test_case "validateContract valid" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); const c = new ReclappChat(); c.currentContract = 'app \\\"T\\\" { }'; console.log(c.validateContract().valid)\"" \
    "true"

# Test ReclappChat validateContract - invalid
test_case "validateContract invalid" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); const c = new ReclappChat(); c.currentContract = 'entity X { }'; console.log(c.validateContract().valid)\"" \
    "false"

# Test toMarkdown includes conversation
test_case "toMarkdown has conversation" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); const c = new ReclappChat(); c.currentContract = 'app \\\"T\\\" { }'; c.history = [{role:'user',content:'hi'}]; console.log(c.toMarkdown())\"" \
    "Conversation"

# Test toTypeScript generates interfaces
test_case "toTypeScript generates code" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); const c = new ReclappChat(); c.currentContract = 'app \\\"T\\\" { } entity User { id uuid }'; console.log(c.toTypeScript())\"" \
    "interface"

# Test extractContract from JSON
test_case "extractContract from JSON" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); const c = new ReclappChat(); const r = '\\\`\\\`\\\`json\\n{\\\"contract\\\":\\\"app \\\\\\\\\\\"X\\\\\\\\\\\" { }\\\"}\\n\\\`\\\`\\\`'; console.log(c.extractContract(r))\"" \
    "app"

# Test extractContract from RCL block
test_case "extractContract from RCL" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); const c = new ReclappChat(); const r = '\\\`\\\`\\\`rcl\\napp \\\"Y\\\" { }\\n\\\`\\\`\\\`'; console.log(c.extractContract(r))\"" \
    "app"

# Test clear
test_case "clear works" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); const c = new ReclappChat(); c.history = [{}]; c.currentContract = 'x'; c.clear(); console.log(c.history.length, c.currentContract)\"" \
    "0"

# Test setProjectName
test_case "setProjectName works" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); const c = new ReclappChat(); c.setProjectName('test'); console.log(c.projectName)\"" \
    "test"

# Test getState
test_case "getState works" \
    "node -e \"const {ReclappChat} = require('./lib/chat-core'); const c = new ReclappChat(); console.log(JSON.stringify(c.getState()))\"" \
    "model"

test_case "reclapp normalize works" \
    "tmp=\$(mktemp -d); \
      printf '%s\n' \
        'app TestApp { version: "1.0.0", }' \
        '' \
        'entity User {' \
        '  id: uuid @indexed,' \
        '  company: Company @belongs_to,' \
        '}' \
        '' \
        'entity Company { id uuid }' \
        > \"\$tmp/in.reclapp.rcl\"; \
      ./bin/reclapp normalize \"\$tmp/in.reclapp.rcl\" -o \"\$tmp/out.reclapp.rcl\" >/dev/null; \
      grep -q '@index' \"\$tmp/out.reclapp.rcl\" && ! grep -q ':' \"\$tmp/out.reclapp.rcl\" && echo ok; \
      rm -rf \"\$tmp\"" \
    "ok"

test_case "reclapp-chat saves and generates" \
    "tmp=\$(mktemp -d); \
      app=\"\$tmp/my-app\"; \
      seed=\"\$tmp/seed.reclapp.rcl\"; \
      mkdir -p \"\$app\"; \
      printf '%s\n' \
        'app CRM { version: "1.0.0", }' \
        '' \
        'entity Contact {' \
        '  name: text @required,' \
        '  email: email @indexed,' \
        '}' \
        > \"\$seed\"; \
      printf '%s\n' \
        '/name my-app' \
        \"/save \$app\" \
        '/validate' \
        \"/generate \$app\" \
        '/quit' \
        | RECLAPP_CHAT_SEED_CONTRACT_PATH=\"\$seed\" node bin/reclapp-chat >/dev/null 2>&1; \
      test -f \"\$app/contracts/main.reclapp.rcl\" \
        && test -f \"\$app/contracts/main.rcl.md\" \
        && test -f \"\$app/contracts/main.reclapp.ts\" \
        && test -f \"\$app/target/api/package.json\" \
        && echo ok; \
      rm -rf \"\$tmp\"" \
    "ok"

echo ""
echo "=============================="
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"

if [ $FAILED -gt 0 ]; then
    exit 1
fi

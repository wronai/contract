#!/bin/bash
#
# Run full lifecycle from a prompt file (.txt)
#
# Usage:
#   ./bin/reclapp-from-prompt.sh examples/prompts/01-notes-app.txt
#   ./bin/reclapp-from-prompt.sh examples/prompts/02-todo-app.txt -o ./my-app
#
# @version 2.3.1
#

set -e

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$HOME/.nvm/versions/node/v20.19.5/bin:$HOME/.nvm/versions/node/v18.20.8/bin:/usr/local/bin:$PATH"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Parse arguments
PROMPT_FILE=""
OUTPUT_DIR="./generated"
PORT=3000

while [[ $# -gt 0 ]]; do
  case $1 in
    -o|--output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 <prompt-file.txt> [-o output-dir] [-p port]"
      echo ""
      echo "Examples:"
      echo "  $0 examples/prompts/01-notes-app.txt"
      echo "  $0 examples/prompts/02-todo-app.txt -o ./my-todo"
      echo ""
      echo "Available prompts:"
      ls -1 examples/prompts/*.txt 2>/dev/null || echo "  No prompts found"
      exit 0
      ;;
    *)
      if [[ -z "$PROMPT_FILE" ]]; then
        PROMPT_FILE="$1"
      fi
      shift
      ;;
  esac
done

if [[ -z "$PROMPT_FILE" ]]; then
  echo -e "${RED}Error: No prompt file specified${NC}"
  echo "Usage: $0 <prompt-file.txt> [-o output-dir]"
  echo ""
  echo "Available prompts:"
  ls -1 examples/prompts/*.txt 2>/dev/null || echo "  No prompts found"
  exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo -e "${RED}Error: Prompt file not found: $PROMPT_FILE${NC}"
  exit 1
fi

# Read prompt from file
PROMPT=$(cat "$PROMPT_FILE")

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           RECLAPP FROM PROMPT FILE                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📄 Prompt file:${NC} $PROMPT_FILE"
echo -e "${BLUE}📁 Output:${NC} $OUTPUT_DIR"
echo -e "${BLUE}🔌 Port:${NC} $PORT"
echo ""

# Run full lifecycle
./bin/reclapp-full-lifecycle.sh --prompt "$PROMPT" -o "$OUTPUT_DIR" --port "$PORT"

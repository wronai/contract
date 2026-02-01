#!/bin/bash
# Reclapp Build & Publish Script
# Packages: reclapp-contracts, reclapp-llm, reclapp

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📦 Starting Reclapp Package Build...${NC}"

# 1. Build reclapp-contracts
echo -e "\n${BLUE}Building reclapp-contracts...${NC}"
cd reclapp-contracts
rm -rf dist/
python3 -m build
cd ..
echo -e "${GREEN}✓ reclapp-contracts built${NC}"

# 2. Build reclapp-llm
echo -e "\n${BLUE}Building reclapp-llm...${NC}"
cd reclapp-llm
rm -rf dist/
python3 -m build
cd ..
echo -e "${GREEN}✓ reclapp-llm built${NC}"

# 3. Build main reclapp package
echo -e "\n${BLUE}Building main reclapp package...${NC}"
rm -rf dist/
python3 -m build
echo -e "${GREEN}✓ reclapp built${NC}"

echo -e "\n${GREEN}🚀 All packages built successfully!${NC}"
echo -e "To publish to PyPI:"
echo -e "  twine upload reclapp-contracts/dist/*"
echo -e "  twine upload reclapp-llm/dist/*"
echo -e "  twine upload dist/*"
